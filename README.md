# Trọday — wireframe và CSDL v5

Mở `index.html` trực tiếp trong trình duyệt, không cần cài đặt hay chạy server. Chọn vai trò Người thuê, Chủ trọ hoặc Quản trị ở thanh trên.

Dữ liệu mẫu lưu trong `localStorage`; nhập `__troday.reset()` ở console để bắt đầu lại. Wireframe chạy độc lập với MySQL, các thao tác trên giao diện chưa ghi vào CSDL thật.

## Bắt đầu đọc

- [Quy tắc nghiệp vụ](docs/business-rules.md): toàn bộ logic đang có, thay đổi đã thực hiện, ràng buộc CSDL và cách tích hợp API.
- [SQL tạo mới](database/schema.sql): CSDL v5 hiện tại, 41 bảng.
- [Nâng cấp nghiệp vụ](database/migrations/20261024_v5_workflows.sql): chuyển v5 gốc 39 bảng sang bản có lịch sử đại diện.
- [Nâng cấp chia sẻ tin phòng](database/migrations/20261025_chat_post_sharing.sql): thêm tin nhắn tham chiếu bài đăng, chạy sau bản nâng cấp nghiệp vụ.
- [Nâng cấp đề nghị lịch xem](database/migrations/20261025_viewing_proposals.sql): người thuê đề nghị, chủ trọ duyệt; vẫn giữ chủ trọ tự tạo lịch sau trao đổi.
- [Nâng cấp xử lý lịch khi giữ phòng](database/migrations/20261025_contract_viewing_cleanup.sql): gửi hợp đồng đồng thời hủy lịch sắp tới, đóng đề nghị chờ và tạo thông báo.
- [Nâng cấp nhiều bài đăng cùng phòng](database/migrations/20261025_multiple_room_posts.sql): bỏ giới hạn một tin hoạt động; cho phép nhiều tin chờ duyệt/đã duyệt của cùng phòng.

## Cấu trúc thư mục

```text
index.html                     Giao diện
app.js                         Dữ liệu mẫu và xử lý nghiệp vụ
styles.css                     Kiểu hiển thị
icons.js                       Bộ biểu tượng
assets/                        Ảnh phòng
docs/
  business-rules.md            Tài liệu nghiệp vụ chung
database/
  schema.sql                   SQL đầy đủ để tạo CSDL mới
  migrations/
    20261024_v5_workflows.sql   Nâng cấp một lần từ v5 gốc
    20261025_chat_post_sharing.sql  Thêm chia sẻ tin phòng trong chat
    20261025_viewing_proposals.sql  Thêm đề nghị và duyệt lịch xem
    20261025_contract_viewing_cleanup.sql  Xử lý lịch khi gửi hợp đồng
    20261025_multiple_room_posts.sql  Cho phép nhiều bài đăng cùng phòng (chạy cuối)
  source/
    workflows.sql              Nguồn chung của view, trigger và procedure
    viewing-proposals.sql      Nguồn đề nghị lịch và tạo lịch trực tiếp
    contract-viewing-cleanup.sql  Nguồn tạo hợp đồng và đóng hoạt động xem phòng
scripts/
  build-database.cjs            Đồng bộ nguồn nghiệp vụ vào SQL triển khai
tests/
  app.test.cjs                 Kiểm thử nghiệp vụ JavaScript
  browser.test.cjs             Kiểm thử giao diện bằng Chrome
  database.test.cjs            Kiểm thử MySQL trên instance tạm
  fixtures/
    v5-original-schema.sql     Cấu trúc v5 gốc để kiểm thử nâng cấp
    workflow-data.sql          Dữ liệu mẫu để kiểm thử SQL
```

SQL triển khai nằm trong `database/`. Hai SQL trong `tests/fixtures/` cần giữ để kiểm tra migration và các giao dịch; không dùng để cài đặt hệ thống. Tên migration bắt đầu bằng ngày áp dụng để team theo dõi thứ tự.

## Sử dụng SQL

Chọn **một** cách phù hợp:

- **Tạo mới:** chạy `database/schema.sql`. File tự tạo và chọn CSDL `room_rental_v5_20261023`; nếu tên này đã tồn tại thì dừng. Tên CSDL được giữ nguyên để tương thích v5.
- **Nâng cấp v5 gốc:** sao lưu, dừng ghi rồi chạy `20261024_v5_workflows.sql` → `20261025_chat_post_sharing.sql` → `20261025_viewing_proposals.sql` → `20261025_contract_viewing_cleanup.sql` → `20261025_multiple_room_posts.sql` trong `database/migrations/`, mỗi file **một lần**. Các file cùng ngày chạy theo thứ tự này, không theo bảng chữ cái. Script kiểm tra điều kiện trước DDL. Nếu có lỗi thì dừng và xử lý nguyên nhân; không dùng `--force` hoặc bỏ qua lỗi để chạy tiếp. MySQL DDL không rollback toàn bộ như giao dịch dữ liệu.
- **Đã nâng cấp một phần:** chỉ chạy các migration còn thiếu theo thứ tự trên. Đã có bản xử lý lịch khi gửi hợp đồng thì chỉ chạy `20261025_multiple_room_posts.sql`; không chạy lại migration cũ.

Không chạy migration ngay sau bản tạo mới trên cùng CSDL. Chưa áp dụng các script này lên CSDL hiện có của người dùng.

Nguồn nghiệp vụ ban đầu là `database/source/workflows.sql`; phần đề nghị lịch và phiên bản mới của `sp_schedule_viewing` nằm ở `database/source/viewing-proposals.sql`. Phiên bản mới của `sp_create_rental_contract` và helper đóng lịch nằm ở `database/source/contract-viewing-cleanup.sql`. Sửa nguồn tương ứng rồi chạy:

```sh
npm run db:build
npm run db:check
```

Commit nguồn chung và SQL đã đồng bộ. Build ghép ba nguồn vào schema đầy đủ và các migration tương ứng; các migration cũ giữ nguyên. Script chỉ cập nhật file, không kết nối CSDL. Chi tiết cột mới, tham số procedure và cách gọi từ API nằm trong mục 4–5 của tài liệu nghiệp vụ.

## Kiểm thử

Cần Node.js 22+; không cần `npm install` vì các script chỉ dùng thư viện có sẵn của Node.

Trên PowerShell, nếu `npm.ps1` bị chặn bởi Execution Policy, dùng `npm.cmd` thay cho `npm` trong các lệnh dưới đây.

| Lệnh | Nội dung | Điều kiện thêm |
| --- | --- | --- |
| `npm test` | Nghiệp vụ JavaScript | Không |
| `npm run db:check` | SQL triển khai đồng bộ với nguồn | Không |
| `npm run test:browser` | Thao tác giao diện thật | Chrome; có thể đặt `CHROME_PATH` |
| `npm run test:database` | Tạo mới, nâng cấp và giao dịch đồng thời | MySQL Server/client 8.0 trên Windows; có thể đặt `MYSQL_BIN` |

Bộ kiểm thử MySQL khởi tạo instance tạm có thư mục dữ liệu và cổng riêng, kiểm tra đúng instance trước khi chạy SQL, rồi dọn sau khi hoàn tất. Đường dẫn mặc định là `C:/Program Files/MySQL/MySQL Server 8.0/bin`. Bộ kiểm thử trình duyệt cũng dùng profile tạm.

## Phạm vi mô phỏng

Wireframe có tìm phòng, tin đăng, chat, lịch xem, hợp đồng, bàn giao đại diện, quản lý người ở, đổi phòng, hóa đơn, dịch vụ và quản trị. Danh sách quy tắc chi tiết tập trung trong [tài liệu nghiệp vụ](docs/business-rules.md).

Mỗi phòng có thể có nhiều bài đăng, nhiều tin chờ duyệt và nhiều tin đã duyệt; hiện không đặt hạn mức số tin theo phòng. Chủ trọ tạo bài mới từ bất kỳ phòng có sẵn của mình; mỗi bài có ID, nội dung, ảnh và kết quả duyệt riêng. Khám phá, lưu tin, chi tiết, báo cáo và chia sẻ dùng ID bài đăng. Giá thuê, sức chứa, trạng thái phòng, lịch xem và hợp đồng vẫn dùng chung phòng. Dữ liệu demo cũ được tách sang `state.posts` và chuyển tham chiếu khi mở, không cần xóa localStorage. CSDL vẫn 41 bảng; migration chỉ đổi chỉ mục/cột sinh trên `posts`.

Ở phần ở ghép, có thể xem hồ sơ người gửi trước khi phản hồi lời mời. Chấp nhận kết nối sẽ mở cuộc chat giữa hai người, không tự tạo yêu cầu thuê chung hay giữ chỗ. CSDL v5 đã hỗ trợ hội thoại `ROOMMATE`; không cần thêm bảng cho luồng này.

Tin nhắn có nhãn “Chủ trọ”, “Bạn ghép” hoặc “Người thuê” cạnh tên theo quan hệ hội thoại. Hai người đã kết nối có thể chia sẻ tin phòng từ chat hoặc trang chi tiết; bấm thẻ để xem phòng và quay lại đúng cuộc trò chuyện. CSDL dùng `chat_messages.message_type = 'POST_SHARE'` và `shared_post_id` tham chiếu bài đăng; phần chia sẻ không thêm bảng.

Lịch xem có hai cách tạo: người thuê bấm “Đề nghị lịch xem” từ chi tiết phòng hoặc chat, chờ chủ trọ chấp nhận; hoặc chủ trọ bấm “Hẹn xem” để tạo lịch đã chốt sau khi có trao đổi từ người thuê về phòng đó. Đề nghị lưu riêng trong `room_viewing_proposals`, chưa giữ giờ/chỗ thuê; khi duyệt mới tạo `room_viewing_requests` trong cùng giao dịch. Chat và Lịch xem có chấp nhận/từ chối/rút đề nghị, sau đó dùng chung các thao tác hủy, đã xem, không đến và quyết định thuê. Thử bằng cách đổi giữa vai trò Người thuê và Chủ trọ.

Một phòng có thể có nhiều lịch khác giờ. “Đồng ý thuê” chỉ là mong muốn; khi chủ trọ gửi hợp đồng mới giữ phòng, hủy các lịch xem sắp tới và từ chối đề nghị chờ của phòng đó, đồng thời thông báo người liên quan. Hủy hợp đồng trả phòng trống nhưng không khôi phục lịch cũ. Phần này dùng bảng/trạng thái hiện có, tổng vẫn 41 bảng; migration mới thay thủ tục, không tự sửa dữ liệu lịch sử.

Chat nhiều bài đăng trong cùng một dòng thời gian là đề xuất giao diện: v5 hiện gắn mỗi `conversation` với một `post_id`/`room_id`. API cần nhóm các conversation theo cặp người, hoặc thiết kế thêm ngữ cảnh con và điều chỉnh liên kết lịch xem nếu muốn lưu thành một hội thoại chung. Không dùng dữ liệu chat của prototype làm migration v5.
