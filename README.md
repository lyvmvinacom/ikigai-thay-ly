# IKIGAI WORLD – Anime Teacher Mode v1.1
## Cập nhật
- Nhân vật trong lớp được tạo động từ Supabase Presence, tên hiển thị theo tài khoản đang online.
- Di chuyển nhân vật bằng WASD/phím mũi tên trên máy tính hoặc cụm phím mũi tên trên màn hình.
- Tọa độ được chia sẻ qua Realtime Presence để các thiết bị nhìn thấy chuyển động của nhau.
- Nút BXH mở bảng xếp hạng theo XP của những người đang trực tuyến trong phòng.
- Đã bỏ dòng giải thích hình phạt khỏi phản hồi sai.
## Cài đặt
Thay file `index.html` trên GitHub Pages bằng file trong ZIP này, commit lên nhánh `main`, sau đó tải lại website bằng Ctrl+F5.
Không cần chạy SQL mới. Giữ nguyên Supabase URL và publishable key đang dùng.
## Lưu ý
Bảng xếp hạng ở bản này chỉ tổng hợp XP trong Presence của những người đang trực tuyến; chưa phải bảng điểm lưu bền vững. Muốn lưu điểm dài hạn cần bổ sung bảng điểm và chính sách RLS. Chức năng chuyển động yêu cầu Supabase Realtime hoạt động và các thiết bị cùng vào phòng N5-01.
