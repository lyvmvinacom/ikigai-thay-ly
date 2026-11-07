# IKIGAI WORLD 9.0 — Art & Runtime Integration Repair

Bản 9.0 tích hợp lại 7 layer bản đồ 1600×1000, 7 công trình PNG riêng, 7 ảnh nội thất phòng được nâng kích thước 3× bằng nội suy chất lượng cao, HUD và hotspot HTML độc lập. Các layer nền được xếp chồng theo cùng mặt phẳng tọa độ; 7 công trình và các hotspot tương tác được giữ thành lớp riêng có thể mở rộng theo kích thước màn hình. Các điểm vào phòng là hotspot HTML riêng, nhân vật người chơi được vẽ động trên lớp riêng và dữ liệu tài khoản tiếp tục lấy từ Supabase.

## Cấu trúc
- `index.html`: giao diện và hotspot bản đồ.
- `app.js`: đăng nhập, hồ sơ, realtime presence/chat, di chuyển, vào phòng và luyện tập.
- `style.css`: hiệu ứng bản đồ, nhân vật và nội thất riêng theo từng phòng.
- `assets/ikigai-world-map-gym-v2.png`: artwork bản đồ Gunny-style; các nhân vật vẽ sẵn trong tranh là chi tiết minh họa nền, không phải người chơi online. Người chơi thật được render riêng theo Presence Supabase.
- `assets/ikigai-n5-bank.json`: ngân hàng câu hỏi N5 hiện có.
- `assets/characters/`: bộ nhân vật hiện có, giữ nguyên ảnh thầy Ly đã được cung cấp.
- `supabase-schema.sql`: hồ sơ người chơi và RPC thưởng XP/xu.

## Triển khai GitHub Pages
1. Sao lưu phiên bản đang chạy.
2. Giải nén ZIP và mở thư mục `ikigainohongo-main`.
3. Thay `index.html`, `app.js`, `style.css` và tải thêm `assets/ikigai-world-map.svg`.
4. Giữ nguyên `assets/characters`, `assets/ikigai-n5-bank.json`, `assets/jft` (nếu đã có trên repo) và các dữ liệu Supabase.
5. Không đưa secret/service_role key lên GitHub. Chỉ dùng publishable/anon key ở trình duyệt.
6. Mở GitHub Actions, đợi workflow Pages màu xanh rồi tải lại trang bằng Ctrl+F5.

## Khu vực
Lớp học, Đấu trường, N5, N4, JFT, Gym và Phòng Anh Tùng có bố cục nội thất và skin riêng. Nội dung luyện thi chỉ hoạt động khi ngân hàng dữ liệu tương ứng đã có; N4 không tự tạo câu hỏi giả.

## Kết nối và tài khoản
Đăng nhập học viên/giáo viên, hồ sơ XP/xu, realtime presence/chat và thưởng kết quả sử dụng Supabase project đã cấu hình trong `app.js`. Nếu thay project Supabase, cập nhật URL và publishable key trong mã nguồn; không sử dụng secret key.

## Kiểm thử
Đã kiểm tra cú pháp JavaScript và tính toàn vẹn ZIP trong quá trình đóng gói. Kết nối realtime thật cần được xác nhận sau khi triển khai trên GitHub Pages bằng tài khoản thực của trung tâm.


## Ghi chú bản 5.0
- XP, xu, cấp độ và số người online trên HUD lấy từ hồ sơ/Presence; không dùng số minh họa trong ảnh nền làm dữ liệu tài khoản.
- Người chơi đăng nhập được hiển thị bằng sprite riêng; các nhân vật nằm sẵn trong artwork là minh họa môi trường (NPC trang trí), không đại diện tài khoản đang online.
- Các nút menu chưa có backend riêng sẽ thông báo trạng thái thay vì tự tạo dữ liệu giả.
- Khi cập nhật repo, giữ nguyên thư mục `assets/jft` nếu repo đang có dữ liệu JFT riêng.


## IKIGAI WORLD 6.0 — nâng cấp nội thất và tương tác phòng
- Các phòng được thiết kế bằng nhiều lớp HTML/CSS độc lập: tường, sàn, cửa sổ, bảng, kệ, bàn, thiết bị, biển hiệu và NPC; không còn phụ thuộc vào một ảnh chụp toàn phòng.
- Phòng trà có NPC Anh Tùng vẽ riêng với lông mày cau và biểu cảm nghiêm khắc; có thể nhấp để nghe lời thoại.
- Chat và danh sách người chơi được đặt ở cấp thế giới, có thể mở trong cả bản đồ lẫn từng phòng.
- Đấu trường có hàng chờ Presence: 1v1 cần 2 người, 2v2 cần 4 người; người tham gia phải bấm Sẵn sàng trước khi hệ thống mở màn hình bắt đầu thử thách.
- Ghép trận dựa trên Supabase Realtime Presence của cùng kênh thế giới. Đây là hàng chờ/điều kiện đủ người phía client, chưa phải hệ thống thi đấu có máy chủ phân xử chống gian lận.
- Giữ nguyên cơ chế đăng nhập, hồ sơ XP/xu và ngân hàng N5. Không chạy lại SQL chỉ để dùng giao diện phòng/chat/hàng chờ.
- Nếu repo có `assets/jft/` hoặc tài nguyên bổ sung khác không có trong gói này, giữ lại khi cập nhật.

## IKIGAI WORLD 7.0 — bản đồ không hiển thị nhân vật + bong bóng chat
- Bản đồ thế giới chỉ còn cảnh quan và các điểm vào phòng; không render sprite người chơi trên bản đồ. Nhân vật của tài khoản hiện ra sau khi vào phòng.
- Khi gửi tin nhắn trong phòng, bong bóng thoại xuất hiện phía trên nhân vật gửi; người khác trong cùng phòng nhận được bong bóng realtime. Bong bóng tự ẩn sau 5 giây; khung chat vẫn lưu nội dung trong phiên hiện tại.
- Tạo tài khoản học viên đã được tích hợp bằng Supabase Auth (`Đăng ký`). Mỗi học viên dùng email + mật khẩu riêng; đăng nhập cùng tài khoản đó trên máy khác sẽ vào cùng thế giới và thấy người chơi online qua Realtime Presence.
- Để cho phép đăng ký: trong Supabase Dashboard > Authentication > Providers > Email, bật Email provider; trong Authentication > Settings kiểm tra cho phép đăng ký mới. Nếu bật xác nhận email, học viên phải mở email xác nhận trước khi đăng nhập. Không dùng chế độ Khách nếu muốn tài khoản/hồ sơ đồng bộ lâu dài.
- Hồ sơ XP/xu cần chạy `supabase-schema.sql` trong SQL Editor một lần. Realtime cần bật/được phép dùng cho project và trình duyệt phải có Internet.
- Không cần chạy lại SQL nếu schema 3.2 đã được áp dụng ở phiên bản trước; thay đổi v7 chủ yếu là hiển thị bản đồ và bong bóng chat.


## IKIGAI WORLD 4.1 – Mobile map & room chat update
- Overworld now uses the clean SVG environment map; map controls are real HTML hotspots, not decorative controls baked into the artwork.
- The entire 16:10 map stage scales to fit desktop and rotates as a whole on portrait phones so all destinations, including the arena, remain visible. The browser cannot force the phone's hardware orientation; users can rotate the device if they prefer landscape.
- Removed the nonfunctional map side menu, quickbar and overworld movement pad. Only building hotspots, profile/resources, chat and logout remain.
- Renamed the tea-room destination to Phòng Giám Đốc; the tea room layout and tea interaction remain.
- Fixed room speech bubbles to render above player sprites, including the sender's own message.

Deploy by replacing index.html, app.js, style.css and assets/ikigai-world-map.svg in the existing repository. Preserve Supabase schema, JFT assets, question bank and character assets.


## IKIGAI WORLD 4.1 – building artwork integration
- Added seven isolated transparent PNG building assets under `assets/buildings/`.
- Replaced the seven simplified building drawings in `assets/ikigai-world-map.svg` with the new artwork layer.
- Kept clickable building hotspots as independent HTML buttons; the artwork itself has `pointer-events:none`.
- Preserved the existing Supabase configuration, authentication, realtime chat, profiles, question bank, room logic, and SQL schema.
- Cache version updated to `8.2-building-art`.
- This package is a source update based on the supplied V8 archive. Validate on GitHub Pages before replacing the live version.


## IKIGAI WORLD 9.0 — sửa tích hợp và kiểm tra tài nguyên
- Chuẩn hóa phiên bản cache của `index.html`, `app.js`, `style.css` để trình duyệt tải bộ mã mới thay vì giữ cache 8.3.
- Xếp 7 PNG map layer theo thứ tự manifest, giữ nguyên mặt phẳng tọa độ 1600×1000; 7 tòa nhà là PNG riêng, hotspot là button HTML độc lập.
- Nâng ảnh nội thất phòng lên 3× bằng Lanczos + unsharp mask để hiển thị tốt hơn trên màn hình desktop độ phân giải cao. Đây là nâng độ phân giải nội suy, không phải vẽ lại chi tiết AI.
- Chỉnh CSS để ảnh phòng được fit đủ khung, không bị crop; thêm lớp ánh sáng chuyển động nhẹ.
- Sửa lỗi đồng bộ người trong phòng: khi cập nhật Presence, NPC cố định リー先生 trong lớp học không còn bị xóa nhầm; chỉ các sprite người chơi từ Presence mới được thay thế.
- Loại bỏ các file placeholder 1 byte không được tham chiếu, giữ nguyên file tài nguyên hợp lệ.
- Giữ nguyên cấu hình Supabase, SQL schema, logic đăng nhập, hồ sơ, XP/xu, chat, hàng chờ đấu trường và ngân hàng N5.

## Cài đặt lên GitHub Pages
1. Sao lưu repository hiện tại.
2. Giải nén ZIP. Mở thư mục `ikigainohongo-main`.
3. Thay `index.html`, `app.js`, `style.css` ở thư mục gốc.
4. Tải toàn bộ thư mục `assets` trong ZIP lên repository và ghi đè các file cùng tên. Nếu repository đang có `assets/jft/` hoặc dữ liệu bổ sung không có trong ZIP này, hãy giữ lại thư mục đó.
5. Giữ nguyên `supabase-schema.sql` đã chạy trên Supabase; không cần chạy lại SQL cho bản sửa giao diện này.
6. Commit, đợi GitHub Pages triển khai màu xanh, sau đó mở trang và nhấn Ctrl+F5.

## Phạm vi kiểm thử
Đã kiểm tra cú pháp JavaScript, JSON, cấu trúc SVG, tính hợp lệ và kích thước ảnh, đường dẫn tài nguyên được tham chiếu từ HTML/CSS/JS, cùng tính toàn vẹn ZIP. Kết nối Supabase đa thiết bị và thao tác thực tế trên GitHub Pages không thể được xác nhận từ môi trường đóng gói; cần kiểm tra sau khi triển khai bằng các tài khoản thật.
