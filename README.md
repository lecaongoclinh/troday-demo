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
- [Giới hạn 3 bài chờ duyệt/phòng](database/migrations/20261025_post_review_quota.sql): giữ tổng bài không giới hạn, kiểm soát chờ duyệt bằng ràng buộc và thủ tục giao dịch.

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
    20261025_multiple_room_posts.sql  Cho phép nhiều bài đăng cùng phòng
    20261025_post_review_quota.sql  Tối đa 3 bài chờ duyệt/phòng (chạy cuối)
  source/
    workflows.sql              Nguồn chung của view, trigger và procedure
    viewing-proposals.sql      Nguồn đề nghị lịch và tạo lịch trực tiếp
    contract-viewing-cleanup.sql  Nguồn tạo hợp đồng và đóng hoạt động xem phòng
    post-review-quota.sql      Nguồn trigger và thủ tục giới hạn bài chờ duyệt
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
- **Nâng cấp v5 gốc:** sao lưu, dừng ghi rồi chạy `20261024_v5_workflows.sql` → `20261025_chat_post_sharing.sql` → `20261025_viewing_proposals.sql` → `20261025_contract_viewing_cleanup.sql` → `20261025_multiple_room_posts.sql` → `20261025_post_review_quota.sql` trong `database/migrations/`, mỗi file **một lần**. Các file cùng ngày chạy theo thứ tự này, không theo bảng chữ cái. Script kiểm tra điều kiện trước DDL. Nếu có lỗi thì dừng và xử lý nguyên nhân; không dùng `--force` hoặc bỏ qua lỗi để chạy tiếp. MySQL DDL không rollback toàn bộ như giao dịch dữ liệu.
- **Đã nâng cấp một phần:** chỉ chạy các migration còn thiếu theo thứ tự trên. Đã có bản nhiều bài đăng thì chỉ chạy `20261025_post_review_quota.sql`. Nếu dữ liệu cũ có phòng vượt 3 bài chờ, migration dừng trước khi đổi cấu trúc để quản trị xử lý duyệt/từ chối; không tự xóa hoặc từ chối bài.

Không chạy migration ngay sau bản tạo mới trên cùng CSDL. Chưa áp dụng các script này lên CSDL hiện có của người dùng.

Nguồn nghiệp vụ ban đầu là `database/source/workflows.sql`; phần lịch nằm ở `viewing-proposals.sql`, gửi hợp đồng/đóng lịch ở `contract-viewing-cleanup.sql`, giới hạn bài chờ ở `post-review-quota.sql`, cùng trong `database/source/`. Sửa nguồn tương ứng rồi chạy:

```sh
npm run db:build
npm run db:check
```

Commit nguồn chung và SQL đã đồng bộ. Build ghép bốn nguồn vào schema đầy đủ và các migration tương ứng; các migration cũ giữ nguyên. Script chỉ cập nhật file, không kết nối CSDL. Chi tiết cột mới, tham số procedure và cách gọi từ API nằm trong mục 4–5 của tài liệu nghiệp vụ.

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

Mỗi phòng có tổng bài đăng và số bài đã duyệt không giới hạn, nhưng tối đa **3 bài `PENDING_REVIEW`** đồng thời. Khi đủ 3, bài mới hoặc gửi lại bài đã duyệt/từ chối/ẩn bị chặn; sửa bài đang chờ không chiếm thêm lượt. Duyệt/từ chối giải phóng lượt. Mỗi bài có ID, nội dung, ảnh và kết quả duyệt riêng. Lưu/chia sẻ/báo cáo dùng ID bài; phòng, giá, sức chứa, lịch xem và hợp đồng dùng chung. Dữ liệu demo cũ được chuyển sang `state.posts` khi mở. CSDL vẫn 41 bảng; giới hạn chờ được bảo đảm bằng slot nội bộ, UNIQUE/CHECK và trigger, API dùng `sp_submit_post`.

Từ **Nhà & phòng → Xem chi tiết**, chủ trọ xem thông tin vật lý và danh sách mọi bài liên quan, bộ đếm chờ `n/3`, tạo bài cho đúng phòng hoặc sửa bài. Mở bài có nút quay lại chi tiết phòng. Người thuê chỉ thấy bài đã duyệt trong chi tiết phòng; bài nháp/chờ/từ chối/ẩn chỉ dành cho chủ trọ liên quan và quản trị. Phần danh sách liên quan dùng `posts.room_id` hiện có, không cần thêm bảng.

Chi tiết phòng có thêm **Người đang ở** (tên, đại diện hợp đồng, ngày vào ở) và **Dịch vụ của phòng** (đơn giá, đơn vị, cách tính). Chỉ chủ trọ sở hữu phòng và quản trị thấy danh sách người ở; người xem công khai chỉ thấy số lượng. Chỉ tính lượt cư trú `ACTIVE`, kể cả dữ liệu cũ còn người ở trên hợp đồng đã đóng. Dịch vụ phải đang bật ở cả nhà và phòng; dùng giá riêng của phòng nếu có, kể cả giá 0, nếu không thì theo giá nhà. Các danh sách này dùng `room_tenants`, `room_services`, `house_services` hiện có, không cần sửa CSDL hoặc thêm migration.

Ba phần nằm trong các tab **Bài đăng / Người ở / Dịch vụ** bên dưới thông tin chung của phòng. Mỗi lần chỉ hiện nội dung tab đang chọn, mặc định là Bài đăng và ghi nhớ lựa chọn khi tải lại demo. Có thể chuyển tab bằng chuột hoặc phím trái/phải, Home/End. Nút tạo/sửa bài và hạn mức chờ duyệt nằm trong tab Bài đăng.

Ở phần **Ở ghép → Tạo hồ sơ ở ghép**, người thuê khai tình trạng chỗ ở, khu vực, ngân sách, thói quen và ngày sẵn sàng; sau khi tạo có thể sửa và giữ thông tin khi tải lại trang. Nếu có lượt ở `ACTIVE`, tình trạng/phòng hiện tại được lấy tự động; nếu không có thì tự chọn chưa có chỗ ở hoặc đang ở ngoài hệ thống, kèm mô tả không bắt buộc. Hồ sơ mẫu từ bản demo cũ được giữ để điền sẵn form tạo. Cần tạo hồ sơ trước khi gửi lời mời mới; lưu hồ sơ không tự gửi lời mời. Luồng dùng bảng `roommate_profiles` hiện có, không thêm migration.

Có thể xem hồ sơ người gửi trước khi phản hồi lời mời ở ghép. Lời mời và kết nối đã có vẫn sử dụng được; chấp nhận mở cuộc chat giữa hai người, không tự tạo yêu cầu thuê chung hay giữ chỗ. CSDL v5 đã hỗ trợ hội thoại `ROOMMATE`; không cần thêm bảng cho luồng này.

Tìm người ở ghép chia thành ba tab **Người phù hợp / Lời mời dành cho bạn / Đã mời**, có bộ đếm tổng số mục, trạng thái trống và các thao tác theo trạng thái kết nối. Tab được ghi nhớ sau khi tải lại; hỗ trợ phím trái/phải, Home/End. Gửi lời mời mới chuyển sang tab Đã mời.

**Hợp đồng** hiển thị trạng thái “Còn hiệu lực”, phòng đang thuê và thời hạn. Lan có hợp đồng mẫu **HD-2026-099 — P203**, hiệu lực 01/10/2026–30/09/2027. Chi tiết có **Yêu cầu gia hạn / Yêu cầu thay đổi (đổi phòng) / Yêu cầu chấm dứt**. Thử gia hạn bằng cách nhập ngày kết thúc mới, chuyển vai trò Chủ trọ → Hợp đồng → Yêu cầu gia hạn / điều chỉnh → Chấp nhận; chuyển về Người thuê để xác nhận phương án; sau đó Chủ trọ áp dụng từ ngày hiệu lực. Từ chối có lý do và giữ lịch sử. Hợp đồng chỉ đổi sau bước áp dụng. Dữ liệu cũ được bổ sung ví dụ một lần nếu Lan chưa có lượt ở đang mở; không cần reset dữ liệu hay chạy migration SQL.

Tin nhắn có nhãn “Chủ trọ”, “Bạn ghép” hoặc “Người thuê” cạnh tên theo quan hệ hội thoại. Hai người đã kết nối có thể chia sẻ tin phòng từ chat hoặc trang chi tiết; bấm thẻ để xem phòng và quay lại đúng cuộc trò chuyện. CSDL dùng `chat_messages.message_type = 'POST_SHARE'` và `shared_post_id` tham chiếu bài đăng; phần chia sẻ không thêm bảng.

Lịch xem có hai cách tạo: người thuê bấm “Đề nghị lịch xem” từ chi tiết phòng hoặc chat, chờ chủ trọ chấp nhận; hoặc chủ trọ bấm “Hẹn xem” để tạo lịch đã chốt sau khi có trao đổi từ người thuê về phòng đó. Đề nghị lưu riêng trong `room_viewing_proposals`, chưa giữ giờ/chỗ thuê; khi duyệt mới tạo `room_viewing_requests` trong cùng giao dịch. Chat và Lịch xem có chấp nhận/từ chối/rút đề nghị, sau đó dùng chung các thao tác hủy, đã xem, không đến và quyết định thuê. Thử bằng cách đổi giữa vai trò Người thuê và Chủ trọ.

Một phòng có thể có nhiều lịch khác giờ. “Đồng ý thuê” chỉ là mong muốn; khi chủ trọ gửi hợp đồng mới giữ phòng, hủy các lịch xem sắp tới và từ chối đề nghị chờ của phòng đó, đồng thời thông báo người liên quan. Hủy hợp đồng trả phòng trống nhưng không khôi phục lịch cũ. Phần này dùng bảng/trạng thái hiện có, tổng vẫn 41 bảng; migration mới thay thủ tục, không tự sửa dữ liệu lịch sử.

Chat nhiều bài đăng trong cùng một dòng thời gian là đề xuất giao diện: v5 hiện gắn mỗi `conversation` với một `post_id`/`room_id`. API cần nhóm các conversation theo cặp người, hoặc thiết kế thêm ngữ cảnh con và điều chỉnh liên kết lịch xem nếu muốn lưu thành một hội thoại chung. Không dùng dữ liệu chat của prototype làm migration v5.
