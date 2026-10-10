/**
 * Traffic Theory – API bảng xếp hạng
 * Dán toàn bộ file này vào Extensions > Apps Script của Google Sheet bảng xếp hạng,
 * rồi Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 *
 * GET  ?limit=20&period=all|week|day&device=<mã máy>   -> top người chơi + hạng của máy này
 * POST {version, name, time, trips, pop, toll, reason, device}  -> lưu ván, trả về hạng
 */
const SHEET_NAME = 'Điểm';
const MAX_NAME = 20;          // độ dài tên tối đa
const MIN_GAP_SEC = 20;       // mỗi máy chỉ gửi 1 ván mỗi 20 giây
const MAX_TIME_SEC = 3 * 24 * 3600;
const REASONS = ['overload', 'bankrupt', 'quit'];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const limit = clamp_(parseInt(p.limit || '20', 10) || 20, 1, 100);
  const period = ['all', 'week', 'day'].indexOf(p.period) >= 0 ? p.period : 'all';
  const ranked = ranked_(period);
  const top = ranked.slice(0, limit).map(publicRow_);
  let me = null;
  if (p.device) {
    const i = ranked.findIndex(r => r.device === String(p.device));
    if (i >= 0) me = Object.assign(publicRow_(ranked[i], i), { rank: i + 1 });
  }
  return json_({ ok: true, period, total: ranked.length, top, me });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const device = String(d.device || '').slice(0, 40);
    if (!device) return json_({ ok: false, error: 'missing device' });

    const cache = CacheService.getScriptCache();
    if (cache.get('gap_' + device)) return json_({ ok: false, error: 'too fast' });

    const name = cleanName_(d.name);
    const time = clamp_(Math.floor(Number(d.time) || 0), 0, MAX_TIME_SEC);
    const trips = clamp_(Math.floor(Number(d.trips) || 0), 0, 1e7);
    const pop = clamp_(Math.floor(Number(d.pop) || 0), 0, 1e8);
    const toll = clamp_(Math.floor(Number(d.toll) || 0), 0, 1e9);
    const reason = REASONS.indexOf(d.reason) >= 0 ? d.reason : 'quit';
    const version = String(d.version || 'V1').replace(/[^\w.\-]/g, '').slice(0, 10);
    if (time < 30) return json_({ ok: false, error: 'game too short' });

    // Điểm luôn được tính lại trên server từ các chỉ số, không tin số điểm máy gửi lên
    const score = calcScore_(time, trips, pop, toll);

    const sh = sheet_();
    sh.appendRow([new Date(), name, score, time, trips, pop, toll, reason, device, version]);
    cache.put('gap_' + device, '1', MIN_GAP_SEC);

    const ranked = ranked_('all');
    const i = ranked.findIndex(r => r.device === device);
    return json_({ ok: true, score, rank: i + 1, total: ranked.length, best: i >= 0 ? ranked[i].score : score });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Công thức điểm, phải giống hàm calcScore trong game */
function calcScore_(time, trips, pop, toll) {
  return Math.round(trips * 10 + time * 2 + pop * 0.5 + toll * 0.05);
}

/** Điểm cao nhất của mỗi máy, xếp giảm dần */
function ranked_(period) {
  const sh = sheet_();
  const n = sh.getLastRow();
  if (n < 2) return [];
  const now = Date.now();
  const cut = period === 'week' ? now - 7 * 864e5 : period === 'day' ? now - 864e5 : 0;
  const best = {};
  sh.getRange(2, 1, n - 1, 9).getValues().forEach(v => {
    const t = new Date(v[0]).getTime();
    if (!t || t < cut) return;
    const r = { t, name: String(v[1]), score: Number(v[2]) || 0, time: Number(v[3]) || 0, trips: Number(v[4]) || 0,
      pop: Number(v[5]) || 0, toll: Number(v[6]) || 0, device: String(v[8] || v[1]) };
    const k = r.device;
    if (!best[k] || r.score > best[k].score) best[k] = r;
    best[k].name = r.t >= (best[k].lastT || 0) ? r.name : best[k].name; // dùng tên mới nhất của máy
    best[k].lastT = Math.max(best[k].lastT || 0, r.t);
  });
  return Object.keys(best).map(k => best[k]).sort((a, b) => b.score - a.score || a.t - b.t);
}

function publicRow_(r, i) {
  return { rank: i + 1, name: r.name, score: r.score, time: r.time, trips: r.trips, pop: r.pop, date: new Date(r.t).toISOString() };
}

function cleanName_(s) {
  let n = String(s || '').replace(/[\u0000-\u001f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME);
  if (!n) n = 'Người chơi';
  if (/^[=+\-@]/.test(n)) n = "'" + n; // chặn chèn công thức vào Sheet
  return n;
}

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
}
function clamp_(x, a, b) { return Math.max(a, Math.min(b, x)); }
function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

/** Chạy hàm này một lần trong editor để kiểm tra quyền và ghi thử một dòng */
function testInsert() {
  const res = doPost({ postData: { contents: JSON.stringify({ name: 'Thử nghiệm', time: 300, trips: 50, pop: 800, toll: 0, reason: 'quit', device: 'test-' + Date.now(), version: 'V2' }) } });
  Logger.log(res.getContent());
}
