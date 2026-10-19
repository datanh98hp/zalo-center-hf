# Tích hợp Zalo cá nhân qua QR — kế hoạch v0.5

## Trạng thái

**Chưa triển khai.** Màn hình Integrations hiện chỉ hiển thị cảnh báo và đăng ký metadata nguồn; API cũng từ chối tạo `ZALO_PERSONAL_APPROVED` cho đến khi adapter được triển khai; API cũng từ chối tạo `ZALO_PERSONAL_APPROVED` cho đến khi adapter được triển khai; không tạo mã QR, không đăng nhập Zalo Web, không đọc cookie/session, không đồng bộ lịch sử và không gửi/nhận tin nhắn cá nhân.

Tài liệu nhà phát triển công khai mà dự án đã rà soát mô tả các sản phẩm như Zalo OA, ZBS Template Message, Social API, SDK và Social Plugins. Chưa xác minh được API công khai chính thức cấp quyền đọc/gửi toàn bộ hộp thư của tài khoản cá nhân. Không coi OAuth Social Login là quyền truy cập hộp thư cá nhân.

## Quy trình xác minh trước khi triển khai

1. Yêu cầu Zalo hoặc nhà cung cấp/đối tác có thẩm quyền xác nhận bằng văn bản quyền truy cập hộp thư cá nhân, phạm vi dữ liệu, gửi tin, lịch sử, giới hạn tần suất, lưu trữ và điều khoản sử dụng.
2. Xác minh tài liệu API/SDK, sandbox, phương thức xác thực, webhook hoặc cơ chế đồng bộ, quy trình thu hồi phiên và hỗ trợ sự cố.
3. Chỉ sau khi xác minh, thiết kế `PersonalAccountProvider` độc lập với OA provider. Không dùng chung logic token hoặc giả định payload OA giống payload cá nhân.
4. Bảo vệ bí mật bằng mã hóa tại chỗ, phân quyền tối thiểu, audit log, xoay vòng/thu hồi thông tin xác thực và không ghi bí mật vào log. Không yêu cầu người dùng gửi mật khẩu/OTP cho quản trị viên.
5. Kiểm thử trên tài khoản thử nghiệm: kết nối/đăng xuất, token hết hạn, tin nhắn trùng, mất mạng, gửi thất bại, phân trang lịch sử, đồng bộ lại, xóa dữ liệu và thu hồi quyền.

## Yêu cầu kỹ thuật khi adapter được phê duyệt

- Mỗi tài khoản là một `Integration` riêng, tenant-scoped, có trạng thái `PENDING`, `CONNECTED`, `DEGRADED`, `REVOKED` hoặc `ERROR`.
- Mọi message phải có khóa idempotency theo provider và account; lưu cursor đồng bộ, thời gian nguồn và trạng thái gửi.
- Dùng queue bền vững cho tác vụ gửi/đồng bộ, retry có backoff, dead-letter và giám sát độ trễ.
- Tách danh tính khách hàng theo Zalo ID và số điện thoại; không tự gộp chỉ vì tên hiển thị trùng nhau.
- Hỗ trợ lịch sử chỉ trong phạm vi provider thực sự cho phép. Không hứa nhập được lịch sử cũ nếu API không cung cấp.
- Không triển khai browser automation, reverse-engineered private endpoints hoặc cookie/session scraping trong starter này.

## Tài liệu tham khảo

- Zalo for Developers: https://developers.zalo.me/docs/
- Zalo Developer Portal: https://developers.zalo.me/
- Zalo Help Center về an toàn đăng nhập QR: https://help.zalo.me/

## Tiêu chí chấp nhận

Chỉ đánh dấu kết nối hoạt động khi adapter được phê duyệt, xác thực thành công và có kiểm thử xác nhận nhận/gửi thực tế. Việc tạo metadata tài khoản trong giao diện không phải bằng chứng kết nối.
