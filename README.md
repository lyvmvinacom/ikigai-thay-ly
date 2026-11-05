# IKIGAI WORLD — Anime Edition

Bản khởi tạo dự án mới, dùng HTML/CSS/JavaScript thuần để dễ triển khai trên GitHub Pages.

## Chạy thử
Mở `index.html` bằng trình duyệt hoặc bật GitHub Pages từ nhánh `main`, thư mục `/root`.

## Kết nối multiplayer bằng Supabase
1. Tạo project tại https://supabase.com/
2. Vào Project Settings → API, lấy Project URL và anon/public key.
3. Mở `app.js`, thay:
   - `YOUR_SUPABASE_PROJECT_URL`
   - `YOUR_SUPABASE_ANON_KEY`
4. GitHub Pages chỉ host frontend. Supabase Realtime Presence giúp người chơi trong cùng phòng nhìn thấy nhau.
5. Bản hiện tại là nền tảng Presence; cần bổ sung bảng dữ liệu, xác thực và chính sách RLS trước khi dùng chính thức.

## Trạng thái
- Có: giao diện anime/chibi dạng vector placeholder, lớp học, di chuyển bàn phím/joystick, tương tác NPC, câu hỏi mẫu.
- Khung multiplayer: Supabase Realtime Presence theo mã phòng.
- Chưa có: sprite anime vẽ hoàn chỉnh, tài khoản học viên, bảng xếp hạng bền vững trong database, quản trị giáo viên, đồng bộ XP đáng tin cậy.
- Không đưa service_role key vào frontend. Chỉ dùng anon/publishable key với RLS phù hợp.


## Cấu hình đã điền cho dự án Supabase của IKIGAI
- Project URL đã được cấu hình trong `app.js`.
- Publishable key đã được cấu hình trong `app.js`.
- Không đưa Secret key hoặc service_role key vào website.
- Game dùng Anonymous Authentication và Realtime Presence.
- Tài khoản khách được lưu trên thiết bị/trình duyệt; xóa dữ liệu trình duyệt có thể làm mất phiên khách.
- Đây là bản nền tảng thử nghiệm. Bảng xếp hạng lưu điểm lâu dài và quyền giáo viên cần được triển khai thêm trước khi dùng chính thức.
