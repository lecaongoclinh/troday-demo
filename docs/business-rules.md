# Quy tắc nghiệp vụ hệ thống Trọday

Phiên bản v5, cập nhật ngày 25/10/2026.

Wireframe đã mô phỏng các thực thể chính của v5, nhưng trước bản sửa này chưa bảo đảm các quy tắc nghiệp vụ giữa lịch xem, hợp đồng, lượt cư trú và sức chứa. Không nên coi việc có đủ màn hình là đã tuân thủ đầy đủ CSDL.

Các luồng giao diện nằm trong `app.js` và dữ liệu mô phỏng trên `localStorage`. **SQL v5 đã được sửa** để hỗ trợ các nghiệp vụ mới, gồm lịch sử đại diện và các thủ tục giao dịch. Đã chuẩn bị cả bản tạo mới và migration từ v5 gốc. Chỉ kiểm tra trên MySQL tạm riêng; chưa chạy migration hoặc ghi vào CSDL hiện có của người dùng.

Đây là file tổng hợp chung cho các logic đang có, các thay đổi vừa thực hiện và phần còn cần triển khai. SQL tạo mới là `database/schema.sql`; nâng cấp theo thứ tự `20261024_v5_workflows.sql` → `20261025_chat_post_sharing.sql` → `20261025_viewing_proposals.sql` → `20261025_contract_viewing_cleanup.sql` → `20261025_multiple_room_posts.sql` trong `database/migrations/`. Mỗi migration chạy một lần, theo thứ tự này thay vì bảng chữ cái. Hệ thống có **41 bảng** sau cập nhật. API vẫn cần tích hợp các stored procedure; wireframe HTML chưa kết nối trực tiếp MySQL.

## 1. Danh mục logic nghiệp vụ đang có

Ký hiệu: **Có** = đang được mô phỏng bằng code; **Sửa** = đã chỉnh trong đợt rà soát này; **Mới** = bổ sung trong các đợt cập nhật nghiệp vụ; **Thiết kế** = có trong SQL hoặc là yêu cầu backend, chưa triển khai đầy đủ trong wireframe; **Đề xuất** = phương án đang được đề nghị, chưa triển khai vào SQL hoặc giao diện. Các trạng thái này không xác nhận rằng đã có API; phạm vi kiểm thử nằm ở mục 8.

### 1.1. Tài khoản, vai trò và hồ sơ

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| TK-01 | Hệ thống có ba vai trò: người thuê, chủ trọ, quản trị. Mỗi vai trò có menu và nhóm màn hình tương ứng. | Có |
| TK-02 | Trong demo, đổi vai trò là đổi tài khoản mẫu: người thuê Lan, chủ trọ Quân, quản trị Huyền Anh; chưa có đăng nhập thực hoặc bộ chọn mọi tài khoản. | Có |
| TK-03 | Người dùng có thể sửa tên hiển thị. Số điện thoại, email, địa chỉ đang xuất hiện trong form nhưng handler hiện mới lưu tên. | Có một phần |
| TK-04 | Người thuê gửi số căn cước và tệp giấy tờ để tạo hồ sơ chờ duyệt; demo lưu tên tệp, chưa tải tệp lên máy chủ. | Có một phần |
| TK-05 | Quản trị duyệt hoặc từ chối hồ sơ; quyết định từ chối có lý do và ghi nhật ký. | Có |
| TK-06 | Quản trị khóa/mở khóa tài khoản kèm lý do. Demo có danh sách tài khoản bị khóa; chưa chặn toàn bộ nghiệp vụ của tài khoản đó như backend thật. | Có một phần |
| TK-07 | Có giao diện danh sách phiên đăng nhập và nút thu hồi; thu hồi hiện chỉ báo thành công, chưa thu hồi phiên thực. | Thiết kế |
| TK-08 | Xác thực, OTP, mật khẩu, phiên, hạn lưu giấy tờ và quyền nhiều vai trò có trong SQL; cần triển khai ở backend. | Thiết kế |

### 1.2. Nhà trọ, phòng và sức chứa

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| PH-01 | Phòng thuộc một nhà; nhà thuộc chủ trọ. Màn hình chủ trọ làm việc với các nhà/phòng của tài khoản mẫu. | Có |
| PH-02 | Có thêm/sửa phòng: mã, diện tích, tiền thuê, tiền cọc, sức chứa và tình trạng. Mã phòng không trùng trong cùng nhà. | Có |
| PH-03 | Sức chứa là số nguyên dương; không giảm xuống dưới số người đang ở + thành viên dự kiến trên hợp đồng mở + chỗ giữ còn hạn. | Sửa |
| PH-04 | Có bất kỳ lượt cư trú `ACTIVE` thì phòng được tính `OCCUPIED`, kể cả khi dữ liệu cũ đóng hợp đồng sai. | Sửa |
| PH-05 | Không có người đang ở nhưng có hợp đồng mở thì phòng được giữ (`RESERVED`); hết người và không còn hợp đồng mở thì còn trống (`AVAILABLE`). Bảo trì được giữ khi không có lượt ở/hợp đồng mở. | Sửa |
| PH-06 | Trạng thái hiển thị của phòng không thay thế danh sách lượt cư trú. Không tự cho phòng trống chỉ vì đại diện rời. | Sửa |
| PH-07 | Không cho chủ trọ đặt tay phòng đang có lượt ở thành “Còn phòng”. | Sửa |

### 1.3. Tin đăng, tìm kiếm và lưu tin

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| TD-01 | Màn hình khám phá chỉ lấy tin đã duyệt và phòng chưa `OCCUPIED`; có lọc từ khóa, khu vực, giá tối đa, diện tích tối thiểu, tiện ích và khoảng cách. | Có |
| TD-02 | Người thuê xem ảnh, giá, cọc, diện tích, sức chứa, dịch vụ và thông tin chủ trọ. | Có |
| TD-03 | Người thuê lưu/bỏ lưu tin; danh sách đã lưu được giữ trong dữ liệu demo. | Có |
| TD-04 | Chủ trọ tạo/sửa nội dung tin và gửi về `PENDING_REVIEW`; quản trị duyệt, từ chối có lý do hoặc hiện lại tin đã ẩn. | Có |
| TD-05 | Kiểm duyệt tin và tình trạng phòng là hai thông tin riêng. Tin được duyệt không đồng nghĩa phòng còn trống. | Có |
| TD-06 | UI tách `state.rooms` và `state.posts`. Phòng giữ dữ liệu vật lý/giá/sức chứa/trạng thái; mỗi bài có ID riêng, `roomId`, tiêu đề, nội dung, ảnh, trạng thái và phiên bản nội dung. SQL đã có `rooms` và `posts` riêng. | Sửa |
| TD-07 | Một phòng có nhiều bài đăng, nhiều tin `PENDING_REVIEW` và nhiều tin `APPROVED` đồng thời; hiện không đặt hạn mức theo phòng. Tạo bài mới luôn tạo bản ghi riêng, không ghi đè bài cũ. | Sửa |
| TD-08 | Chủ trọ chọn bất kỳ phòng có sẵn thuộc mình, kể cả đã có bài chờ duyệt/đã duyệt. Chỉ yêu cầu thêm phòng khi chưa có phòng thật. Không cần tạo thêm phòng hoặc ẩn bài cũ để đăng bài khác. | Sửa |
| TD-09 | Sửa đúng ID bài và giữ nguyên phòng; kiểm tra lại quyền, trạng thái và phiên bản đã mở. Sửa/gửi lại đưa riêng bài đó về `PENDING_REVIEW`, không đổi nội dung/kết quả duyệt bài khác. Tạo bài mới bắt đầu tiêu đề/nội dung trống, không tự sao chép bài cùng phòng. | Sửa |
| TD-10 | Form hiện hỗ trợ một ảnh URL HTTP/HTTPS hoặc ảnh mẫu đi kèm. Đường dẫn ảnh mẫu tương đối không còn bị trường `type=url` chặn khi lưu. SQL đã có `post_images` cho nhiều ảnh nhưng UI chưa triển khai nhiều ảnh. | Sửa / Có một phần |
| TD-11 | Quản trị duyệt/từ chối/hiện lại theo ID bài; từ chối có lý do. Chủ trọ có thể ẩn bài của mình kèm lý do. Ẩn hoặc từ chối một bài không tác động các bài khác cùng phòng. | Mới |
| TD-12 | Khám phá, lưu tin, chia sẻ, chi tiết và báo cáo dùng ID bài đăng, không dùng ID phòng thay thế. Nhiều bài được duyệt của cùng phòng có thể cùng xuất hiện; ẩn bài đã chia sẻ không được tự mở bài khác cùng phòng. | Mới |
| TD-13 | Mọi bài của cùng phòng dùng chung tình trạng còn phòng, giá hiện tại và sức chứa. Nhiều bài không tạo thêm chỗ hoặc thêm hợp đồng mở; lịch xem vẫn chống trùng và xử lý theo phòng. | Mới |

Luồng hiện tại luôn chọn phòng đang có để tạo bài mới. Giới hạn cũ “tối đa một tin chờ duyệt hoặc đã duyệt/phòng” đã được bỏ khỏi SQL và UI qua migration `20261025_multiple_room_posts.sql`; chi tiết ở mục 4.11. Lỗi chọn phòng và mô hình một bài/phòng của các bản trước không còn là quy tắc nghiệp vụ hiện hành.

### 1.4. Hội thoại và tin nhắn

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| HT-01 | Chỉ hiển thị hội thoại có tài khoản đang dùng tham gia. Nhắn về phòng sẽ mở/tạo hội thoại giữa người thuê và chủ của phòng; chấp nhận kết nối ở ghép mở hội thoại riêng giữa hai người. | Có / Sửa |
| HT-02 | Một hội thoại UI có thể chứa nhiều ngữ cảnh phòng và tin nhắn chung; các ngữ cảnh được hiển thị trong dòng thời gian. | Có |
| HT-03 | Chỉ chọn ngữ cảnh phòng thuộc chủ trọ trong hội thoại; giới hạn tin nhắn 2.000 ký tự, không gửi nội dung trống. | Có |
| HT-04 | Nháp và ngữ cảnh đang chọn được lưu riêng theo người dùng/hội thoại. Enter gửi, Shift+Enter xuống dòng. | Có |
| HT-05 | Chủ trọ tạo lịch từ hội thoại cho người thuê và phòng đã trao đổi. Tạo lịch từ chat giữ nguyên cuộc trò chuyện và cuộn tới thẻ lịch vừa tạo; tạo từ màn hình khác mở danh sách lịch xem. | Có / Sửa |
| HT-06 | Với hội thoại hỏi phòng, SQL v5 gắn một conversation với một phòng/bài đăng; cần nhóm nhiều conversation ở lớp ứng dụng hoặc migration ngữ cảnh chat để lưu đúng mô hình UI. Hội thoại ở ghép dùng loại `ROOMMATE` và liên kết lời mời đã chấp nhận. | Thiết kế |
| HT-07 | Chat ở ghép không có nút hẹn xem hoặc ngữ cảnh phòng của cuộc chat trước. Tin nhắn lưu trong cùng hội thoại khi tải lại hoặc mở lại từ lời mời/hồ sơ. Chỉ thành viên của kết nối còn hiệu lực được mở và gửi. | Mới |
| HT-08 | Trong nội dung chat có khối lịch xem của đúng hội thoại và đúng cặp người thuê/chủ trọ, sắp theo giờ hẹn. Thẻ hiển thị phòng, địa điểm, ngày/giờ UTC+7, ghi chú, trạng thái lịch và quyết định thuê; thao tác theo quyền như màn hình Lịch xem. Lịch hủy vẫn giữ thẻ và lý do. | Mới |
| HT-09 | Thẻ lịch đọc trực tiếp bản ghi lịch xem, không sao chép thành tin nhắn văn bản hoặc tạo lịch trùng khi tải lại. Chat và danh sách lịch dùng chung trạng thái. Không đưa lịch của chủ trọ vào chat ở ghép. Khi gửi tin, cuộn tới tin vừa gửi để khối lịch không che tin mới. | Mới |
| HT-10 | Tên ở danh sách hội thoại và đầu cuộc chat có nhãn theo quan hệ: “Chủ trọ” khi người thuê hỏi phòng của chủ trọ, “Người thuê” ở phía chủ trọ, “Bạn ghép” trong hội thoại kết nối. Không dùng nhãn để suy ra đã ở chung; không lưu thêm nhãn cố định vào người dùng. | Mới |
| HT-11 | Trong chat bạn ghép có “Chia sẻ phòng”; trang chi tiết có “Chia sẻ cho bạn ghép”. Chỉ gửi tới kết nối đã chấp nhận và chưa kết thúc, kiểm tra lại khi gửi; chọn đúng người nhận và bài đăng đang hiển thị. Giữ nháp tin nhắn thường khi chia sẻ. | Mới |
| HT-12 | Tin chia sẻ có ảnh, tên phòng, giá hiện tại, khu vực và tình trạng còn phòng/giữ chỗ/đang ở/bảo trì. Bấm thẻ mở đúng chi tiết, có nút quay lại đúng bạn ghép. Không tự thêm chủ trọ vào chat, đặt lịch, giữ chỗ hoặc tạo đồng thuận thuê. | Mới |
| HT-13 | Tin đã chia sẻ vẫn lưu khi tải lại. Nếu bài đăng bị ẩn, không còn tồn tại hoặc không được phép xem thì thẻ báo “Tin phòng không còn hiển thị”, không lộ ảnh/tiêu đề cũ và không mở nhầm phòng khác. | Mới |

### 1.5. Lịch xem và quyết định thuê

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| LX-01 | Chủ trọ có thể tự tạo lịch đã chốt cho phòng của mình sau khi người thuê đã nhắn về đúng phòng trong hội thoại. Phòng phải còn trống, tin đã duyệt và chưa có hợp đồng mở. Luồng này hoạt động song song với đề nghị của người thuê. | Sửa |
| LX-02 | Ngày/giờ được hiểu theo Việt Nam UTC+7, độc lập múi giờ thiết bị. Gợi ý mốc nửa giờ ở tương lai với khoảng đệm ít nhất 15 phút. | Sửa |
| LX-03 | Bắt đầu phải ở tương lai, kể cả khi ngày là hôm nay. Thời lượng chọn 30, 60, 90 hoặc 120 phút. | Sửa |
| LX-04 | Cùng phòng không có hai lịch `SCHEDULED` giao nhau. Hai lịch liền kề có giờ kết thúc/bắt đầu bằng nhau được phép. | Sửa |
| LX-05 | Chủ trọ xác nhận đã đến xem khi đã tới giờ bắt đầu; lưu người và thời điểm xác nhận, chuyển `COMPLETED`. | Sửa |
| LX-06 | Chỉ ghi nhận `NO_SHOW` khi đã hết khoảng giờ hẹn. | Sửa |
| LX-07 | Chủ trọ hoặc người thuê liên quan được hủy lịch đang `SCHEDULED`, có lý do/người/thời điểm hủy. Lịch hủy không chiếm khoảng giờ nữa. | Sửa |
| LX-08 | Sau khi xem xong, người thuê chuyển quyết định từ `WAITING` sang `AGREED` hoặc `DECLINED`; lưu người và thời điểm quyết định. | Có / Sửa |
| LX-09 | Chỉ rút ý định từ `AGREED` sang `WITHDRAWN`; còn hợp đồng mở thì phải xử lý hợp đồng trước. Không cho sửa ngược quyết định chỉ bằng nút cũ. | Sửa |
| LX-10 | Tổng quan chỉ đếm lịch đã hẹn chưa hết giờ và sắp xếp theo giờ bắt đầu. | Sửa |
| LX-11 | Người thuê gửi đề nghị từ chi tiết phòng hoặc chat đúng chủ trọ; chủ trọ chấp nhận/từ chối có lý do, người thuê được rút khi còn chờ. Chỉ chấp nhận mới tạo lịch `SCHEDULED`; đề nghị và lịch hiển thị đồng bộ trong chat/Lịch xem. | Mới |
| LX-12 | Một người chỉ có một đề nghị `PENDING` cho cùng phòng. Khóa gửi chống tạo trùng; duyệt lại trả lịch cũ. Đề nghị chờ không giữ giờ/chỗ; duyệt phải kiểm tra lại trùng giờ, phòng, hội thoại và tài khoản. | Mới |
| LX-13 | Giờ đề nghị đã đến thì hết hạn, không được duyệt/rút kể cả tác vụ nền chưa chạy. Đề nghị đã chấp nhận giữ lịch sử khi lịch bị hủy; đổi giờ bằng rút đề nghị cũ/gửi mới hoặc hủy lịch đã chốt. | Mới |
| LX-14 | Một phòng được có nhiều lịch khác giờ; lịch xem/đề nghị không phải quyền ưu tiên thuê. Nhiều người đã xem có thể cùng ghi nhận `AGREED`; chủ trọ chọn người để gửi hợp đồng. | Mới |
| LX-15 | Gửi hợp đồng giữ phòng, tự hủy lịch `SCHEDULED` chưa bắt đầu và từ chối đề nghị `PENDING` còn hạn của đúng phòng, kèm lý do/người/thời điểm và thông báo. Đề nghị quá giờ chuyển `EXPIRED`; lịch đã xem, đã hủy, không đến, đang diễn ra hoặc quá giờ được giữ để đối soát. | Mới |
| LX-16 | Hủy hợp đồng trước vào ở trả phòng trống nhưng không khôi phục lịch/đề nghị đã đóng và không tự mời lại. Người thuê chủ động gửi đề nghị mới; các lịch sử cũ vẫn hiển thị. | Mới |

Hiển thị lịch trong chat dùng liên kết `room_viewing_requests.conversation_id` đã có; không đổi cấu trúc CSDL. API cần trả lịch theo hội thoại có người dùng tham gia và kiểm tra đúng chủ trọ/người thuê. Thẻ lấy trạng thái hiện tại của lịch, không dùng một bản sao nội dung thông báo để suy ra kết quả mới nhất.

### 1.6. Lập hợp đồng, phiên bản và vào ở ban đầu

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| HD-01 | Thuê mới phải đi qua lịch `COMPLETED` và quyết định `AGREED`; không tạo thêm hợp đồng mở từ cùng lịch xem. | Có / Sửa |
| HD-02 | Khi lập hợp đồng, phòng chưa có hợp đồng còn hiệu lực; tổng đại diện và thành viên ban đầu không vượt sức chứa; ngày kết thúc không trước bắt đầu. | Sửa |
| HD-03 | Chủ trọ chọn mẫu đang bật, nhập thời hạn, giá, cọc, điều khoản và thành viên khác. Gửi cho đại diện ở trạng thái `PENDING_CONFIRMATION`, phòng được giữ. | Có |
| HD-04 | Thành viên ban đầu được tạo `PLANNED`; có thể chưa liên kết tài khoản. Người xem và đồng ý thuê là đại diện ban đầu của hợp đồng thuê mới. | Có |
| HD-05 | Đại diện có thể xác nhận nội dung hoặc yêu cầu sửa. Yêu cầu sửa hủy phiên bản chờ cũ, tạo phiên bản nháp tiếp theo; chủ trọ sửa rồi gửi lại. | Có |
| HD-06 | Xác nhận nội dung chỉ đưa hợp đồng sang `CONFIRMED`; chưa tự ghi nhận đã vào ở. | Có |
| HD-07 | Chủ trọ chọn một hoặc nhiều thành viên đã thực tế vào. Lần kích hoạt hợp đồng phải có đại diện; người chưa đến giữ `PLANNED` và có thể xác nhận sau. | Sửa |
| HD-08 | Ngày vào ở nằm trong thời hạn hợp đồng và không ở tương lai; kiểm tra sức chứa, trạng thái phiên bản và tài khoản đang ở nơi khác trước khi ghi. | Sửa |
| HD-09 | Một tài khoản không có hai lượt `ACTIVE`; người nhập giấy/chưa liên kết tài khoản vẫn có dòng cư trú riêng. | Có / Sửa |
| HD-10 | Có thể hủy thành viên dự kiến không đến ở, giải phóng chỗ. Không hủy riêng đại diện dự kiến; phải xử lý hợp đồng. | Sửa |
| HD-11 | Hợp đồng chưa vào ở ở `DRAFT/PENDING_CONFIRMATION/CONFIRMED` có thể hủy kèm lý do; hủy lượt dự kiến, yêu cầu thêm người và trả chỗ. | Sửa |
| HD-12 | Người từng có dòng thành viên vẫn thấy hợp đồng sau khi đổi đại diện; thao tác thuộc đại diện chỉ dành cho đại diện hiện tại. | Mới |
| HD-13 | SQL hỗ trợ `PAPER_IMPORT`; demo có dữ liệu mẫu nhập giấy nhưng chưa có luồng nhập hồ sơ giấy đầy đủ. | Có một phần |
| HD-14 | `sp_create_rental_contract` tạo hợp đồng, giữ phòng, đóng hoạt động xem phòng sắp tới và ghi thông báo trong cùng giao dịch. Thất bại ở bất kỳ bước nào rollback toàn bộ; hai phiên tranh cùng phòng chỉ tạo được một hợp đồng mở. | Mới |
| HD-15 | Form lập hợp đồng hiển thị số lịch xem sắp tới/đề nghị chờ sẽ bị ảnh hưởng trước khi gửi; khi submit kiểm tra lại quyền, phòng, hợp đồng và sức chứa. Không giữ phòng chỉ bằng việc mở form hoặc bấm đồng ý thuê. | Mới |

### 1.7. Người ở và duyệt thêm người

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| NO-01 | Người ở và CSV lấy theo dòng thành viên `ACTIVE`, không lọc mất người chỉ vì hợp đồng đóng sai. Dữ liệu mâu thuẫn được đánh dấu đối soát. | Sửa |
| NO-02 | Màn hình hiển thị cả người dự kiến, người đang ở, lịch sử đã rời/hủy dự kiến và lịch sử yêu cầu thêm người. | Sửa |
| NO-03 | Yêu cầu thêm người phải có đồng ý thuê chung riêng của đại diện hiện tại và người xin vào trước khi chủ trọ duyệt. Chấp nhận kết nối ở ghép không cung cấp hai đồng ý này. Dữ liệu mẫu thể hiện bằng cờ đồng ý; SQL có người/thời điểm đồng ý riêng. | Có một phần |
| NO-04 | Duyệt chỉ khi hợp đồng `ACTIVE`, đại diện đang ở, trong thời hạn hợp đồng, ngày dự kiến không sau ngày hết hạn và còn chỗ. | Sửa |
| NO-05 | Khi duyệt phải tính cả chỗ dự kiến và chỗ đã giữ; chặn người đã có lượt ở hoặc yêu cầu trùng đang mở. | Sửa |
| NO-06 | `APPROVED` giữ một chỗ trong 48 giờ; được hủy giữ chỗ; hết hạn chuyển `EXPIRED`. 48 giờ là chính sách demo. | Sửa |
| NO-07 | Hoàn tất vào ở kiểm tra lại hợp đồng, thời hạn, ngày dự kiến, người đại diện, hạn giữ chỗ, sức chứa và tài khoản. Duyệt trước đó không bảo đảm còn được vào. | Sửa |
| NO-08 | Hoàn tất tạo một lượt ở, gắn `joinRequestId` và `completedRoomTenantId` hai chiều; bấm lặp không tạo thêm người. | Sửa |
| NO-09 | Thành viên thường rời chỉ đóng lượt của chính người đó, lưu ngày/người/thời điểm xác nhận. Người cuối cùng rời thì kết thúc hợp đồng và hủy yêu cầu mở. | Sửa |
| NO-10 | Đại diện rời mà còn người ở lại thì dùng luồng bàn giao tại mục 3; giữ hợp đồng và lượt ở của người còn lại. | Mới |

### 1.8. Gia hạn, kết thúc và đổi phòng

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| DC-01 | Đại diện hiện tại gửi đề nghị `RENEWAL`, `TERMINATION` hoặc `TRANSFER` khi hợp đồng đang hoạt động. Một hợp đồng chỉ có một yêu cầu điều chỉnh mở. | Có / Sửa |
| DC-02 | Luồng: chủ trọ duyệt → đại diện xác nhận phương án → chủ trọ áp dụng; có từ chối. Chưa đến ngày hiệu lực thì không áp dụng. | Có |
| DC-03 | Ngày hiệu lực không trước ngày bắt đầu hợp đồng hoặc ngày vào ở của thành viên đang ở. | Sửa |
| DC-04 | Gia hạn demo cộng thêm một năm vào ngày kết thúc và tăng phiên bản; chưa có trình soạn phương án gia hạn/giá phức tạp. | Có một phần |
| DC-05 | Kết thúc đóng từng lượt đang ở với ngày ra theo ngày hiệu lực, hủy lượt dự kiến và yêu cầu thêm người. | Sửa |
| DC-06 | Đổi phòng chỉ tới phòng khác còn trống, cùng chủ, không có hợp đồng mở hoặc chỗ đang chiếm, đủ cho toàn bộ thành viên còn mở. | Sửa |
| DC-07 | Kiểm tra toàn bộ trước khi đóng nguồn; tạo hợp đồng `TRANSFER` và lượt dự kiến mới cho tất cả người đang ở/dự kiến. Không mang người đã rời hoặc thông tin xác nhận cũ sang. | Sửa |
| DC-08 | Giữ `previousContractId` và `resultContractId`; lưu ngày ra ở nguồn; phòng nguồn trả trống, phòng đích giữ chỗ, tiếp tục xác nhận vào ở từng người/nhóm. | Sửa |
| DC-09 | Khi đổi đại diện, hủy yêu cầu điều chỉnh còn mở để không tiếp tục dùng xác nhận của người cũ. | Mới |

### 1.9. Dịch vụ, hóa đơn và thanh toán

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| DV-01 | Dịch vụ theo nhà có tên, đơn vị, giá và cách tính `METERED/PER_PERSON/PER_ROOM`; tên không trùng trong một nhà. | Có |
| DV-02 | Phòng có giá riêng; để trống thì kế thừa giá nhà. Chỉ dịch vụ bật ở cả nhà và phòng được áp dụng cho kỳ mới. | Có |
| DV-03 | Ngừng dịch vụ không sửa các dòng tiền đã lưu trên hóa đơn cũ. | Có |
| TT-01 | Lập hóa đơn cho hợp đồng `ACTIVE`; một kỳ của hợp đồng không có hai hóa đơn chưa hủy. Hóa đơn mới bắt đầu `DRAFT`. | Có |
| TT-02 | Hóa đơn gồm tiền thuê, điện/nước/dịch vụ, khoản khác và giảm trừ; dịch vụ theo người dùng số người `ACTIVE` tại lúc lập. | Có |
| TT-03 | Điện/nước lấy chỉ số cuối trừ đầu, không cho chỉ số cuối nhỏ hơn đầu. Theo phòng tính một đơn vị; theo người tính số người đang ở. | Có |
| TT-04 | Lưu số lượng/đơn giá/phương pháp/chỉ số vào từng dòng tiền; tổng sau giảm trừ không âm. | Có |
| TT-05 | Bản nháp được sửa; phát hành sang `UNPAID` khi có dòng tiền. UI chỉ cho thu/hủy hóa đơn đã phát hành, không đưa nút sửa nội dung. | Có |
| TT-06 | Thu tiền chuyển `PAID`; hủy có lý do, giữ lịch sử. Demo chưa có thanh toán trực tuyến hoặc thu một phần. | Có |
| TT-07 | SQL có `OVERDUE`, snapshot người trả và phiên bản hợp đồng, hóa đơn thay thế và trigger bất biến; wireframe chưa mô phỏng đầy đủ các trường/tác vụ này. | Thiết kế |
| TT-08 | Đổi đại diện không sửa người trả hoặc dữ liệu hóa đơn đã lập. Hóa đơn mới chọn đại diện hiện tại; người trả cũ vẫn thấy hóa đơn của mình. | Mới |

### 1.10. Ở ghép và kết nối

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| OG-01 | Người thuê khai khu vực, ngân sách, thói quen và ngày sẵn sàng; ngân sách tối đa không nhỏ hơn tối thiểu. | Có |
| OG-02 | Mỗi cặp người chỉ có một lời mời đang chờ hoặc kết nối chưa kết thúc, bất kể chiều gửi. Người nhận chấp nhận hoặc từ chối; gửi lời mời ngược chiều không tự chấp nhận. | Sửa |
| OG-03 | Chấp nhận lời mời chỉ ghi nhận kết nối và chuyển ngay sang màn hình tin nhắn đúng người. Có thể mở lại bằng nút “Nhắn tin”; bấm lại không tạo cuộc chat trùng. | Sửa |
| OG-04 | Cả `SEARCH_TOGETHER`, `JOIN_SYSTEM_ROOM` và ngữ cảnh khác đều không tự tạo yêu cầu thuê, giữ chỗ, lượt ở hoặc đồng thuận thuê chung khi chấp nhận kết nối. Thuê chung là quy trình riêng sau khi trao đổi; màn hình kết nối hiện chưa có form tạo yêu cầu thuê mới. | Sửa |
| OG-05 | Người từng là đại diện vẫn có thể kết nối và nhắn tin sau khi rời phòng. Khi thực sự đề nghị vào ở, phải thu đồng ý riêng của đại diện hiện tại; lời mời của đại diện cũ không thay thế đồng ý này. | Sửa |
| OG-06 | Danh sách “người phù hợp” trong demo là dữ liệu mẫu; chưa có thuật toán ghép cặp. SQL có hồ sơ/thói quen và các tình trạng chỗ ở, UI mới mô phỏng một phần. | Thiết kế |
| OG-07 | Trong danh sách lời mời có “Xem hồ sơ”: tên, khu vực, ngân sách, thói quen, ngày sẵn sàng và tình trạng chỗ ở được chia sẻ. Không hiển thị căn cước hoặc ngày sinh từ hồ sơ cư trú. Có thể chấp nhận/từ chối ngay trong hộp hồ sơ. | Mới |
| OG-08 | Có danh sách lời mời nhận và đã gửi, trạng thái chờ/đã kết nối/từ chối/hủy. Hồ sơ và cuộc chat đã kết nối có thể mở lại từ danh sách. | Mới |

#### Kết nối, trò chuyện và CSDL

Luồng hiện tại: **gửi lời mời → xem hồ sơ → chấp nhận kết nối → mở chat → trao đổi → quyết định thuê chung riêng**. Phòng đầy, hợp đồng đã kết thúc hoặc người gửi đã rời phòng không ngăn việc kết nối với người đó. Các điều kiện hợp đồng, sức chứa và đại diện chỉ áp dụng khi tạo/duyệt yêu cầu vào ở thực sự.

Không cần đổi cấu trúc SQL cho luồng kết nối này: đã có `roommate_requests`, `conversations.type = 'ROOMMATE'`, `conversation_participants` và `chat_messages`. `roommate_requests.scenario`/`target_contract_id` chỉ thể hiện ngữ cảnh giới thiệu; `status = 'ACCEPTED'` biểu thị đồng ý kết nối, không phải đồng ý thuê. `occupant_join_requests` vẫn tách riêng và phải có bằng chứng đồng ý thuê của hai bên.

Khi triển khai API, trong một giao dịch phải khóa và kiểm tra lời mời, xác nhận người nhận đang đăng nhập, cập nhật `ACCEPTED`/`responded_at`, tạo hoặc lấy lại conversation theo unique `roommate_request_id`, rồi thêm đúng hai người vào `conversation_participants`. Kiểm tra thành viên và trạng thái kết nối khi gửi tin. Không tự chép trạng thái chấp nhận lời mời sang các cột đồng thuận thuê. Wireframe chỉ mô phỏng giao dịch này trong `localStorage`, chưa có API chat thật.

### 1.11. Đánh giá, báo cáo, quản trị và thông báo

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| QT-01 | Người thuê gửi báo cáo tin; quản trị lưu kết luận và nhật ký xử lý. | Có |
| QT-02 | Có đánh giá sao/nhận xét gắn lượt thuê; demo chống đánh giá trùng theo hợp đồng. SQL gắn bằng chứng tới lượt cư trú; UI chưa kiểm tra đầy đủ điều kiện thời điểm đánh giá. | Có một phần |
| QT-03 | Mẫu hợp đồng có số phiên bản; tạo cùng tên tăng phiên bản, có bật/ngừng, giữ mẫu cũ. | Có |
| QT-04 | Ghi nhật ký quyết định duyệt/từ chối tin, hồ sơ, khóa/mở tài khoản và xử lý báo cáo. Demo hiện cho tạo mẫu và xử lý dữ liệu qua vai trò quản trị. | Có |
| QT-05 | Thông báo theo người dùng, có chưa đọc/đã đọc. Gửi hợp đồng, bàn giao đại diện, phản hồi đề nghị và tự hủy lịch/đóng đề nghị do giữ phòng đều phát sinh thông báo. Người thuê nhận kết quả cho lịch/đề nghị của mình; chủ trọ nhận tổng số đã xử lý. | Có / Mới |
| QT-06 | Thông báo demo nằm trong `localStorage`, không gửi email, SMS hoặc push thực. | Có |

### 1.12. Dữ liệu, kiểm tra và giới hạn

| Mã | Quy tắc / hành vi | Tình trạng |
| --- | --- | --- |
| DL-01 | Dữ liệu lưu trong trình duyệt bằng một khóa `localStorage`; tải lại giữ thao tác. `__troday.reset()` trả về dữ liệu mẫu. | Có |
| DL-02 | Dữ liệu cũ mâu thuẫn được giữ để đối soát; không tự suy đoán ngày ra, thời điểm bắt đầu đại diện hoặc tự mở lại hợp đồng. | Sửa / Mới |
| DL-03 | Kiểm tra giao diện không thay thế xác thực, phân quyền và giao dịch máy chủ. Chưa đồng bộ nhiều tab, nhiều thiết bị hoặc hai yêu cầu duyệt đồng thời. | Thiết kế |
| DL-04 | Một số điều kiện số tiền, độ dài, định dạng đang dựa trên thuộc tính form HTML; backend phải kiểm tra lại mọi đầu vào và quyền. | Thiết kế |

## 2. Các lỗi đã sửa và ảnh hưởng tới cấu trúc dữ liệu

| Nghiệp vụ | Hành vi sau sửa | V5 hiện có | Cần thêm bảng/cột? |
| --- | --- | --- | --- |
| Đặt lịch sai thời gian | Dùng giờ Việt Nam UTC+7, gợi ý giờ tương lai, chặn giờ quá khứ trong hôm nay, chọn thời lượng 30–120 phút, kiểm tra giao nhau theo khoảng bắt đầu/kết thúc thực tế. Xác nhận đã xem từ giờ bắt đầu; ghi nhận không đến từ giờ kết thúc. | `room_viewing_requests.starts_at`, `ends_at`; SQL đặt session UTC. | Không. API cần đổi giờ Việt Nam sang UTC khi ghi và đổi lại khi hiển thị; `DATETIME` tự nó không lưu múi giờ. |
| Mai là đại diện P305 rời khi Ngọc còn ở | Mở hộp bàn giao; còn một người đủ điều kiện thì chọn sẵn, còn nhiều người thì chọn; xác nhận đồng thuận rồi cho Mai rời và Ngọc tiếp nhận. Giữ hợp đồng/phòng đang ở, lưu lịch sử đại diện. | Đã có `initial_representative_room_tenant_id`, bảng lịch sử và `sp_handover_representative`. | Đã sửa schema, FK và trigger; đã có migration. Chưa chạy lên CSDL hiện có của người dùng. |
| Phòng 3 người, có 2 người vẫn duyệt thêm 2 | Tính cả người đang ở, thành viên dự kiến trên hợp đồng mở và yêu cầu đã duyệt còn hạn. Duyệt giữ một chỗ trong 48 giờ, có hủy/hết hạn. Chặn giảm sức chứa xuống dưới tổng đã cam kết. | `rooms.max_occupants`, `room_tenants.status`, `occupant_join_requests.status`, `hold_expires_at`. | Không. 48 giờ là chính sách mô phỏng, có thể cấu hình ở backend. |
| Yêu cầu đã duyệt vẫn vào ở sau khi hợp đồng kết thúc | Kiểm tra lại trạng thái hợp đồng, đại diện đang ở, thời hạn hợp đồng, ngày dự kiến, hạn giữ chỗ, tài khoản và sức chứa tại lúc hoàn tất. Đóng hợp đồng sẽ hủy các yêu cầu còn mở. | `contracts.status`, `start_date`, `end_date`; `occupant_join_requests` có `CANCELLED`, `EXPIRED`, thông tin hoàn tất. | Không. Cần kiểm tra liên bảng trong giao dịch backend. |
| Thành viên ban đầu kẹt ở dự kiến | Hộp xác nhận cho chọn một hoặc nhiều người đã thực tế vào. Khi kích hoạt phải chọn đại diện; người đến sau vẫn có thể được xác nhận từ Người ở hoặc Hợp đồng. Có hủy thành viên dự kiến không đến ở. | Mỗi người là một dòng `room_tenants`, có `PLANNED/ACTIVE/CANCELLED`, ngày dự kiến và thông tin xác nhận. | Không. Không nên tự kích hoạt người chưa đến. |
| Đổi phòng làm mất người và ngày ra | Kiểm tra phòng đích cùng chủ và đủ chỗ trước khi sửa dữ liệu. Đóng từng lượt đang ở kèm ngày ra/người/thời điểm xác nhận; hủy lượt dự kiến cũ; tạo lượt dự kiến mới cho toàn bộ thành viên còn mở, không mang lịch sử xác nhận của phòng cũ sang. Giữ liên kết hợp đồng trước/kết quả. | `source = TRANSFER`, `previous_contract_id`, `contract_change_requests.result_contract_id`, `room_tenants.move_out_date`, `move_out_confirmed_*`, `intake_source = TRANSFER`. | Không. Tất cả bước phải commit/rollback cùng nhau. |
| Thiếu hủy lịch, không đến, rút ý định | Bổ sung thao tác và nhãn trạng thái. Lưu lý do, người và thời điểm hủy. Chỉ rút từ `AGREED`; nếu còn hợp đồng mở thì phải hủy/kết thúc hợp đồng trước. Bổ sung hủy hợp đồng chưa vào ở để thực hiện được luồng này. | `CANCELLED`, `NO_SHOW`, `rental_decision = WITHDRAWN`, `cancelled_*`, `rental_decided_*`, `rental_withdrawn_at`; trigger `trg_viewings_before_update`. | Không. Các trạng thái và trường đã có sẵn. |

## 3. Quy tắc bàn giao và lịch sử đại diện

Yêu cầu mới thay thế quy tắc tạm thời “chặn đại diện rời nếu còn người”. **Có quản lý lịch sử đại diện theo từng hợp đồng**. Chỉ lưu `representative_room_tenant_id` hiện tại sẽ mất thông tin ai đại diện trước đó, ai chuyển giao và lúc nào.

### 3.1. Luồng đang chạy trong wireframe

1. Chủ trọ bấm “Xác nhận rời” ở người đại diện đang ở trên hợp đồng `ACTIVE`.
2. Lấy người còn lại trong **chính hợp đồng**, đang `ACTIVE`, đã có tài khoản và không bị khóa. Không chọn người chưa vào ở, đã rời hoặc thuộc hợp đồng khác dù cùng một phòng trong lịch sử.
3. Có đúng một người đủ điều kiện: chọn sẵn. Có nhiều người: bắt buộc chọn một. Đây là tự gợi ý, chỉ ghi thay đổi khi chủ trọ xác nhận.
4. Chủ trọ nhập lý do và xác nhận đã có sự đồng ý của người tiếp nhận. Trong demo đây là **chủ trọ ghi nhận đồng thuận**, chưa phải người tiếp nhận đăng nhập xác nhận bằng tài khoản của họ.
5. Khi gửi form, kiểm tra lại quyền, trạng thái hợp đồng, đại diện cũ và người tiếp nhận. Dữ liệu đã đổi hoặc gửi lặp thì không bàn giao lần nữa.
6. Cùng một thao tác: đóng giai đoạn đại diện cũ; ghi ngày ra của người cũ; đổi đại diện hiện tại; mở giai đoạn mới; giữ nguyên các lượt đang ở của người còn lại. Hợp đồng vẫn `ACTIVE`, phòng vẫn `OCCUPIED`.
7. Hủy các yêu cầu thêm người và điều chỉnh hợp đồng còn mở để không dùng tiếp đồng thuận của đại diện cũ. Cần tạo lại yêu cầu với người đại diện mới. Không sửa yêu cầu đã hoàn tất và không chuyển nghĩa vụ hóa đơn cũ chỉ bằng đổi đại diện.
8. Tạo thông báo trong ứng dụng cho đại diện cũ/mới. Xem lịch sử bằng nút **“Lịch sử đại diện”** trên màn hình Hợp đồng.

Không có người đủ điều kiện nhưng vẫn còn người dự kiến/chưa liên kết tài khoản thì hướng dẫn hoàn tất thông tin/vào ở trước, chưa đóng đại diện hiện tại. Không còn bất kỳ thành viên đang ở/dự kiến thì kết thúc hợp đồng theo luồng người cuối cùng rời.

### 3.2. Thông tin lịch sử cần giữ

| Thông tin | Mục đích |
| --- | --- |
| Hợp đồng, lượt cư trú của đại diện | Bảo đảm người đại diện thuộc đúng hợp đồng/phòng. |
| Tài khoản và tên tại lúc nhận đại diện | Giữ thông tin lịch sử khi hồ sơ hiển thị về sau thay đổi. |
| Bắt đầu, kết thúc giai đoạn | Truy ra ai đại diện tại một thời điểm; kết thúc giai đoạn trước trùng thời điểm bắt đầu giai đoạn mới. |
| Người đại diện trước đó, người ghi nhận | Truy vết chuỗi bàn giao và người thực hiện. |
| Lý do, thời điểm ghi nhận | Phân biệt diễn biến nghiệp vụ và thời điểm ghi dữ liệu. |
| Người/thời điểm ghi nhận đồng thuận, bằng chứng hoặc xác nhận tài khoản ở backend | Tránh coi lựa chọn tự động là người tiếp nhận đã tự đồng ý. |

Trong demo, mỗi hợp đồng có `representativeHistory`, các giai đoạn đóng có `ended/toAt`, giai đoạn hiện tại còn mở. Bàn giao chỉ đóng giai đoạn trước và thêm giai đoạn mới, không ghi đè nội dung bàn giao cũ. Kết thúc/đổi phòng đóng giai đoạn hiện tại. Hợp đồng đích khi chuyển phòng có lịch sử riêng và liên kết về hợp đồng nguồn.

Dữ liệu cũ chỉ biết người đại diện hiện tại sẽ có một bản ghi gốc với thời điểm bắt đầu **chưa rõ**; không tự gán ngày bắt đầu hợp đồng làm ngày nhận đại diện. Lịch sử từ lúc bật chức năng được lưu và vẫn có sau tải lại trang.

### 3.3. Những dữ liệu được giữ nguyên khi bàn giao

- Giữ ID/số hợp đồng, thời hạn, giá, cọc và phòng hiện tại.
- Giữ người xem/đồng ý thuê ban đầu trong `viewingTenantId` và lịch xem gốc; `tenantId` trong JavaScript chỉ còn là tài khoản đại diện hiện tại, không dùng thay cho bằng chứng thuê ban đầu.
- Giữ phiên bản/nội dung đã xác nhận; không tự gán xác nhận cũ cho đại diện mới. Nếu quy trình thực tế yêu cầu phụ lục, cần bổ sung bước xác nhận phụ lục tương ứng.
- Giữ người trả và snapshot hóa đơn cũ; hóa đơn mới lấy đại diện mới. Người từng là thành viên vẫn xem được hợp đồng, nhưng không còn thao tác đại diện.

## 4. Ảnh hưởng CSDL v5 của yêu cầu đổi đại diện

Các sửa lịch xem, sức chứa, vào/ra, đổi phòng tận dụng phần lớn các trường v5 và được bổ sung view/trigger/stored procedure. Đổi đại diện trên cùng hợp đồng đã được hỗ trợ bằng bảng lịch sử riêng và tách đại diện ban đầu khỏi đại diện hiện tại. Các thay đổi dưới đây có trong cả SQL tạo mới và migration.

### 4.1. Tách người thuê ban đầu khỏi đại diện hiện tại

`contracts.viewing_tenant_id` tiếp tục chỉ người đã xem và đồng ý thuê. Cột mới `initial_representative_room_tenant_id` giữ đại diện ban đầu; `representative_room_tenant_id` chỉ đại diện hiện tại, có thể đổi sang người khác cùng hợp đồng.

FK cũ `fk_contract_viewing_representative` đã thay bằng `fk_contract_initial_representative` và `fk_contract_viewing_initial_rep`: đại diện ban đầu thuộc đúng hợp đồng và, với thuê mới, trùng người đã đồng ý thuê. Con trỏ đại diện hiện tại vẫn có FK tới thành viên của cùng hợp đồng. Trigger điền đại diện ban đầu khi gắn đại diện lần đầu và chặn sửa trường này về sau. Bàn giao không đổi lịch xem hay bằng chứng thuê ban đầu.

### 4.2. Điều chỉnh kiểm tra đại diện trong trigger

Trigger cũ yêu cầu `move_in_confirmed_at <= activated_at` cho mọi lần cập nhật hợp đồng `ACTIVE`, khiến người vào sau ngày kích hoạt không thể tiếp nhận đại diện. Điều kiện này đã được sửa.

Trigger mới tách **kích hoạt ban đầu** và **bàn giao sau kích hoạt**: lúc kích hoạt, đại diện đã được xác nhận vào ở trước thời điểm kích hoạt; lúc bàn giao, đại diện mới đang ở, đúng hợp đồng, đã xác nhận vào ở và có bản ghi bàn giao hiện tại tương ứng. Không cho đổi `activated_at` ban đầu trong lúc bàn giao. Thủ tục đổi đại diện, ghi lịch sử, cho người cũ rời, hủy yêu cầu mở và ghi thông báo trong cùng giao dịch.

### 4.3. Phương án lưu lịch sử đã áp dụng

Đã chọn bảng `contract_representative_history` làm nguồn lịch sử nghiệp vụ chính, phù hợp luồng bàn giao nhanh trong wireframe. Hai cách thiết kế được đối chiếu như sau:

| Cách | Khi áp dụng | Việc cần làm |
| --- | --- | --- |
| Dùng `contract_revisions` | Mỗi lần đổi đại diện bắt buộc là một phiên bản/phụ lục được xác nhận. | V5 đã có đại diện theo phiên bản, `effective_from`, `applied_at`, người tạo và xác nhận. Bổ sung loại `REPRESENTATIVE_CHANGE` vào CHECK `kind`, quy trình tạo/xác nhận/áp dụng phiên bản và quy tắc suy ra giai đoạn đại diện theo các phiên bản đã áp dụng. Không coi bản nháp/chờ xác nhận là đã đổi đại diện. |
| `contract_representative_history` — đã áp dụng | Bàn giao là sự kiện riêng, không bắt buộc tạo lại phiên bản nội dung hợp đồng. | Lưu hợp đồng, lượt đại diện, tên snapshot, người trước, bắt đầu/kết thúc, người xử lý, lý do và đồng thuận. FK kép bảo đảm cùng hợp đồng; unique bảo đảm tối đa một giai đoạn hiện tại; trigger chỉ cho đóng giai đoạn hiện tại và chặn xóa/ghi đè lịch sử. |

Wireframe mô phỏng bảng này bằng `representativeHistory`. SQL đã tăng từ 39 lên 40 bảng, giữ nguyên các phiên bản và hóa đơn đã xác nhận/phát hành. Migration tạo bản ghi `LEGACY_BASELINE` cho đại diện đang biết, để thời điểm bắt đầu và thông tin đồng thuận cũ chưa rõ ở `NULL/LEGACY_UNKNOWN`; không tự lấy ngày bắt đầu hợp đồng thay thế. Migration đã được tạo và thử trên instance riêng, chưa chạy vào CSDL hiện có của người dùng.

Không chỉ ghi vào nhật ký quản trị: lịch sử đại diện là dữ liệu nghiệp vụ cần truy vấn được theo hợp đồng và thời điểm. Dữ liệu cũ chưa có bằng chứng về thời điểm bắt đầu phải cho phép đánh dấu bản ghi gốc chưa rõ thời điểm.

### 4.4. Xác nhận và giao dịch ở backend

Backend cần xác định cách thu đồng thuận thực tế: người tiếp nhận đăng nhập chấp nhận, hoặc chủ trọ ghi nhận thỏa thuận kèm bằng chứng theo quy trình sản phẩm. Demo hiện lưu `consentRecordedBy/consentRecordedAt`; không được ánh xạ hai trường đó thành “người thuê đã tự xác nhận bằng tài khoản” trong SQL.

Khóa hợp đồng, phòng và các lượt liên quan; đọc lại đại diện/các giai đoạn đang mở; kiểm tra người tiếp nhận; đóng/mở lịch sử; ghi người cũ rời; cập nhật đại diện; hủy các yêu cầu cũ; ghi sự kiện thông báo trong cùng giao dịch. Giao dịch thất bại thì giữ toàn bộ trạng thái trước bàn giao. Nếu dùng phiên bản/phụ lục thì chỉ thực hiện bước áp dụng khi đã đủ xác nhận.

### 4.5. Những thay đổi cấu trúc và dữ liệu dẫn xuất khác

- `contracts.live_room_id` nay tính cả `DRAFT`: một phòng chỉ có một hợp đồng mở, kể cả bản nháp. Migration kiểm tra các bản nháp trùng phòng trước khi tăng ràng buộc unique.
- Thêm thông tin hủy vào `contract_change_requests` (`cancelled_at`, `cancelled_by_id`, `cancellation_reason`) và thêm người/lý do hủy vào `occupant_join_requests`. Các trường mới có FK tới người dùng; lịch sử cũ thiếu người hủy không bị gán giả.
- `v5_room_capacity_usage` tổng hợp người đang ở, người dự kiến trên hợp đồng mở và yêu cầu giữ chỗ còn hạn. Không đếm hai lần yêu cầu đã có lượt cư trú mở; chỗ hết hạn không chiếm sức chứa dù chưa được tác vụ nền chuyển trạng thái.
- `v5_current_residents` lấy mọi lượt `ACTIVE` và có cờ `needs_reconciliation`, không làm mất người khi hợp đồng bị đóng sai. `v5_representative_timeline` phục vụ truy vấn lịch sử đại diện theo hợp đồng/phòng/chủ trọ.
- Trigger bổ sung kiểm tra chuyển trạng thái, chống vào ở trên hợp đồng đóng, chống giảm sức chứa dưới số chỗ đã cam kết, kiểm tra giờ xem và rút ý định khi còn hợp đồng mở.

### 4.6. Các thủ tục giao dịch để API tích hợp

Các thủ tục công khai dưới đây tự mở giao dịch `READ COMMITTED`, khóa phòng trước khi kiểm tra và ghi, tự commit hoặc rollback khi có lỗi. Không gọi chúng bên trong giao dịch đang mở của ứng dụng; thủ tục từ chối trước khi ảnh hưởng giao dịch của bên gọi. Các helper `_v5_*` chỉ phục vụ nội bộ và không tự quản lý giao dịch.

| Thủ tục | Công việc |
| --- | --- |
| `sp_schedule_viewing` | Chủ trọ tạo lịch sau tin nhắn người thuê về đúng phòng; nhận giờ UTC và thời lượng 30/60/90/120 phút, kiểm tra phòng/trùng giờ, trả ID lịch qua OUT. |
| `sp_request_viewing` | Người thuê gửi đề nghị, chống gửi trùng, trả ID đề nghị qua OUT; chưa tạo lịch chính thức. |
| `sp_review_viewing_proposal` | Chủ trọ chấp nhận/từ chối; chấp nhận tạo và liên kết lịch trong cùng giao dịch, trả ID lịch qua OUT. |
| `sp_withdraw_viewing_proposal` | Người thuê rút đề nghị đang chờ; lưu người và thời điểm rút. |
| `sp_set_viewing_outcome` | Xử lý `ATTENDED`, `NO_SHOW`, `CANCEL`, `AGREE`, `DECLINE`, `WITHDRAW`, kiểm tra đúng chủ trọ/người thuê và thời điểm được phép. |
| `sp_create_rental_contract` | Tạo đại diện/thành viên dự kiến, phiên bản đầu và gửi xác nhận; giữ phòng, hủy lịch sắp tới, đóng đề nghị chờ và ghi thông báo cùng giao dịch. Trả ID hợp đồng. |
| `sp_confirm_contract` | Đại diện hiện tại xác nhận phiên bản đang chờ, đưa hợp đồng sang `CONFIRMED`. |
| `sp_confirm_move_in` | Nhận mảng JSON các ID lượt cư trú và ngày thực tế ở Việt Nam; hỗ trợ nhóm/từng người, bắt buộc đại diện ở lần kích hoạt. |
| `sp_approve_occupant_join` | Khóa phòng/hợp đồng/yêu cầu, kiểm tra số chỗ còn lại và giữ chỗ 48 giờ. |
| `sp_complete_occupant_join` | Kiểm tra lại điều kiện, tạo lượt ở và gắn liên kết hai chiều tới yêu cầu trong cùng giao dịch. |
| `sp_cancel_join_hold` | Chủ trọ hủy giữ chỗ đã duyệt kèm lý do. |
| `sp_cancel_planned_member` | Hủy người dự kiến chưa vào ở; không hủy riêng đại diện. |
| `sp_handover_representative` | Bàn giao đại diện, ghi đồng thuận do chủ trọ xác nhận, lưu lịch sử và cho người cũ rời; giữ nguyên hợp đồng hiện tại. |
| `sp_move_out` | Thành viên thường rời hoặc người cuối cùng rời; đại diện còn người ở lại phải đi qua bàn giao. |
| `sp_cancel_contract` | Hủy hợp đồng chưa hoạt động/chưa có người thực tế vào ở, hủy người dự kiến và yêu cầu mở. |
| `sp_apply_contract_change` | Áp dụng yêu cầu đã duyệt và được đại diện hiện tại xác nhận: gia hạn, kết thúc hoặc đổi phòng. Khóa hai phòng theo thứ tự ID khi đổi phòng. |
| `sp_set_room_capacity` | Chủ trọ đổi sức chứa sau khi kiểm tra cả người ở, người dự kiến và chỗ giữ. |

Chữ ký nằm trong ba nguồn SQL ở `database/source/`; phiên bản hiện tại của `sp_create_rental_contract` nằm trong `contract-viewing-cleanup.sql`, thay bản ban đầu khi tạo mới/nâng cấp. Có thể kiểm tra bằng `SHOW CREATE PROCEDURE`. Worker dùng riêng `sp_expire_viewing_proposals()` để cập nhật đề nghị quá giờ; không cấp thủ tục này cho người dùng cuối. Với `sp_create_rental_contract`, JSON thành viên phụ dùng `full_name`, `tenant_id` (tùy chọn), `identity_number` và `date_of_birth`; không gửi trực tiếp các khóa JavaScript của prototype.

Ví dụ cấu trúc lời gọi cho backend, với các ID thực tế do API tra cứu:

```sql
SET time_zone = '+00:00';
-- contract_id, departing_room_tenant_id, successor_room_tenant_id,
-- landlord_actor_id, reason, consent_recorded
CALL sp_handover_representative(1, 10, 11, 1, 'Mai rời, Ngọc nhận đại diện', TRUE);

-- contract_id, JSON array of room_tenant IDs, Vietnam actual date, landlord_actor_id
CALL sp_confirm_move_in(2, JSON_ARRAY(12, 13), '2026-10-24', 1);
```

Gia hạn cần `proposed_revision_id` đã xác nhận. Đổi phòng cần `proposal_snapshot` được các bên xác nhận, gồm `content` cho hợp đồng phòng đích và `end_date`; có thể chốt `rent_amount`, `deposit_amount`, nếu không thì dùng giá phòng đích. Thủ tục không tự coi nội dung hợp đồng phòng cũ là nội dung đã đồng ý cho phòng mới. `sp_apply_contract_change` chỉ nhận yêu cầu `READY_TO_APPLY` có phiên bản gốc và người xác nhận còn phù hợp; trả ID hợp đồng đích qua tham số OUT khi chuyển phòng.

### 4.7. Chạy bản tạo mới hoặc migration

1. Chưa có CSDL v5: chạy toàn bộ `database/schema.sql`. File tự tạo và chọn CSDL; nếu tên đó đã tồn tại thì dừng để tránh nhầm với nâng cấp.
2. Đã có v5 gốc 39 bảng: sao lưu, dừng ghi và chạy năm file trong `database/migrations/` theo thứ tự: `20261024_v5_workflows.sql` → `20261025_chat_post_sharing.sql` → `20261025_viewing_proposals.sql` → `20261025_contract_viewing_cleanup.sql` → `20261025_multiple_room_posts.sql`, mỗi file một lần. Đã nâng cấp một phần thì chỉ chạy các file còn thiếu theo thứ tự này. Đã có xử lý lịch/hợp đồng thì chỉ cần migration nhiều bài đăng. Không chạy migration trên CSDL vừa tạo bằng schema mới.
3. Preflight từ chối trường hợp phòng vượt sức chứa, hợp đồng đóng nhưng còn lượt ở mở, hợp đồng hoạt động không có đại diện đang ở, hoặc nhiều hợp đồng mở trên cùng phòng. Cần đối soát các hàng đó, không tự xóa người hoặc đoán ngày ra.
4. Nếu script báo đã nâng cấp/đang dở, không dùng `--force` hoặc chạy lại bỏ qua lỗi. DDL MySQL có implicit commit, nên lỗi sau một số lệnh DDL cần kiểm tra trạng thái và phục hồi/hoàn tất theo bản sao lưu. [Tài liệu MySQL về implicit commit](https://dev.mysql.com/doc/refman/8.0/en/implicit-commit.html).
5. Sau nâng cấp, API gọi các thủ tục đúng quyền; thiết lập múi giờ UTC cho mọi kết nối, còn ngày cư trú truyền vào là ngày Việt Nam. Các SQL trong `tests/fixtures/` chỉ phục vụ kiểm thử.

Các thao tác nhiều bảng dùng stored procedure để tránh giới hạn cập nhật bảng đang được câu lệnh gọi trigger sử dụng. [Giới hạn stored program và trigger của MySQL](https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html).

### 4.8. Chia sẻ tin phòng trong chat, cập nhật 25/10/2026

Nhãn “Chủ trọ”/“Bạn ghép”/“Người thuê” được suy ra từ loại hội thoại và quan hệ với phòng, không cần thêm cột nhãn vào tài khoản. Khi triển khai API, dùng loại `conversations` và chủ trọ của phòng tương ứng; nhãn UI không phải bằng chứng quyền.

Để lưu thẻ chia sẻ có cấu trúc, `chat_messages` đã bổ sung `shared_post_id` (FK tới `posts.id`) và loại `POST_SHARE` vào CHECK `message_type`. CHECK mới yêu cầu chỉ `POST_SHARE` được có `shared_post_id`, đồng thời bắt buộc tin loại này tham chiếu bài đăng. Không thêm bảng. TEXT/IMAGE/SYSTEM cũ giữ nguyên với `shared_post_id = NULL`. Migration ngày 25/10 kiểm tra thứ tự và từ chối chạy lại; chưa áp dụng lên CSDL hiện có của người dùng.

Ví dụ dữ liệu API: `{ "message_type": "POST_SHARE", "shared_post_id": 123, "content": "Bạn thấy phòng này thế nào?" }`. Prototype đã tách phòng và bài đăng: `sharedPostId` tham chiếu ID trong `state.posts`; backend ánh xạ sang **ID bài đăng** SQL, không chép ID phòng vào FK này. Không thay `conversations.room_id/post_id` của chat bạn ghép bằng phòng vừa chia sẻ: loại hội thoại vẫn là `ROOMMATE` và gắn lời mời kết nối.

API phải kiểm tra người gửi thuộc đúng hội thoại, kết nối đã chấp nhận/chưa kết thúc và bài đăng được phép chia sẻ, ghi người gửi từ phiên đăng nhập, dùng `client_message_key` chống gửi lặp. Các FK/CHECK chỉ bảo đảm cấu trúc và tham chiếu; chúng không thay kiểm tra quyền, trạng thái kết nối hoặc khả năng công khai của bài đăng ở API. Khi đọc thẻ, kiểm tra lại quyền xem và lấy nội dung hiện tại. Không dựa vào việc có FK để công khai tin đã ẩn; không dùng giá hiện tại trên thẻ làm giá đã chốt của hợp đồng. Tin đã được tham chiếu nên xử lý ẩn/lưu trữ thay vì xóa cứng bài đăng.

### 4.9. Hai luồng hẹn xem đã triển khai trong SQL và wireframe

**Phạm vi:** đã thêm bảng, thủ tục, migration và giao diện ngày 25/10/2026. Nguồn nằm ở `database/source/viewing-proposals.sql`, được build vào schema đầy đủ và `database/migrations/20261025_viewing_proposals.sql`. Chưa triển khai API hoặc chạy migration lên CSDL hiện có của người dùng.

**Hai cách tạo lịch:** người thuê gửi đề nghị → chủ trọ chấp nhận → tạo lịch; hoặc chủ trọ tự tạo lịch đã chốt sau khi trao đổi qua tin nhắn. Cả hai đều tạo bản ghi `room_viewing_requests` với `created_by_id` là chủ trọ; giữ FK chủ nhà và các trạng thái `SCHEDULED/COMPLETED/CANCELLED/NO_SHOW`. `AGREE` trong `sp_set_viewing_outcome` vẫn là quyết định thuê sau khi đã xem.

**Cấu trúc đã áp dụng:** bảng mới `room_viewing_proposals` lưu đề nghị của người thuê; `room_viewing_requests` lưu lịch chính thức. Số bảng tăng từ 40 lên 41; giữ nguyên lịch xem và liên kết hợp đồng cũ. Lịch chủ trọ tự tạo không cần bản ghi đề nghị giả.

| Trường | Kiểu / ý nghĩa |
| --- | --- |
| `id` | BIGINT, khóa chính |
| `room_id`, `house_id` | Phòng và nhà được đề nghị xem; FK kép tới `rooms(id, house_id)` |
| `conversation_id` | Hội thoại hỏi đúng phòng, FK kép `(conversation_id, room_id)` tới `conversations(id, room_id)`; không dùng chat `ROOMMATE` làm hội thoại chủ trọ |
| `tenant_id` | Người gửi, lấy từ tài khoản đăng nhập; FK tới `tenants`, đồng thời phải là thành viên của hội thoại |
| `landlord_id` | Chủ trọ nhận đề nghị, suy ra từ nhà; FK kép `(house_id, landlord_id)` tới `rental_houses(id, landlord_id)`, đồng thời là thành viên hội thoại |
| `client_request_key` | CHAR(36), khóa chống gửi lặp; unique theo `(tenant_id, client_request_key)` |
| `starts_at`, `ends_at` | DATETIME(6) theo UTC; hiển thị theo Việt Nam; `ends_at > starts_at` |
| `notes` | VARCHAR(2000), ghi chú của người thuê |
| `status` | VARCHAR(40): `PENDING`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `EXPIRED`; mặc định `PENDING` |
| `reviewed_by_id`, `reviewed_at`, `rejection_reason` | Người/thời điểm chủ trọ xét duyệt, lý do từ chối |
| `withdrawn_by_id`, `withdrawn_at` | Người/thời điểm rút đề nghị; chỉ người thuê gửi được rút khi còn `PENDING` |
| `expired_at` | Thời điểm hết hạn do không còn khả năng duyệt giờ tương lai |
| `scheduled_viewing_id` | NULL trước duyệt; FK kép gồm ID/phòng/người thuê tới `room_viewing_requests(id, room_id, tenant_id)`, unique để một lịch không được gắn cho nhiều đề nghị |
| `created_at`, `updated_at` | Thời điểm tạo/cập nhật phục vụ đối soát |

CHECK/FK đã ràng buộc trạng thái và bằng chứng: `ACCEPTED` bắt buộc có người/thời điểm duyệt và `scheduled_viewing_id`, các trạng thái khác không được gắn lịch; `REJECTED` bắt buộc có lý do; người duyệt phải đúng `landlord_id`; người rút phải đúng `tenant_id`. Unique qua cột sinh giới hạn một đề nghị `PENDING` mỗi người/phòng. Có các chỉ mục hàng đợi theo chủ trọ, người thuê và phòng/giờ. Trigger cấm sửa danh tính, giờ, ghi chú của đề nghị và cấm xóa lịch sử; trạng thái kết thúc không mở lại. Đổi giờ cần rút/gửi mới. Các kiểm tra quyền, tài khoản, tin công khai, phòng trống và thời gian nằm trong thủ tục/helper, không chỉ CHECK/FK.

**Trình tự trạng thái:** `PENDING → ACCEPTED / REJECTED / WITHDRAWN / EXPIRED`. Chủ trọ chỉ duyệt/từ chối; người thuê chỉ rút; tác vụ nền đánh dấu hết hạn khi giờ đề nghị đã đến. Một đề nghị đã chấp nhận giữ trạng thái `ACCEPTED` ngay cả khi lịch tương ứng bị hủy sau đó: quyết định duyệt là lịch sử, còn kết quả hẹn nằm ở lịch đã tạo.

**Duyệt và tạo lịch trong cùng giao dịch:** xác thực chủ trọ; khóa hàng phòng trước, sau đó khóa đề nghị theo cùng thứ tự với các thao tác lịch hiện tại. Đọc lại trạng thái `PENDING`, chủ trọ, hội thoại, phòng còn cho xem, hợp đồng/lượt ở hiện có, giờ còn ở tương lai và thời lượng 30/60/90/120 phút. Kiểm tra giao nhau với các lịch `SCHEDULED` của phòng tại thời điểm duyệt. Sau đó tạo đúng một `room_viewing_requests` với `created_by_id` là chủ trọ, gắn `scheduled_viewing_id`, cập nhật đề nghị thành `ACCEPTED` và ghi thông báo cho người thuê, rồi commit. Bất kỳ bước nào lỗi phải rollback toàn bộ; duyệt lặp cùng đề nghị trả lại lịch đã tạo, không tạo lịch thứ hai. Duyệt hai đề nghị trùng giờ đồng thời thì chỉ một được thành công; đề nghị còn lại vẫn chưa được duyệt và cần xử lý giờ khác.

Thủ tục duyệt và tạo lịch trực tiếp dùng helper `_v5_check_viewing_context` không tự commit; không gọi lồng public `sp_schedule_viewing`. Mỗi public procedure sở hữu một giao dịch, từ chối giao dịch lồng mà không commit/rollback nhầm giao dịch bên gọi. API gọi một procedure cho một thao tác, không tự ghi `ACCEPTED` rồi tạo lịch trong yêu cầu khác.

Các chữ ký procedure đã có trong SQL (tham số thời gian là UTC, ID actor lấy từ phiên đăng nhập):

| Procedure | Tham số theo thứ tự |
| --- | --- |
| `sp_request_viewing` | `conversation_id, room_id, actor_id, starts_at_utc, duration_minutes, notes, client_request_key, OUT proposal_id` |
| `sp_review_viewing_proposal` | `proposal_id, actor_id, action ('ACCEPT'/'REJECT'), reason, OUT viewing_id` |
| `sp_withdraw_viewing_proposal` | `proposal_id, actor_id` |
| `sp_expire_viewing_proposals` | Không tham số; chỉ cấp EXECUTE cho worker nội bộ, chạy định kỳ |
| `sp_schedule_viewing` | Giữ chữ ký cũ: `conversation_id, room_id, tenant_id, actor_id, starts_at_utc, duration_minutes, notes, OUT viewing_id` |

Khi gửi đã kiểm tra phòng/giờ hợp lệ và lịch đã chốt; vẫn kiểm tra lại khi duyệt. Hai tài khoản phải còn hoạt động, cùng tham gia hội thoại hỏi đúng phòng/tin đã duyệt và chưa rời/ẩn hội thoại. Tạo lịch trực tiếp cần có ít nhất một tin `TEXT/IMAGE` từ người thuê trong hội thoại phòng đó; tin hệ thống/chia sẻ bài không thay việc trao đổi. Đề nghị chờ không giữ khung giờ/chỗ thuê, nên nhiều người có thể đề nghị cùng khoảng giờ. Chấp nhận xem cũng chưa giữ chỗ thuê. Gửi lại cùng khóa và nội dung trả đề nghị cũ; cùng khóa với nội dung khác bị từ chối. Worker đánh dấu hết hạn; duyệt vẫn chặn giờ quá khứ trước khi worker chạy.

**Wireframe hiện tại:** có “Đề nghị lịch xem” ở chi tiết phòng, chat chủ trọ và màn hình Lịch xem. Từ tin bạn ghép chia sẻ, đề nghị mở đúng chat với chủ trọ, không đưa lịch vào chat bạn ghép. Gửi xong hiện thẻ chờ duyệt và nút rút; chủ trọ có chấp nhận/từ chối kèm lý do. Hai bên có thông báo và trạng thái chung ở chat/Lịch xem. Thẻ đề nghị giữ lịch sử, thẻ lịch chính thức chứa các thao tác hủy/đã xem/không đến/quyết định thuê. Luồng “Hẹn xem” của chủ trọ vẫn tạo trực tiếp. Prototype tự đánh dấu đề nghị hết hạn khi render; SQL dùng worker. API cần ánh xạ ngữ cảnh phòng của chat gộp UI sang đúng `conversation_id`/`room_id` SQL, theo giới hạn ở HT-06.

Kiểm thử JavaScript, Chrome và MySQL bao phủ luồng mới; chi tiết ở mục 8. CSDL thật vẫn cần migration và API trước khi dùng tính năng ngoài prototype.

### 4.10. Nhiều lịch xem cùng phòng và xử lý khi chốt hợp đồng

Các quy tắc dưới đây đã được triển khai trong wireframe và SQL. Mô hình hiện tại là thuê nguyên phòng với tối đa một hợp đồng mở, không phải đặt từng giường hoặc xếp lịch các đợt thuê tương lai.

Một phòng được có nhiều lịch xem khác khung giờ. Hai lịch `SCHEDULED` không được giao nhau; các đề nghị chờ có thể cùng giờ vì chưa giữ giờ. Khóa phòng bảo đảm hai phiên duyệt đề nghị trùng giờ chỉ tạo được một lịch. Lịch xem không tạo quyền ưu tiên thuê; không tự chọn người gửi đề nghị hoặc bấm đồng ý thuê đầu tiên.

| Mốc | Trạng thái phòng | Xử lý lịch/đề nghị khác |
| --- | --- | --- |
| Người thuê đã xem và bấm “Đồng ý thuê” | `AVAILABLE` nếu chưa có hợp đồng mở/người ở | Giữ nguyên lịch và đề nghị khác; `AGREED` chỉ ghi nhận mong muốn |
| Chủ trọ gửi hợp đồng qua `sp_create_rental_contract` | `RESERVED`, hợp đồng `PENDING_CONFIRMATION` | Hủy lịch sắp tới và đóng đề nghị chờ của đúng phòng, thông báo người liên quan |
| Người thuê xác nhận hợp đồng | `RESERVED`, hợp đồng `CONFIRMED` | Tiếp tục chặn lịch mới; chưa ghi nhận đã vào ở |
| Chủ trọ xác nhận thực tế vào ở | `OCCUPIED`, hợp đồng `ACTIVE` | Quản lý người ở theo hợp đồng; không nhận lịch thuê nguyên phòng |
| Hủy hợp đồng trước khi vào ở | `AVAILABLE` nếu không còn người/hợp đồng mở | Nhận đề nghị/lịch mới; không tự khôi phục lịch/đề nghị đã đóng |

Gửi hợp đồng thực hiện trong một giao dịch `READ COMMITTED`: khóa phòng trước, khóa lịch xem được chọn; kiểm tra đúng chủ trọ còn hoạt động, lịch đã xem/đồng ý thuê, phòng trống, chưa có hợp đồng mở, điều khoản và sức chứa; tạo hợp đồng/thành viên/phiên bản; gửi xác nhận và giữ phòng. Sau đó gọi helper nội bộ `_v5_close_viewings_for_contract` và commit. Helper không tự mở hoặc commit giao dịch, không gọi lồng public procedure.

Helper chỉ xử lý đúng `room_id` của hợp đồng vừa gửi:

- Lịch `SCHEDULED` có `starts_at >= thời điểm xử lý` chuyển `CANCELLED`, ghi `cancelled_by_id` là chủ trọ, `cancelled_at`, `cancellation_reason`. Lý do là phòng đã được giữ để lập hợp đồng, không gán lỗi người thuê hoặc ghi `NO_SHOW`.
- Đề nghị `PENDING` quá giờ chuyển `EXPIRED`; đề nghị còn hạn chuyển `REJECTED`, ghi chủ trọ/thời điểm/lý do phòng đã được giữ. Không sửa danh tính, giờ hoặc ghi chú gốc.
- Đề nghị đã `ACCEPTED` giữ quyết định và `scheduled_viewing_id` kể cả lịch tương ứng vừa bị hủy. Lịch đã xem, quyết định thuê cũ và các trạng thái kết thúc giữ nguyên. Lịch đã bắt đầu/đã quá giờ không tự bị hủy ngược; chủ trọ đối soát đã xem/không đến theo bằng chứng thực tế.
- Phòng khác không bị ảnh hưởng. Kể cả người được chọn thuê còn một lịch xem khác chưa bắt đầu của cùng phòng thì lịch dư đó cũng được hủy.

Mỗi lịch bị hủy có thông báo `VIEWING_CANCELLED` tới người thuê với tham chiếu lịch của họ; mỗi đề nghị bị từ chối có `VIEWING_REJECT` với tham chiếu đề nghị. Chủ trọ nhận `ROOM_VIEWINGS_CLOSED` tổng hợp số lịch/đề nghị đã đóng, người được chọn vẫn nhận `CONTRACT_SENT`. Nội dung cho người thuê không công khai danh tính hoặc số hợp đồng của người khác. `event_key` riêng theo lịch/đề nghị/hợp đồng chống trùng. Không có hoạt động cần đóng thì không tạo thông báo tổng hợp rỗng. Lỗi ghi thông báo hoặc bất kỳ bước nào rollback cả hợp đồng, lượt dự kiến, phòng, lịch và đề nghị. API chỉ phát thông báo bên ngoài sau khi giao dịch thành công.

Khóa phòng tuần tự hóa cả cuộc đua gửi hợp đồng/duyệt đề nghị: lịch được duyệt trước thì hợp đồng hủy lịch sắp tới đó; hợp đồng giữ phòng trước thì đề nghị bị đóng và không duyệt được nữa. Hai phiên gửi hợp đồng cùng phòng chỉ một phiên thành công. Lời gọi tạo hợp đồng lặp bị từ chối vì phòng đã được giữ, không tạo thêm hợp đồng hoặc thông báo.

Wireframe hiển thị số lịch sắp tới/đề nghị chờ trong form lập hợp đồng, giữ dữ liệu khi chỉ mở/hủy form và kiểm tra lại khi submit. Gửi thành công cập nhật thẻ chat, Lịch xem và Thông báo. Nút tạo hợp đồng từ lịch khác bị vô hiệu khi phòng đã giữ. Hủy hợp đồng không mở lại những cuộc hẹn đã thông báo hủy; người thuê gửi đề nghị mới, hoặc chủ trọ tạo lịch mới sau trao đổi. Hợp đồng đang sửa về `DRAFT` vẫn giữ phòng theo quy tắc hợp đồng mở hiện có, không tự phục hồi lịch.

**Ảnh hưởng CSDL:** không thêm bảng/cột/trạng thái, tổng vẫn 41 bảng; dùng trường kiểm toán và `notifications` hiện có. Nguồn mới là `database/source/contract-viewing-cleanup.sql`, build vào schema và migration `20261025_contract_viewing_cleanup.sql`; không sửa các migration đã phát hành. Migration chỉ thay routine, không tự viết lại lịch sử của hợp đồng đã tồn tại. Dữ liệu cũ mâu thuẫn cần đối soát, không suy đoán thời điểm hủy.

### 4.11. Nhiều bài đăng cho cùng một phòng

**Giới hạn hiện hành:** một phòng có nhiều bài đăng và có thể đồng thời có nhiều tin `DRAFT`, `PENDING_REVIEW`, `APPROVED`, `REJECTED` hoặc `HIDDEN`. Chưa đặt hạn mức số tin chờ duyệt/đã duyệt theo phòng. Không còn quy tắc tổng chờ duyệt + đã duyệt bằng 1. Nếu sau này cần hạn mức thì bổ sung chính sách và kiểm tra giao dịch ở backend; không tự mặc định 3 tin/phòng.

**SQL:** bỏ unique `uq_posts_live_room` và cột sinh `posts.live_room_id`, thêm chỉ mục thường `ix_posts_room_status(room_id,status)`. Giữ `posts.id`, `room_id`, các FK chủ trọ/nhà/phòng và `uq_posts_id_room(id,room_id)` để hội thoại vẫn tham chiếu đúng bài và đúng phòng. Không sửa unique hợp đồng `uq_contract_live_room`; một phòng vẫn chỉ có một hợp đồng mở. Tổng số bảng giữ 41. Migration `20261025_multiple_room_posts.sql` chạy sau bản xử lý lịch/hợp đồng, không xóa hoặc thay ID bài đăng, ảnh, yêu thích, tin nhắn hay hội thoại cũ. Không chạy migration cũ lại trên schema tạo mới.

**Dữ liệu UI:** `state.posts` là danh sách riêng; bài có `id`, `roomId`, tiêu đề, nội dung, ảnh, trạng thái và phiên bản nội dung. `state.rooms` giữ phòng vật lý, giá/cọc, diện tích, sức chứa, nhà và tình trạng. Các nhãn/ảnh mẫu trong dữ liệu phòng dùng để mô tả phòng, không đại diện cho bài cần sửa. Sửa bài không đổi các thông tin vật lý này hoặc ghi đè bài khác cùng phòng. ID ví dụ `p-r1` là ID bài mẫu, khác `r1` là ID phòng; đây vẫn là ID mô phỏng, không dùng trực tiếp để nhập SQL.

**Tạo/sửa/duyệt:** chủ trọ chọn mọi phòng thuộc mình để tạo bài mới, kể cả phòng đang có tin chờ duyệt hoặc đã duyệt. Tạo mới không lấy ID bài cũ để ghi đè; sửa/gửi lại giữ nguyên bài và phòng, tăng phiên bản, kiểm tra trạng thái/phiên bản lúc mở form để tránh ghi đè dữ liệu mới. Gửi bài nào thì riêng bài đó về `PENDING_REVIEW`. Quản trị duyệt/từ chối từng ID, từ chối cần lý do. Chủ trọ được ẩn bài của mình, quản trị được hiện lại bài ẩn; ẩn hoặc từ chối một bài không đổi bài cùng phòng. Một bài được duyệt và một bài khác chờ duyệt vẫn tồn tại đồng thời. UI hiện hỗ trợ một ảnh mỗi bài; SQL đã hỗ trợ nhiều ảnh qua `post_images` nhưng chưa bổ sung bộ ảnh vào form.

**Khám phá và tham chiếu:** danh sách công khai lấy các bài đã duyệt, có thể hiển thị nhiều thẻ của cùng phòng. Tiêu đề/nội dung/ảnh lấy từ bài; giá/cọc/sức chứa/trạng thái lấy từ phòng. Lưu tin theo ID bài nên người thuê có thể lưu hai bài của cùng phòng. Chi tiết, chia sẻ và báo cáo trỏ đúng ID bài; bài bị ẩn thì thẻ chia sẻ báo không còn hiển thị, không tự thay bằng bài đang duyệt khác của phòng đó. Hội thoại ghi ngữ cảnh bài, đề nghị/lịch trong prototype giữ `postId`; đề nghị từ bài đã ẩn không được duyệt bằng bài khác cùng phòng. Backend ánh xạ đúng conversation SQL gắn bài gốc; việc UI nhóm hội thoại theo cặp người vẫn theo HT-06.

**Dùng chung phòng:** duyệt bài không giữ phòng hoặc tăng sức chứa. Các lịch từ nhiều bài của cùng phòng vẫn chống giao nhau theo `room_id`; giới hạn một đề nghị chờ mỗi người/phòng vẫn áp dụng xuyên bài. Gửi hợp đồng từ một bài giữ phòng chung và hủy lịch sắp tới/đóng đề nghị chờ từ tất cả bài của phòng đó theo mục 4.10. Các bài không tự mất quyết định duyệt khi giữ phòng; tình trạng cho thuê hiển thị từ phòng/hợp đồng hiện tại. `posts.availability_status` là thông tin xác nhận tin theo hạn hiện có, không thay trạng thái chiếm phòng. API phải đọc cùng dữ liệu phòng, không chỉ dựa vào bài `APPROVED/OPEN` để nhận lịch mới.

**Dữ liệu demo đã lưu:** lần mở đầu tự tạo bài riêng từ thông tin bài đang gộp trong phòng cũ; chuyển ID tin đã lưu, tin chia sẻ, ngữ cảnh chat và nguồn lịch sang bài tương ứng. Giữ hợp đồng, người ở, hóa đơn và lịch sử; không bắt xóa localStorage. Dữ liệu đã có `state.posts` không được chuyển lại hoặc tạo bài trùng khi tải lại. Báo cáo cũ thiếu ID bài được giữ để đối soát, không tự suy đoán bài đích từ tên phòng.

## 5. Backend cần làm thêm cho các luồng còn lại

Các CHECK/FK, trigger và thủ tục mới hỗ trợ các luồng vừa sửa, nhưng chưa phải một backend/API hoàn chỉnh. Những kiểm tra tổng hợp và giao dịch phải được thực hiện qua thủ tục tương ứng; không thay bằng các lệnh ghi rời rạc từ client. Backend cần xác thực tài khoản, lấy actor ID từ phiên đăng nhập và cấp quyền DB theo phạm vi công việc, không tin actor ID do trình duyệt tùy ý gửi lên.

- Các thủ tục đã khóa hàng `rooms`/`contracts` bằng `SELECT ... FOR UPDATE`, đọc lại số chỗ và cập nhật cùng giao dịch; đổi phòng khóa theo thứ tự ID. Tài khoản API chỉ nên được `EXECUTE` các thủ tục công khai cho các thao tác này, không được thực hiện ghi trực tiếp hoặc gọi helper `_v5_*` để bỏ qua trình tự. Các API tạo/gửi/duyệt đề nghị và CRUD còn lại vẫn cần triển khai quyền tương ứng.
- Chỗ hết hạn không được tính vào sức chứa kể cả khi tác vụ nền chưa chuyển `APPROVED` sang `EXPIRED`. Thông tin hoàn tất yêu cầu và dòng `room_tenants` phải liên kết hai chiều đúng các FK v5.
- Khi kết thúc/đổi phòng, ghi đủ `move_out_date`, `move_out_confirmed_by_id`, `move_out_confirmed_at` cho người đã ở; người chưa đến chuyển `CANCELLED`, không giả ngày ra. Hủy các yêu cầu thêm người còn mở.
- Ghi phiên bản, `members_snapshot`, xác nhận hai bên, đại diện và các trường kiểm toán theo đúng schema. Thứ tự cập nhật phải đáp ứng trigger kích hoạt hợp đồng và các FK; không đưa nguyên JSON prototype vào SQL.
- Kiểm tra quyền và ngày/giờ trên máy chủ. Wireframe vẫn dùng `localStorage`; khả năng chống duyệt đồng thời đã được kiểm tra ở stored procedure, chỉ có hiệu lực với ứng dụng khi API thực sự sử dụng các giao dịch này.

## 6. Dữ liệu demo đã lưu từ phiên bản cũ

Giữ nguyên khóa `localStorage` để không xóa thao tác đã thử. Người còn `ACTIVE` trên hợp đồng đã đóng vẫn hiện và phòng vẫn được tính có người, kèm nhắc đối soát. Không tự mở lại hợp đồng, tự chọn đại diện mới hoặc suy đoán ngày ra bị mất.

Các yêu cầu cũ đang `APPROVED` nhưng không có hạn giữ chỗ được chuyển `EXPIRED`; cần duyệt lại bằng một yêu cầu mới. Có thể bắt đầu lại toàn bộ dữ liệu mẫu qua `__troday.reset()` trong console nếu chỉ cần thử bản mới.

Kết nối đã chấp nhận từ demo cũ có thể mở chat bằng nút “Nhắn tin” mà không cần chấp nhận lại. Khi chấp nhận một lời mời cũ bị gửi chéo, giữ một kết nối và hủy lời mời đang chờ trùng cặp. Những yêu cầu thuê đã tạo từ logic cũ được giữ để đối soát, không tự xóa hoặc tự suy đoán lại đồng thuận.

## 7. Giới hạn đối chiếu

Sửa các lỗi trên không đồng nghĩa wireframe đã thay thế backend hoặc tuân thủ toàn bộ v5. Dữ liệu JavaScript vẫn rút gọn các phiên bản/xác nhận/snapshot so với SQL; dữ liệu demo cũ có thể thiếu trường bắt buộc. Luồng chat gộp nhiều bài đăng/phòng trong một hội thoại cũng vẫn là khác biệt đã ghi trong README: cần nhóm các conversation v5 ở lớp ứng dụng, hoặc thiết kế lại ngữ cảnh chat nếu muốn lưu trực tiếp theo mô hình UI.

## 8. Kiểm tra

Chạy `npm test` trong thư mục wireframe. Bộ kiểm thử gọi các handler thực tế với đồng hồ cố định, bao phủ sức chứa, giữ chỗ, trạng thái hợp đồng, vào ở theo nhóm/từng người, chuyển phòng không cập nhật dở dang, lịch UTC+7 và hủy/rút ý định.

**78/78 tình huống JavaScript đạt.** Các luồng hợp đồng, người ở, sức chứa, đại diện, lịch và chat cũ vẫn đạt. Phần tin đăng kiểm tra nhiều tin chờ trên phòng đã có tin duyệt, không ghi đè phòng/bài khác, duyệt/từ chối/ẩn độc lập, quyền, phiên bản form cũ, ảnh, khám phá/lưu/chi tiết/chia sẻ/báo cáo theo ID bài, nguồn đề nghị từ bài khác cùng phòng và chuyển dữ liệu cũ một lần. Phần giữ phòng tiếp tục kiểm tra đóng đúng lịch/đề nghị, giữ lịch sử, thông báo, submit lặp và hủy hợp đồng không phục hồi lịch cũ.

`npm run test:browser` cũng đạt với Chrome chạy theo giờ Los Angeles: thao tác nút/form thật cho các luồng cũ và gửi/chấp nhận/từ chối/rút đề nghị, tạo lịch trực tiếp sau chat, cảnh báo trước gửi hợp đồng, hủy lịch/đóng đề nghị và thông báo hai bên, xác nhận giữ phòng, hủy hợp đồng và đặt lịch mới. Có kiểm tra UTC+7, trạng thái chung giữa chat/Lịch xem, tải lại localStorage, chia sẻ tin, sửa/gửi lại tin của phòng hiện có và bố cục di động; không có lỗi JavaScript. Cần Node 22+, Chrome tại đường dẫn mặc định hoặc `CHROME_PATH`.

`npm run test:database`: **44/44 kiểm tra tích hợp đạt trên MySQL 8.0.42**, gồm tạo mới 41 bảng, nâng cấp qua năm migration và tính tương đương cột/FK/chỉ mục bài đăng/nội dung thủ tục tạo hợp đồng. Nhiều tin chờ duyệt/đã duyệt cùng phòng hoạt động trên cả schema mới và schema nâng cấp; sửa trạng thái một bài giữ các bài còn lại. Có kiểm tra yêu thích riêng từng bài, hội thoại đúng bài/phòng, bài gốc bị ẩn không dùng bài khác để duyệt lịch, trùng giờ xuyên bài và hợp đồng đóng lịch từ tất cả bài cùng phòng. Các kiểm tra cũ về người ở, đại diện, sức chứa, giao dịch đồng thời và rollback do lỗi thông báo vẫn đạt. Migration từ chối sai thứ tự/chạy lại; public procedure không làm mất giao dịch bên gọi khi bị gọi lồng.

`npm run db:check` xác nhận SQL tạo mới và các migration sinh ra đồng bộ với ba nguồn trong `database/source/`. Các kiểm tra chỉ dùng instance tạm có thư mục dữ liệu/cổng riêng và dữ liệu fixture; chưa xác nhận dữ liệu hoặc triển khai trên CSDL hiện có của người dùng.

Kiểm thử Chrome cũng tạo hai bài mới cho cùng phòng, duyệt một bài/từ chối bài kia, sửa và ẩn độc lập, xem hai thẻ công khai, lưu/chia sẻ/báo cáo đúng bài và xác nhận thẻ chia sẻ của bài bị ẩn không bị thay bằng bài khác cùng phòng. Các biểu mẫu được thử trên bố cục di động.
