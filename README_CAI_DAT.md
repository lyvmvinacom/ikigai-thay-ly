# IKIGAI WORLD – Anime Edition + Teacher Mode

## 1. Cập nhật website GitHub Pages
1. Tải và giải nén ZIP này.
2. Mở repo: https://github.com/lyvmvinacom/ikigai-thay-ly
3. Thay file `index.html` cũ bằng `index.html` trong ZIP.
4. Commit vào nhánh `main`.
5. Chờ GitHub Pages chạy xong, mở https://lyvmvinacom.github.io/ikigai-thay-ly/ và nhấn `Ctrl + F5`.

Bản này là ứng dụng một file HTML, không cần cài thêm thư viện vào repo. Kết nối Supabase dùng publishable key ở phía trình duyệt; tuyệt đối không đưa `service_role` hoặc mật khẩu cơ sở dữ liệu vào website.

## 2. Tạo tài khoản giáo viên
1. Vào Supabase Dashboard → Authentication → Users → Add user.
2. Tạo tài khoản bằng email của Thầy Ly và mật khẩu riêng. Không gửi mật khẩu cho người khác.
3. Sau khi tạo, mở SQL Editor và chạy câu lệnh dưới đây, thay email mẫu bằng đúng email vừa tạo:

```sql
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'teacher')
where email = 'EMAIL_GIAO_VIEN_CUA_THAY';
```

4. Đăng xuất tài khoản đang dùng trên website (nếu có), tải lại trang, chọn **Đăng nhập Giáo viên**, nhập email và mật khẩu vừa tạo.
5. Nếu thấy thông báo chưa được cấp quyền, kiểm tra email trong câu SQL có khớp tuyệt đối với email tài khoản Supabase không.

Học viên vẫn chỉ nhập tên và vào lớp bằng Supabase Anonymous Auth. Supabase → Authentication → Sign In / Providers → Anonymous Sign-Ins phải được bật.

## 3. Những gì có trong bản nâng cấp
- Giao diện lớp học phong cách Anime: cửa sổ, hoa anh đào, bảng lớp, nhân vật chibi và bảng chat.
- Bong bóng thoại bật lên phía trên nhân vật khi có tin nhắn.
- Chat phòng N5-01 qua Supabase Realtime Broadcast; thành viên và số người hiện diện qua Presence.
- Đăng nhập học viên bằng tên; đăng nhập giáo viên bằng email/mật khẩu và kiểm tra `app_metadata.role = teacher`.
- Bảng điều khiển Giáo viên: gửi thông báo, giao nhiệm vụ, khen thưởng, mở quiz.
- Quiz N5 mẫu: từ vựng, ngữ pháp, Kanji, hội thoại; đúng cộng XP/xu.
- Sai câu đầu: “Phạt đẩy tạ 10 lần”; từ câu sai thứ hai trở đi: “Phạt chạy 5 vòng bờ hồ”. Đây chỉ là hình phạt vui trong game, không áp dụng ngoài đời.
- Giao diện responsive cho điện thoại và máy tính.

## 4. Lưu ý kỹ thuật quan trọng
Đây là bản MVP để kiểm tra trải nghiệm và tương tác. Điểm XP/xu hiện lưu trên thiết bị; chat dùng Broadcast nên không lưu lịch sử lâu dài. Quyền giáo viên được kiểm tra ở giao diện dựa trên `app_metadata`; để triển khai cho lớp học chính thức cần bổ sung Realtime Private Channels + RLS hoặc Edge Function để xác thực quyền giáo viên ở máy chủ, và chuyển điểm/tiến độ sang database có RLS. Không chia sẻ mật khẩu giáo viên.
