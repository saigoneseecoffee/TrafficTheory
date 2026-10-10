# Traffic Theory

Game xây dựng mạng lưới giao thông cho thành phố: đường phố, cao tốc, lối ra vào, đèn tín hiệu, xe buýt và trạm BOT. Nối khu dân cư tới các công trình, giữ cho xe đi lại thông suốt khi thành phố lớn dần.

Chơi ngay: `https://saigoneseecoffee.github.io/TrafficTheory/` (sau khi bật GitHub Pages).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Bản mới nhất của game (hiện là V2) |
| `versions/v1.html`, `versions/v2.html` | Bản lưu của từng phiên bản |
| `apps-script/Code.gs` | API bảng xếp hạng chạy trên Google Apps Script |
| `CHANGELOG.md` | Thay đổi qua từng phiên bản |

Toàn bộ game nằm trong một file HTML, không cần build hay cài đặt.

## Bật GitHub Pages

Settings → Pages → Source: **Deploy from a branch** → Branch: `main`, thư mục `/ (root)` → Save. Sau khoảng một phút game chạy tại địa chỉ ở trên.

## Bảng xếp hạng online

1. Mở Google Sheet bảng xếp hạng → Tiện ích mở rộng → Apps Script, dán nội dung `apps-script/Code.gs`.
2. Chạy hàm `testInsert` một lần để cấp quyền, rồi xoá dòng thử trong tab Điểm.
3. Triển khai → Tùy chọn triển khai mới → Ứng dụng web. Thực thi với tư cách: Tôi. Ai có quyền truy cập: Bất kỳ ai.
4. Dán URL `.../exec` vào dòng `const LB_URL='';` trong `index.html` và commit.

Khi sửa `Code.gs`, dùng Triển khai → Quản lý bản triển khai → Sửa → Phiên bản mới để giữ nguyên URL.

## Ra phiên bản mới

1. Sửa `GAME_VERSION` và thêm mục vào `CHANGELOG` ở đầu phần script trong `index.html`.
2. Copy `index.html` thành `versions/vN.html`.
3. Ghi thay đổi vào `CHANGELOG.md`, commit với tiêu đề `Release vN`, tạo tag `vN`.
