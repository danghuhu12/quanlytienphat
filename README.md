# ⚖️ Quản Lý Tiền Phạt Nhóm

Ứng dụng web quản lý tiền phạt cho nhóm/team — chạy hoàn toàn trên trình duyệt, không cần backend, không cần cài đặt. Dữ liệu lưu bằng `localStorage`.

## ✨ Tính năng

- **📊 Tổng quan** — thống kê nhanh: tổng tiền phạt, đã thu, chưa thu, số thành viên, thẻ tổng hợp tiền + tỷ lệ đã thu, danh sách vi phạm gần đây.
- **💸 Danh sách phạt** — thêm / xoá vi phạm, đánh dấu đã đóng / chưa đóng, lọc theo trạng thái.
- **👥 Thành viên** — thêm / xoá thành viên, xem tổng phạt & còn nợ theo từng người.
- **🛒 Phân chi tiền** — ghi nhận các khoản chi tiêu của quỹ theo danh mục.
- **📈 Thống kê thu chi** — 5 chỉ số (Tổng số tiền, Đã đóng, Chưa đóng, Đã chi, Còn lại), biểu đồ thu–chi theo tháng, chi theo danh mục, lọc theo tháng.
- **📄 Xuất báo cáo** — tạo báo cáo kèm mã QR chuyển khoản (VietQR), tải về dạng ảnh PNG.
- **⚙️ Cài đặt** — tên nhóm, tài khoản ngân hàng nhận tiền, nội dung chuyển khoản.
- **🗄️ Quản lý dữ liệu** — sao lưu (.json), khôi phục từ file, xoá toàn bộ dữ liệu.

## 🚀 Cách dùng

Chỉ cần mở `index.html` bằng trình duyệt là chạy được.

### Chạy trên GitHub Pages (miễn phí)

1. Vào repo trên GitHub → **Settings** → **Pages**.
2. Mục **Source** chọn nhánh `main`, thư mục `/ (root)` → **Save**.
3. Sau ~1 phút, truy cập: `https://<tên-tài-khoản>.github.io/quanlytienphat/`

## 🛠️ Công nghệ

- HTML + CSS + JavaScript thuần (không framework).
- [qrcodejs](https://github.com/davidshimjs/qrcodejs) — tạo QR dự phòng.
- [html2canvas](https://html2canvas.hertzen.com/) — xuất báo cáo ra ảnh.
- [VietQR](https://vietqr.io/) — QR chuyển khoản ngân hàng.
- Google Fonts: Be Vietnam Pro, Space Mono.

## 📌 Lưu ý

Dữ liệu lưu trên trình duyệt (localStorage). Xoá cache trình duyệt hoặc đổi thiết bị sẽ mất dữ liệu — hãy **Sao lưu** định kỳ trong mục Cài đặt → Quản lý dữ liệu.

## 📄 Giấy phép

MIT
