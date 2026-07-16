# ⚖️ Quản Lý Tiền Phạt Nhóm

Ứng dụng web quản lý tiền phạt cho nhóm/team. Giao diện HTML/CSS/JS thuần + một máy chủ Node nhỏ (Express) lưu dữ liệu vào **SQLite** (file `data.db`) trên máy — dữ liệu bền, không mất khi xóa cache trình duyệt.

## ✨ Tính năng

- **📊 Tổng quan** — thống kê nhanh: tổng tiền phạt, đã thu, chưa thu, số thành viên, thẻ tổng hợp tiền + tỷ lệ đã thu, danh sách vi phạm gần đây.
- **💸 Danh sách phạt** — thêm / xoá vi phạm, đánh dấu đã đóng / chưa đóng, lọc theo thành viên / trạng thái / tháng.
- **👥 Thành viên** — thêm / xoá thành viên, xem tổng phạt & còn nợ theo từng người.
- **🛒 Phân chi tiền** — ghi nhận các khoản chi tiêu của quỹ theo danh mục.
- **📈 Thống kê thu chi** — 5 chỉ số, biểu đồ thu–chi theo tháng, chi theo danh mục, lọc theo tháng.
- **📄 Xuất báo cáo** — tạo báo cáo kèm mã QR chuyển khoản (VietQR), tải về dạng ảnh PNG.
- **⚙️ Cài đặt** — tên nhóm, tài khoản ngân hàng nhận tiền, nội dung chuyển khoản.
- **🗄️ Quản lý dữ liệu** — sao lưu (.json), khôi phục từ file, nhập từ localStorage cũ, xoá toàn bộ.

## 🚀 Cách chạy

Yêu cầu: [Node.js](https://nodejs.org/) (khuyến nghị v18+).

```bash
npm install      # cài dependencies (chỉ lần đầu)
npm start        # hoặc: node server.js
```

Sau đó mở trình duyệt tại **http://localhost:3000**.

> Lần chạy đầu tiên, `data.db` được tạo tự động và nạp sẵn dữ liệu demo (11 thành viên, 9 khoản phạt mẫu).

## 🗂️ Cấu trúc

| File | Vai trò |
|------|---------|
| `index.html` | Giao diện (cấu trúc trang, modal) |
| `styles.css` | Toàn bộ CSS |
| `app.js` | Logic phía client — gọi REST API bằng `fetch` |
| `server.js` | Web server + REST API (Express) |
| `db.js` | Khởi tạo SQLite, tạo bảng, seed dữ liệu |
| `data.db` | **File database** (không commit lên git) |

## 🔌 REST API

| Method | Endpoint | Mô tả |
|--------|----------|-------|
| GET/POST | `/api/members`, `/api/fines`, `/api/spendings` | Danh sách / thêm |
| PATCH | `/api/fines/:id` | Đổi trạng thái phạt |
| DELETE | `/api/members/:id`, `/api/fines/:id`, `/api/spendings/:id` | Xoá |
| GET/PUT | `/api/settings` | Cài đặt nhóm & tài khoản |
| GET | `/api/backup` | Xuất toàn bộ dữ liệu (JSON) |
| POST | `/api/restore` | Ghi đè toàn bộ dữ liệu từ JSON |

## 💾 Sao lưu dữ liệu

Toàn bộ dữ liệu nằm trong file `data.db`. Muốn sao lưu: **copy file `data.db`**, hoặc dùng nút *Sao lưu (.json)* trong Cài đặt → Quản lý dữ liệu.

## 🛠️ Công nghệ

- Frontend: HTML + CSS + JavaScript thuần (không framework).
- Backend: Node.js + Express + better-sqlite3.
- [qrcodejs](https://github.com/davidshimjs/qrcodejs), [html2canvas](https://html2canvas.hertzen.com/), [VietQR](https://vietqr.io/), Google Fonts (Be Vietnam Pro, Space Mono).

## 📄 Giấy phép

MIT
