// Reference catalogue for the current wireframe and database/schema.sql.
// This page explains behavior; it never executes the workflows it describes.
const BUSINESS_GROUPS = [
  ["account", "Tài khoản & xác minh", "user-round"],
  ["property", "Nhà, quyền cho thuê & phòng", "building-2"],
  ["posts", "Tin đăng & tìm phòng", "search"],
  ["roommates", "Hồ sơ & kết nối ở ghép", "users"],
  ["messages", "Tin nhắn & thông báo", "message-circle"],
  ["viewings", "Hẹn xem & quyết định thuê", "calendar-days"],
  ["contracts", "Hợp đồng & vào ở", "file-text"],
  ["residents", "Người ở & đại diện", "contact-round"],
  ["changes", "Gia hạn, đổi phòng, kết thúc", "refresh-cw"],
  ["billing", "Dịch vụ & hóa đơn", "receipt"],
  ["moderation", "Đánh giá & quản trị", "shield-check"],
  ["integrity", "Dữ liệu & tích hợp", "database"]
];
const BUSINESS_ROLES = { tenant: "Người thuê", landlord: "Chủ trọ", admin: "Quản trị", system: "Hệ thống" };
const BUSINESS_SCOPES = { demo: "Mô phỏng trong wireframe", partial: "Mô phỏng một phần", database: "Thiết kế CSDL" };
const BUSINESS_LAYERS = { UI: "Wireframe", DB: "CSDL · CHECK / UNIQUE / FK", PROC: "CSDL · giao dịch / trigger", API: "Cần API / kiểm tra máy chủ" };
const BUSINESS_FLOWS = [
  {
    id: "account-access", group: "account", title: "Tài khoản, đăng nhập và vai trò", roles: ["tenant","landlord","admin"], scope: "database",
    path: "Thanh trên → chọn Người thuê / Chủ trọ / Quản trị", intro: "Mỗi vai trò có không gian và quyền xử lý riêng. Đổi vai trò ở demo đang chuyển giữa Lan, Quân và Huyền Anh.",
    steps: [["Người dùng","Đăng ký bằng thông tin liên hệ và đăng nhập; đây là luồng máy chủ cần tích hợp."],["Hệ thống","Xác định tài khoản, vai trò và phiên còn hiệu lực trước khi cấp quyền."],["Người dùng","Sử dụng màn hình theo vai trò; máy chủ kiểm tra quyền lại với từng yêu cầu."]],
    states: ["ACTIVE: hoạt động", "LOCKED: bị khóa", "DISABLED: vô hiệu hóa"],
    rules: [["DB","Email và số điện thoại có khóa duy nhất; phải có ít nhất một thông tin liên hệ. Vai trò chính thuộc TENANT / LANDLORD / ADMIN."],["DB","Các bảng tenants, landlords, admins tham chiếu users, hỗ trợ lưu quan hệ vai trò riêng; không suy quyền chỉ từ tên hiển thị."],["API","Actor ID phải lấy từ phiên đã xác thực, không tin ID hoặc vai trò do trình duyệt gửi lên."]],
    data: [["users","Tài khoản, liên hệ, mật khẩu băm, vai trò, trạng thái và cài đặt thông báo."],["tenants","Quan hệ vai trò người thuê."],["landlords","Quan hệ vai trò chủ trọ."],["admins","Quan hệ vai trò quản trị."]],
    limits: ["Wireframe chưa có đăng ký/đăng nhập thật. Nút chọn vai trò dùng cho trình diễn, không phải cơ chế bảo mật."], related: ["identity","sessions","lock-account"]
  },
  {
    id: "profile", group: "account", title: "Cập nhật hồ sơ cá nhân", roles: ["tenant","landlord","admin"], scope: "partial",
    path: "Tài khoản → thông tin cá nhân → Lưu", intro: "Quản lý thông tin hiển thị của tài khoản, tách khỏi hồ sơ ở ghép và bằng chứng cư trú.",
    steps: [["Người dùng","Mở thông tin cá nhân và sửa biểu mẫu."],["Wireframe","Lưu tên hiển thị và cập nhật tên ở các màn hình liên quan."],["Máy chủ","Khi tích hợp, kiểm tra quyền, dữ liệu liên hệ và quyền riêng tư trước khi lưu đầy đủ."]],
    states: ["Thông tin hiện tại → cập nhật thông tin"],
    rules: [["UI","Handler hiện mới lưu tên; các trường điện thoại, email, địa chỉ trên form chưa được lưu đầy đủ."],["DB","personal_profiles có một hồ sơ cho mỗi user; thông tin cá nhân không mặc định là dữ liệu công khai."],["API","Thay đổi liên hệ cần kiểm tra trùng và quy trình xác thực tương ứng."]],
    data: [["users","Tên và thông tin tài khoản."],["personal_profiles","Ảnh đại diện, địa chỉ, nghề nghiệp, giới thiệu."],["files","Metadata ảnh đại diện."]],
    limits: ["Không dùng hồ sơ cá nhân để xác nhận đã thuê phòng hoặc có quyền cho thuê nhà."], related: ["roommate-profile","identity"]
  },
  {
    id: "identity", group: "account", title: "Xác minh danh tính và hồ sơ tài khoản", roles: ["tenant","landlord","admin"], scope: "partial",
    path: "Người thuê: Tài khoản → Xác minh · Quản trị: Xác minh hồ sơ", intro: "Quản trị xem hồ sơ và ra quyết định. Xác minh người dùng và xác minh quyền cho thuê từng nhà là hai nghiệp vụ riêng.",
    steps: [["Người thuê","Nhập căn cước, chọn giấy tờ và gửi hồ sơ chờ duyệt."],["Quản trị","Đối chiếu hồ sơ, duyệt hoặc từ chối với lý do."],["Hệ thống","Giữ kết quả và người/thời điểm xét duyệt. Hồ sơ chủ trọ có mô hình SQL riêng."]],
    states: ["PENDING: chờ duyệt → APPROVED: chấp thuận", "PENDING → REJECTED: từ chối", "WITHDRAWN: đã rút (CSDL)"],
    rules: [["DB","Mỗi người chỉ có một hồ sơ xác minh cùng loại đang PENDING; quyết định duyệt/từ chối lưu người và thời điểm."],["DB","Giấy tờ danh tính dùng files với quyền PRIVATE."],["API","Phải kiểm tra nội dung tệp, đối chiếu danh tính và chính sách lưu giấy tờ trên máy chủ."]],
    data: [["tenant_identity_verifications","Căn cước người thuê, kết quả và hạn lưu giấy tờ."],["landlord_verifications","Hồ sơ xin xác minh tài khoản chủ trọ."],["files","Giấy tờ danh tính và minh chứng tài khoản."],["moderation_actions","Lịch sử xử lý."]],
    limits: ["Form xác minh người thuê hiện lưu tên tệp, chưa tải giấy tờ lên máy chủ. Khác với minh chứng nhà đang lưu Blob trong IndexedDB.","Duyệt tài khoản không tự xác minh tất cả các nhà của chủ trọ."], related: ["house-proof"]
  },
  {
    id: "sessions", group: "account", title: "OTP, quên mật khẩu, phiên và liên kết tài khoản cư trú", roles: ["tenant","landlord","admin","system"], scope: "database",
    path: "Thiết kế CSDL · Tài khoản → Phiên đăng nhập (màn hình mô phỏng)", intro: "CSDL đã dành cấu trúc cho xác thực số điện thoại, đặt lại mật khẩu và mời người cư trú liên kết tài khoản.",
    steps: [["Người dùng","Yêu cầu xác thực điện thoại, đặt lại mật khẩu hoặc liên kết tài khoản với lượt ở."],["Máy chủ","Tạo mã có hạn dùng, giới hạn số lần thử; kiểm tra người nhận và ngữ cảnh."],["Hệ thống","Tiêu thụ mã một lần; tạo hoặc thu hồi phiên, lưu dấu vết liên kết."]],
    states: ["Mã còn hạn → consumed / revoked / hết hạn", "Phiên còn hạn → revoked / hết hạn"],
    rules: [["DB","selector, session_key và refresh_token_hash có khóa duy nhất; expires_at phải sau created_at."],["DB","Số lần thử từ 0 đến max_attempts. Token OCCUPANT_LINK phải có target_room_tenant_id; token mục đích khác không có liên kết này."],["API","Lưu HMAC/hash có bí mật máy chủ, không lưu OTP nguyên văn; kiểm tra phiên bị thu hồi ở mỗi request."]],
    data: [["auth_sessions","Phiên, refresh token băm, hạn dùng và thu hồi."],["verification_tokens","Mục đích mã, số lần thử, hết hạn, tiêu thụ/thu hồi."],["room_tenants","Lượt cư trú được mời liên kết tài khoản."]],
    limits: ["Chưa có OTP/đổi mật khẩu/liên kết tài khoản thật. Nút thu hồi phiên trong demo chỉ báo thành công."], related: ["account-access","move-in"]
  },
  {
    id: "create-house", group: "property", title: "Thêm và sửa nhà trọ", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Nhà & phòng → Thêm nhà trọ / Sửa thông tin nhà", intro: "Tạo nhà nháp trước, rồi chuẩn bị phòng, dịch vụ và hồ sơ quyền cho thuê.",
    steps: [["Chủ trọ","Nhập tên, địa chỉ, tỉnh/thành, khu vực; tọa độ và ghi chú là tùy chọn."],["Hệ thống","Lưu nhà thuộc chủ trọ hiện tại, tự chọn nhà mới, chưa cần có phòng."],["Chủ trọ","Thêm phòng/dịch vụ hoặc chuyển sang nộp hồ sơ xác minh."]],
    states: ["Chưa có nhà → nhà nháp / chưa xác minh", "Sửa thông tin → tăng phiên bản"],
    rules: [["UI","Tên tối đa 150, địa chỉ 500, khu vực 150, ghi chú 2.000 ký tự; tỉnh/thành từ danh mục. Tọa độ phải nhập cả hai và đúng khoảng."],["DB","uq_houses_creation chống tạo trùng theo landlord_id + creation_key; cặp vĩ độ/kinh độ cùng NULL hoặc cùng hợp lệ."],["PROC","sp_create_rental_house / sp_update_rental_house kiểm tra chủ sở hữu và row_version; form cũ phải tải lại khi phiên bản thay đổi."]],
    data: [["rental_houses","Chủ nhà, tên, địa chỉ, vị trí, ghi chú, phiên bản và khóa tạo nhà."]],
    limits: ["Lưu nhà chưa cho phép công khai tin hoặc lập hợp đồng mới. Không có chức năng chuyển quyền sở hữu nhà trên giao diện."], related: ["house-proof","rooms","services"]
  },
  {
    id: "house-proof", group: "property", title: "Nộp và xét duyệt quyền cho thuê từng nhà", roles: ["landlord","admin"], scope: "demo",
    path: "Nhà & phòng → Xác minh quyền cho thuê · Quản trị → Xác minh hồ sơ → Quyền cho thuê từng nhà", intro: "Kiểm tra người nộp có quyền cho thuê tại đúng nhà, trong đúng phạm vi và thời hạn.",
    steps: [["Chủ trọ","Chọn tư cách OWNER / AUTHORIZED / SUBLESSOR, khai phạm vi và ngày hiệu lực."],["Chủ trọ","OWNER nộp OWNER_PROOF; AUTHORIZED thêm AUTHORIZATION; SUBLESSOR nộp LEASE_AGREEMENT và SUBLET_CONSENT."],["Hệ thống","Lưu tệp, bản chụp định danh nhà và một hồ sơ PENDING; thông báo cho quản trị."],["Quản trị","Mở minh chứng, đối chiếu người nộp/địa chỉ/phạm vi/thời hạn; xác nhận đã kiểm tra rồi duyệt, hoặc từ chối có lý do."],["Hệ thống","Ghi kết quả, audit và thông báo chủ trọ; quyền mới chỉ có hiệu lực nếu còn đúng nhà và thời hạn."]],
    states: ["PENDING → APPROVED / REJECTED / WITHDRAWN", "APPROVED → SUPERSEDED / REVOKED / EXPIRED"],
    rules: [["UI","Tối đa 8 tệp PDF/JPEG/PNG/WebP, 5 MB/tệp; đủ loại chứng minh theo tư cách. Ủy quyền và cho thuê lại bắt buộc ngày kết thúc."],["DB","Một hồ sơ chờ và một phê duyệt hiện hành cho mỗi nhà; tệp PRIVATE, thuộc người nộp. Hồ sơ và minh chứng đã nộp được giữ bất biến."],["PROC","sp_submit_house_verification / sp_review_house_verification khóa nhà, kiểm tra lại dữ liệu và ghi quyết định/audit/thông báo cùng giao dịch."],["UI","Có thể rút khi PENDING hoặc nộp lại sau từ chối. Ngày bắt đầu trong tương lai được nộp nhưng chưa được duyệt trước ngày đó."]],
    data: [["rental_house_verifications","Tư cách, phạm vi, thời hạn, phiên bản/JSON nhà lúc nộp và lịch sử xét duyệt."],["house_verification_documents","Liên kết mỗi loại minh chứng với tệp."],["files","Metadata tệp LANDLORD_PROOF riêng tư."],["notifications","Thông báo nộp và kết quả."],["moderation_actions","Dấu vết quyết định quản trị."]],
    limits: ["Tệp wireframe nằm trong IndexedDB cùng trình duyệt. Hai nhà mẫu có hồ sơ giả lập được gắn nhãn, không phải xác minh giấy tờ thực.","Phê duyệt hiện áp dụng cả nhà; quản trị phải kiểm tra phạm vi bao phủ các phòng. Chưa có quyền cho thuê giới hạn một số phòng."], related: ["house-rights-expiry","submit-post","create-contract"]
  },
  {
    id: "house-rights-expiry", group: "property", title: "Hết quyền, thu hồi hoặc đổi định danh nhà", roles: ["landlord","admin","system"], scope: "demo",
    path: "Nhà & phòng → Sửa nhà / Lịch sử xác minh · Quản trị → Hồ sơ nhà → Thu hồi", intro: "Quyền được tính lại theo chủ hiện tại, định danh và ngày hiệu lực; một lần duyệt không có hiệu lực vĩnh viễn.",
    steps: [["Hệ thống","Kiểm tra phê duyệt, chủ nhà, tài khoản hoạt động, verification_version và thời hạn theo ngày Việt Nam."],["Chủ trọ / Quản trị","Đổi địa chỉ/vị trí định danh hoặc thu hồi có lý do; hết hạn được nhận biết ngay khi truy vấn."],["Hệ thống","Ẩn khỏi nguồn công khai, chặn thuê mới/gia hạn/phòng đích chưa đủ quyền; giữ hợp đồng và người ở cũ."],["Chủ trọ","Nộp hồ sơ mới; quản trị duyệt lại khi đủ điều kiện."]],
    states: ["Đã xác minh → cần xác minh lại / hết hạn / bị thu hồi", "Phê duyệt mới → phê duyệt cũ SUPERSEDED"],
    rules: [["PROC","Đổi chủ, địa chỉ, mã tỉnh/địa phương hoặc tọa độ tăng verification_version, rút hồ sơ đang chờ. Đổi tên/ghi chú không làm mất quyền."],["PROC","v_effective_house_verifications tính quyền hiệu lực; v_public_house_posts lọc tin công khai. Hết hạn không phải chờ worker."],["PROC","Trigger chặn công khai và hợp đồng mới/xác nhận/kích hoạt, tăng hạn hợp đồng; thao tác rời phòng và kết thúc hợp đồng vẫn được giữ."],["UI","Nộp lại trong khi quyền cũ còn hiệu lực không tự làm mất quyền cũ."]],
    data: [["rental_houses","Phiên bản định danh hiện tại."],["rental_house_verifications","Lịch sử từng lần nộp/duyệt/rút/thu hồi."],["posts","Giữ nội dung và quyết định duyệt cũ; lọc quyền ở nguồn công khai."],["contracts","Giữ nguyên các hợp đồng đã có."]],
    limits: ["Migration không tự duyệt nhà cũ. API phải sử dụng view công khai cùng thời điểm triển khai migration."], related: ["house-proof","renewal","transfer","end-lease"]
  },
  {
    id: "rooms", group: "property", title: "Thêm phòng, sức chứa và tình trạng phòng", roles: ["landlord","system"], scope: "demo",
    path: "Chủ trọ → Nhà & phòng → chọn nhà → Thêm phòng / Sửa", intro: "Phòng là tài sản và chỗ ở thực tế; nhiều bài đăng không tạo ra nhiều phòng hoặc nhiều chỗ.",
    steps: [["Chủ trọ","Nhập mã phòng, diện tích, giá, cọc, sức chứa và tình trạng."],["Hệ thống","Kiểm tra mã trong nhà và số chỗ đang sử dụng trước khi lưu."],["Hệ thống","Tính tình trạng theo người đang ở và hợp đồng mở khi các luồng thuê thay đổi."]],
    states: ["AVAILABLE: trống", "RESERVED: giữ bởi hợp đồng mở", "OCCUPIED: có người ACTIVE", "MAINTENANCE: bảo trì"],
    rules: [["DB","Mã phòng duy nhất trong cùng nhà; sức chứa nguyên dương, giá/cọc không âm, diện tích dương."],["PROC","Số chỗ cần tính = người ACTIVE + thành viên PLANNED trên hợp đồng mở + chỗ giữ còn hạn chưa thành lượt ở. Không đếm trùng yêu cầu đã hoàn tất."],["PROC","Không giảm sức chứa dưới tổng này; có người ACTIVE thì không được đánh dấu AVAILABLE, kể cả hợp đồng cũ bị đóng sai."],["UI","Chỉ quản lý phòng của nhà thuộc mình; nhà chưa có xác minh vẫn được chuẩn bị phòng."]],
    data: [["rooms","Thông tin vật lý, giá và sức chứa."],["room_tenants","Người dự kiến, đang ở và lịch sử."],["contracts","Hợp đồng mở giữ phòng."],["occupant_join_requests","Chỗ giữ chưa hết hạn."]],
    limits: ["Tình trạng phòng không thay thế chứng cứ người đang ở. Dữ liệu mâu thuẫn cần đối soát, không tự bỏ cư dân."], related: ["room-detail","move-in","join-hold"]
  },
  {
    id: "room-detail", group: "property", title: "Chi tiết phòng: Bài đăng, Người ở, Dịch vụ", roles: ["tenant","landlord","admin"], scope: "demo",
    path: "Nhà & phòng → Xem chi tiết · Chi tiết tin → thông tin phòng", intro: "Ba tab dùng cùng một phòng, với quyền hiển thị riêng cho từng danh sách.",
    steps: [["Người xem","Mở phòng và chọn Bài đăng / Người ở / Dịch vụ; chỉ nội dung tab hiện tại được hiển thị."],["Chủ trọ / Quản trị","Xem bài chưa công khai và người ACTIVE; chủ trọ có thể tạo/sửa bài từ đúng phòng."],["Người thuê","Xem bài được phép công khai, số người ở và dịch vụ; không thấy căn cước hoặc danh tính cư dân."]],
    states: ["Bài đăng ↔ Người ở ↔ Dịch vụ; ghi nhớ tab"],
    rules: [["UI","Dữ liệu lấy đúng roomId; danh sách người ở loại PLANNED/LEFT/CANCELLED, vẫn giữ ACTIVE trên hợp đồng đóng sai kèm nhắc đối soát."],["UI","Dịch vụ phải bật ở nhà và phòng; giá riêng 0 được giữ, NULL mới kế thừa giá nhà."],["API","Kiểm tra quyền xem từng tài nguyên ở máy chủ; không trả dữ liệu riêng tư rồi chỉ ẩn bằng CSS."]],
    data: [["rooms","Thông tin chung của phòng."],["posts","Bài liên quan."],["room_tenants","Lượt ở hiện tại."],["room_services","Dịch vụ/giá riêng."],["house_services","Giá và trạng thái tại nhà."]],
    limits: ["Người ngoài chỉ mở được phòng có tin công khai còn đủ quyền cho thuê."], related: ["submit-post","services","residents"]
  },
  {
    id: "submit-post", group: "posts", title: "Tạo, sửa và gửi duyệt tin đăng", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Tin đăng → Tạo tin · hoặc Chi tiết phòng → Tạo bài cho phòng này", intro: "Mỗi bài là một bản ghi độc lập gắn với phòng có sẵn của chủ trọ.",
    steps: [["Chủ trọ","Chọn phòng, nhập tiêu đề, nội dung và ảnh; tạo mới không sao chép ngầm bài khác."],["Hệ thống","Kiểm tra quyền, trạng thái/phiên bản form và hạn mức bài chờ của phòng."],["Hệ thống","Lưu đúng bài ở PENDING_REVIEW; bài khác cùng phòng giữ nguyên."],["Quản trị","Duyệt hoặc yêu cầu sửa bằng việc từ chối có lý do."]],
    states: ["DRAFT / APPROVED / REJECTED / HIDDEN → PENDING_REVIEW", "PENDING_REVIEW → sửa vẫn PENDING_REVIEW"],
    rules: [["UI","Tạo mới chọn phòng thuộc mình; sửa giữ roomId và kiểm tra originalVersion để không ghi đè thay đổi mới."],["DB","Một phòng tối đa 3 PENDING_REVIEW qua slot 1–3, UNIQUE (room_id,pending_review_slot) và CHECK. Tổng bài và số bài APPROVED không giới hạn."],["PROC","sp_submit_post khóa hàng và cấp lượt; đủ 3 vẫn sửa được bài đang chờ, nhưng không gửi thêm/gửi lại bài khác."],["UI","Ảnh hiện là một URL HTTP/HTTPS hoặc ảnh mẫu; tiêu đề tối đa 200 ký tự."]],
    data: [["posts","ID, phòng, nội dung, trạng thái, phiên bản và lượt chờ."],["post_images","Thiết kế nhiều ảnh và thứ tự ảnh."],["post_amenities","Tiện ích của bài."]],
    limits: ["UI chưa có quản lý nhiều ảnh. Nhà chưa xác minh vẫn gửi bài chờ được, nhưng chưa công khai được."], related: ["moderate-post","house-proof"]
  },
  {
    id: "moderate-post", group: "posts", title: "Duyệt, từ chối, ẩn và hiện lại tin", roles: ["landlord","admin"], scope: "demo",
    path: "Quản trị → Kiểm duyệt tin · Chủ trọ → Tin đăng → Ẩn tin", intro: "Quyết định áp dụng đúng ID bài, độc lập với tình trạng còn phòng.",
    steps: [["Quản trị","Xem bài chờ rồi duyệt hoặc từ chối kèm lý do."],["Hệ thống","Duyệt/khôi phục kiểm tra nhà có quyền cho thuê hiệu lực; rời hàng chờ giải phóng slot."],["Chủ trọ / Quản trị","Ẩn bài đã duyệt với lý do; quản trị có thể hiện lại nếu vẫn đủ quyền."],["Hệ thống","Giữ lịch sử và các tham chiếu đã lưu/chia sẻ/báo cáo của bài."]],
    states: ["PENDING_REVIEW → APPROVED / REJECTED", "APPROVED → HIDDEN → APPROVED"],
    rules: [["UI","Chỉ quản trị duyệt/từ chối/khôi phục; chủ trọ chỉ ẩn bài thuộc mình. Từ chối/ẩn cần lý do."],["PROC","Trigger kiểm tra quyền nhà trước khi chuyển sang APPROVED; phê duyệt nội dung không thay thế xác minh nhà."],["UI","Ẩn một bài không ẩn bài khác cùng phòng; bản chia sẻ bị ẩn không được thay bằng bài khác."],["DB","moderation_actions lưu đối tượng, người xử lý, lý do và bản chụp trước/sau khi có."]],
    data: [["posts","Quyết định từng bài."],["moderation_actions","Nhật ký kiểm duyệt."],["rental_house_verifications","Điều kiện công khai của nhà."]],
    limits: ["Tin đã duyệt không có nghĩa phòng còn trống: trạng thái phòng và quyền nhà còn được kiểm tra riêng."], related: ["discover","share-post","audit"]
  },
  {
    id: "discover", group: "posts", title: "Tìm phòng, xem tin và lưu trái tim", roles: ["tenant"], scope: "demo",
    path: "Người thuê → Khám phá / Đã lưu", intro: "Tìm và lưu đúng tin đăng; danh sách phòng có thể chứa nhiều bài cho cùng một phòng.",
    steps: [["Người thuê","Lọc từ khóa, khu vực, giá tối đa, diện tích tối thiểu, tiện ích và khoảng cách."],["Hệ thống","Lấy bài APPROVED có quyền nhà còn hiệu lực; Khám phá loại phòng OCCUPIED."],["Người thuê","Mở tin, xem phòng/dịch vụ/chủ trọ, bấm trái tim để lưu hoặc bỏ lưu."],["Người thuê","Từ đúng bài có thể nhắn chủ trọ, đề nghị xem, chia sẻ cho bạn ghép hoặc báo cáo."]],
    states: ["Chưa lưu ↔ đã lưu: trái tim đỏ"],
    rules: [["UI","Lưu theo postId, không theo roomId; nhiều bài của một phòng có thể lưu độc lập."],["DB","favorite_posts chống trùng cặp người thuê + bài đăng; FK giữ tham chiếu đúng bài."],["API","Nguồn công khai dùng v_public_house_posts; không chỉ lọc APPROVED và không lộ tin ẩn qua ID cũ."]],
    data: [["posts","Bài được phép xem."],["rooms","Giá, sức chứa và tình trạng hiện tại."],["rental_houses","Địa chỉ/vị trí."],["favorite_posts","Tin được người thuê lưu."],["post_amenities","Tiện ích dùng tìm kiếm."]],
    limits: ["Khoảng cách trong demo là dữ liệu mẫu, chưa có tính khoảng cách GPS hoặc bản đồ thật. RESERVED/MAINTENANCE vẫn có thể hiện với nhãn tình trạng."], related: ["room-chat","propose-viewing","share-post","report"]
  },
  {
    id: "roommate-profile", group: "roommates", title: "Tạo hồ sơ ở ghép và xác định tình trạng chỗ ở", roles: ["tenant"], scope: "demo",
    path: "Người thuê → Ở ghép → Tạo hồ sơ ở ghép / Sửa hồ sơ", intro: "Hồ sơ giới thiệu nhu cầu ở ghép; tình trạng chỗ ở lấy từ cư trú thực tế hoặc khai báo phù hợp.",
    steps: [["Người thuê","Nhập khu vực, ngân sách, thói quen, ngày sẵn sàng và tình trạng chỗ ở."],["Hệ thống","Nếu có lượt ACTIVE, tự lấy IN_SYSTEM và ID lượt ở; không cho đổi thành chưa có chỗ hoặc ngoài hệ thống."],["Người thuê","Nếu chưa có lượt ACTIVE, chọn NO_ACCOMMODATION hoặc EXTERNAL và khai mô tả ngoài hệ thống khi muốn."],["Hệ thống","Kiểm tra lại lượt ở/phiên bản khi lưu; tạo hồ sơ rồi mới cho gửi lời mời mới."]],
    states: ["Chưa tạo → active: hồ sơ đã tạo", "NO_ACCOMMODATION / EXTERNAL / IN_SYSTEM"],
    rules: [["DB","Một roommate_profiles cho mỗi tenant; ngân sách không âm và max ≥ min nếu có cả hai."],["DB","IN_SYSTEM cần current_room_tenant_id và external_context NULL; tình trạng khác không gắn lượt ở hệ thống."],["UI","Khu vực/thói quen không trống, ngày hợp lệ, mô tả EXTERNAL tối đa 1.000 ký tự; rời EXTERNAL thì xóa mô tả cũ."],["UI","Không có lượt ở không tự kết luận chưa có chỗ. Hồ sơ IN_SYSTEM cũ sau khi rời phòng phải cập nhật lại."]],
    data: [["roommate_profiles","Tình trạng nhà ở, ngân sách, tiêu chí, ngày sẵn sàng, active/profile_version."],["room_tenants","Nguồn chứng cứ IN_SYSTEM."]],
    limits: ["Lưu hồ sơ không tự gửi lời mời, tạo hợp đồng, giữ chỗ hoặc ghi đồng thuận thuê."], related: ["matching-criteria","roommate-invite","join-consent"]
  },
  {
    id: "matching-criteria", group: "roommates", title: "Tiêu chí ghép linh động và danh sách người phù hợp", roles: ["tenant","admin","system"], scope: "partial",
    path: "Ở ghép → Người phù hợp · Thiết kế quản lý tiêu chí trong CSDL", intro: "CSDL tách danh mục tiêu chí khỏi giá trị của từng hồ sơ để có thể bổ sung tiêu chí mà không thêm cột cho mỗi thói quen.",
    steps: [["Quản trị / Máy chủ","Quản lý mã, tên, kiểu giá trị, tùy chọn và trạng thái tiêu chí; chưa có màn hình chỉnh danh mục."],["Người thuê","Cung cấp đặc điểm bản thân và mong muốn về bạn ghép."],["Máy chủ","Kiểm tra kiểu giá trị, điều kiện bắt buộc và trọng số trước khi tính mức phù hợp."],["Wireframe","Hiện danh sách ứng viên mẫu và cho xem hồ sơ/kết nối."]],
    states: ["Tiêu chí active / ngừng dùng", "Giá trị tự khai + giá trị mong muốn + mức quan trọng"],
    rules: [["DB","lifestyle_criteria.code duy nhất; value_type thuộc BOOLEAN / NUMBER / CATEGORY / TIME / RANGE."],["DB","Mỗi hồ sơ + tiêu chí có một profile_lifestyles; ít nhất có self_value hoặc preferred_value. Tiêu chí bắt buộc phải có preferred_value; importance từ 0 đến 5."],["API","Cần kiểm tra cấu trúc/kiểu JSON và thuật toán chấm điểm; CHECK hiện không tự hiểu mọi quy tắc ngữ nghĩa của tiêu chí."]],
    data: [["lifestyle_criteria","Danh mục tiêu chí và kiểu dữ liệu."],["profile_lifestyles","Giá trị bản thân/mong muốn, bắt buộc và trọng số theo hồ sơ."],["roommate_profiles","Khu vực, ngân sách và thông tin chung."]],
    limits: ["Chưa có thuật toán ghép cặp thật hoặc quản trị tiêu chí trên UI. Thói quen trên form demo hiện là mô tả văn bản."], related: ["roommate-profile","roommate-invite"]
  },
  {
    id: "roommate-invite", group: "roommates", title: "Ba tab ở ghép và phản hồi lời mời kết nối", roles: ["tenant"], scope: "demo",
    path: "Ở ghép → Người phù hợp / Lời mời dành cho bạn / Đã mời", intro: "Lời mời kết nối cho phép hai người trò chuyện; chưa xác lập việc thuê chung.",
    steps: [["Người gửi","Tạo hồ sơ trước khi gửi lời mời mới; xem hồ sơ ứng viên rồi chọn Kết nối."],["Hệ thống","Chặn lời mời trùng theo cặp bất kể chiều gửi; chuyển sang tab Đã mời."],["Người nhận","Xem hồ sơ và chấp nhận hoặc từ chối lời mời của mình."],["Hệ thống","Chấp nhận mở/lấy lại đúng chat bạn ghép, không tạo chat trùng hoặc giữ chỗ thuê."]],
    states: ["PENDING → ACCEPTED / REJECTED", "CANCELLED và ended_at: có trong CSDL"],
    rules: [["DB","Không tự mời mình; UNIQUE cặp đã chuẩn hóa chặn hai chiều khi còn PENDING hoặc ACCEPTED chưa kết thúc."],["UI","Người nhận mới được phản hồi; gửi ngược chiều không tự chấp nhận. Bộ đếm tab tính cả mục đã phản hồi."],["DB","SEARCH_TOGETHER / JOIN_EXTERNAL_HOME không gắn target_contract_id; JOIN_SYSTEM_ROOM phải có hợp đồng ngữ cảnh."],["UI","ACCEPTED không tạo occupant_join_requests, không thay đồng thuận thuê và không phụ thuộc phòng còn chỗ."]],
    data: [["roommate_requests","Lời mời, cặp người, ngữ cảnh, kết quả và thời điểm."],["conversations","Chat ROOMMATE liên kết duy nhất lời mời."],["conversation_participants","Hai thành viên cuộc chat."]],
    limits: ["UI chưa có trọn luồng hủy/kết thúc kết nối. Lời mời cũ vẫn có thể phản hồi khi chưa tạo hồ sơ mới."], related: ["roommate-chat","share-post","join-consent"]
  },
  {
    id: "room-chat", group: "messages", title: "Nhắn chủ trọ theo ngữ cảnh tin/phòng", roles: ["tenant","landlord"], scope: "partial",
    path: "Chi tiết tin → Nhắn tin · hoặc Tin nhắn → chọn hội thoại", intro: "Hai bên trao đổi theo đúng chủ trọ, người thuê và phòng trước khi hẹn xem.",
    steps: [["Người thuê","Từ tin công khai mở/tạo chat với chủ trọ của phòng."],["Hai bên","Gửi nội dung, chọn phòng đã trao đổi hoặc tin nhắn chung; nháp lưu riêng theo tài khoản/cuộc chat."],["Hệ thống","Lưu tin và ngữ cảnh; hiện lịch/đề nghị liên quan trong cùng dòng thời gian."],["Chủ trọ / Người thuê","Mở hẹn xem từ chat theo quyền tương ứng."]],
    states: ["ROOM_INQUIRY: hỏi thuê phòng", "Tin TEXT / IMAGE / SYSTEM / POST_SHARE (CSDL)"],
    rules: [["UI","Chỉ thành viên thấy hội thoại; tin văn bản không trống và tối đa 2.000 ký tự; Enter gửi, Shift+Enter xuống dòng."],["DB","UNIQUE (sender_id,client_message_key) chống gửi trùng. Hội thoại ROOM_INQUIRY cần room_id và post_id đúng ngữ cảnh."],["API","Demo nhóm nhiều ngữ cảnh phòng theo cặp người; SQL gắn mỗi ROOM_INQUIRY với một phòng/bài, cần nhóm ở lớp API hoặc bổ sung mô hình trước khi lưu đúng."]],
    data: [["conversations","Loại và ngữ cảnh hội thoại."],["conversation_participants","Quyền thành viên."],["chat_messages","Người gửi, nội dung, khóa gửi và bài chia sẻ."],["room_viewing_requests","Thẻ lịch lấy trực tiếp từ bản ghi nghiệp vụ."]],
    limits: ["Tin và lịch không phải hai bản sao trạng thái. Chưa có máy chủ chat xuyên thiết bị hoặc tải ảnh chat thực."], related: ["propose-viewing","schedule-viewing","notifications"]
  },
  {
    id: "roommate-chat", group: "messages", title: "Chat riêng giữa hai bạn ghép", roles: ["tenant"], scope: "demo",
    path: "Ở ghép → Chấp nhận / Nhắn tin · Tin nhắn → Bạn ghép", intro: "Hội thoại riêng được tạo từ lời mời đã chấp nhận và chưa kết thúc.",
    steps: [["Người nhận","Chấp nhận kết nối hoặc một bên mở lại Nhắn tin."],["Hệ thống","Lấy cùng cuộc chat theo roommate_request_id, thêm đúng hai thành viên."],["Hai bạn ghép","Trò chuyện hoặc chia sẻ tin phòng; tải lại giữ lịch sử."]],
    states: ["ACCEPTED, chưa ended_at → được mở/gửi chat"],
    rules: [["DB","conversations.type=ROOMMATE phải có roommate_request_id, room_id và post_id NULL; một conversation cho một lời mời."],["UI","Kiểm tra thành viên và kết nối khi mở/gửi; không hiện nút lịch xem của chủ trọ hoặc ngữ cảnh chat hỏi phòng trước đó."],["UI","Chấp nhận lại không tạo chat trùng. Nhãn Bạn ghép chỉ là quan hệ trò chuyện, không khẳng định đã ở chung."]],
    data: [["roommate_requests","Quyền kết nối còn hiệu lực."],["conversations","Hội thoại ROOMMATE."],["conversation_participants","Hai người tham gia."],["chat_messages","Tin đã trao đổi."]],
    limits: ["Muốn thuê chung phải thực hiện luồng hợp đồng hoặc yêu cầu thêm người riêng."], related: ["share-post","join-consent"]
  },
  {
    id: "share-post", group: "messages", title: "Chia sẻ đúng tin phòng cho bạn ghép", roles: ["tenant"], scope: "demo",
    path: "Chi tiết tin → Chia sẻ cho bạn ghép · Chat bạn ghép → Chia sẻ phòng", intro: "Gửi một thẻ tham chiếu tin đăng vào chat đang có kết nối.",
    steps: [["Người thuê","Chọn người nhận đã kết nối, chọn đúng bài công khai và ghi chú tùy chọn."],["Hệ thống","Kiểm tra lại kết nối và quyền xem bài, lưu tin POST_SHARE với shared_post_id."],["Người nhận","Xem ảnh, giá/tình trạng hiện tại, bấm mở đúng tin rồi quay lại đúng chat."],["Hệ thống","Nếu bài không còn hiển thị, hiện thông báo thay cho nội dung thẻ."]],
    states: ["Bài còn công khai → thẻ mở được", "Bài ẩn / mất quyền / không tồn tại → thẻ không còn hiển thị"],
    rules: [["DB","message_type=POST_SHARE bắt buộc shared_post_id; loại khác không được mang liên kết này."],["UI","Không tự đổi sang bài khác của cùng phòng; không lộ ảnh/tiêu đề bài bị ẩn."],["UI","Giữ nháp tin nhắn thường, không thêm chủ trọ vào chat, không tự đặt lịch hoặc giữ chỗ thuê."]],
    data: [["chat_messages","Bài gốc và ghi chú chia sẻ."],["posts","Nguồn nội dung và quyền xem hiện tại."],["roommate_requests","Quyền người nhận kết nối."]],
    limits: ["Chia sẻ là giới thiệu tin, không phải đồng ý thuê hoặc quyền ưu tiên thuê."], related: ["notifications","propose-viewing"]
  },
  {
    id: "notifications", group: "messages", title: "Chuông, bộ đếm và popup thông báo mới", roles: ["tenant","landlord","admin","system"], scope: "partial",
    path: "Chuông trên thanh trên · Popup khi có thông báo mới", intro: "Thông báo đến đúng tài khoản, có trạng thái đọc và đường mở đối tượng liên quan.",
    steps: [["Sự kiện nghiệp vụ","Tin nhắn, chia sẻ, hợp đồng, đề nghị xem, bàn giao hoặc xác minh nhà tạo thông báo tương ứng."],["Hệ thống","Tính bộ đếm chưa đọc; tối đa 3 popup mới, tự ẩn sau 8 giây hoặc đóng bằng X."],["Người nhận","Bấm popup/mở tin nhắn để đến đúng chat và đánh dấu đã đọc."],["Hệ thống","Nếu đang xem trực tiếp đúng chat thì cập nhật dòng tin/đã đọc, không bật popup trùng."]],
    states: ["Chưa đọc → đã đọc; đóng popup không đồng nghĩa đã đọc"],
    rules: [["UI","Chỉ thao tác thông báo của mình; đếm tối đa nhãn 99+, tải lại không phát lại popup cũ. Form/bản nháp đang nhập không bị đóng khi nhận."],["DB","UNIQUE (user_id,event_key) chống thông báo trùng; resource_type và resource_id cùng có hoặc cùng NULL."],["API","Cần WebSocket/SSE đúng người nhận cho nhiều thiết bị; kiểm tra thành viên trước khi mở hội thoại từ thông báo."]],
    data: [["notifications","Người nhận, nội dung, sự kiện, đối tượng, đã đọc/thời điểm."],["users","Cài đặt kênh thông báo."],["chat_messages","Sự kiện tin nhắn gốc."]],
    limits: ["Hiện truyền giữa hai tab cùng nguồn trình duyệt qua storage event; chưa có email, SMS, push hoặc máy chủ realtime."], related: ["room-chat","data-safety"]
  },
  {
    id: "propose-viewing", group: "viewings", title: "Người thuê đề nghị lịch xem, chủ trọ xét duyệt", roles: ["tenant","landlord"], scope: "demo",
    path: "Người thuê → Chi tiết tin / Tin nhắn → Đề nghị lịch xem", intro: "Đề nghị chưa phải lịch đã hẹn và không giữ phòng, giờ hoặc suất thuê.",
    steps: [["Người thuê","Chọn đúng phòng/chủ trọ, ngày giờ tương lai UTC+7, thời lượng và ghi chú."],["Hệ thống","Lưu PENDING với khóa chống gửi trùng; mỗi người chỉ có một đề nghị chờ cho cùng phòng."],["Chủ trọ","Chấp nhận hoặc từ chối có lý do; người gửi có thể rút khi còn chờ/chưa đến giờ."],["Hệ thống","Chấp nhận kiểm tra lại và tạo đúng một lịch SCHEDULED, liên kết ngược với đề nghị."]],
    states: ["PENDING → ACCEPTED / REJECTED / WITHDRAWN / EXPIRED", "ACCEPTED → lịch SCHEDULED có liên kết"],
    rules: [["PROC","sp_request_viewing / sp_review_viewing_proposal / sp_withdraw_viewing_proposal kiểm tra người tham gia, phòng, bài, thời gian và tài khoản."],["DB","Khóa gửi và yêu cầu chờ của người/phòng có ràng buộc duy nhất; duyệt lại trả lịch đã tạo, không tạo thêm."],["PROC","Đã đến giờ thì hết hạn ngay khi kiểm tra, không chờ worker. Khi duyệt phải kiểm tra lại phòng trống, hợp đồng mở và khoảng giờ."],["UI","Đề nghị chờ không giữ giờ; hai đề nghị trùng giờ có thể tồn tại nhưng chỉ một lịch được duyệt nếu xung đột."]],
    data: [["room_viewing_proposals","Đề nghị, người gửi, giờ, trạng thái, kết quả và lịch được tạo."],["room_viewing_requests","Lịch chính thức sau duyệt."],["notifications","Kết quả cho người liên quan."]],
    limits: ["Đổi giờ bằng rút/gửi đề nghị mới hoặc hủy lịch đã chốt. Lịch hủy không xóa lịch sử ACCEPTED của đề nghị."], related: ["schedule-viewing","viewing-outcome","reserve-cleanup"]
  },
  {
    id: "schedule-viewing", group: "viewings", title: "Chủ trọ tự tạo lịch sau khi đã trao đổi", roles: ["landlord","tenant"], scope: "demo",
    path: "Chủ trọ → Tin nhắn / Lịch xem → Tạo lịch xem", intro: "Luồng hẹn trực tiếp tồn tại song song với đề nghị từ người thuê.",
    steps: [["Hai bên","Người thuê đã gửi tin về đúng phòng trong hội thoại với đúng chủ trọ."],["Chủ trọ","Chọn người thuê, phòng, giờ bắt đầu, thời lượng 30/60/90/120 phút và ghi chú."],["Hệ thống","Kiểm tra giờ tương lai, phòng trống, bài hợp lệ và chống trùng lịch; lưu SCHEDULED."],["Hai bên","Xem cùng bản ghi ở Lịch xem và thẻ trong chat."]],
    states: ["Tạo lịch trực tiếp → SCHEDULED"],
    rules: [["UI","Giờ được hiểu theo Việt Nam UTC+7, không theo múi giờ thiết bị; gợi ý mốc nửa giờ có đệm tối thiểu 15 phút."],["PROC","sp_schedule_viewing kiểm tra lại quyền/ngữ cảnh và khóa phòng; cùng phòng không được có hai SCHEDULED giao nhau. Hai lịch liền kề được phép."],["UI","Phòng phải AVAILABLE, chưa có hợp đồng mở hoặc chỗ đang chiếm; chat ROOMMATE không dùng để hẹn chủ trọ."]],
    data: [["conversations","Hội thoại đúng người/phòng."],["chat_messages","Chứng cứ đã trao đổi đúng phòng."],["room_viewing_requests","Khoảng thời gian UTC và lịch chính thức."]],
    limits: ["Có nhiều lịch khác giờ cho một phòng; xem trước không tạo quyền ưu tiên thuê."], related: ["viewing-outcome","create-contract"]
  },
  {
    id: "viewing-outcome", group: "viewings", title: "Xác nhận đã xem, không đến, hủy và ý định thuê", roles: ["tenant","landlord"], scope: "demo",
    path: "Lịch xem / thẻ lịch trong Tin nhắn", intro: "Tách kết quả cuộc hẹn khỏi quyết định thuê của người thuê.",
    steps: [["Chủ trọ","Đến giờ bắt đầu mới ghi nhận đã xem; chỉ sau giờ kết thúc mới ghi nhận không đến."],["Hai bên","Được hủy lịch đang SCHEDULED với lý do, người và thời điểm; giải phóng khoảng giờ."],["Người thuê","Sau COMPLETED mới chọn AGREED hoặc DECLINED."],["Người thuê","Đã AGREED có thể WITHDRAWN khi không còn hợp đồng mở; có hợp đồng thì xử lý hợp đồng trước."]],
    states: ["SCHEDULED → COMPLETED / NO_SHOW / CANCELLED", "WAITING → AGREED / DECLINED; AGREED → WITHDRAWN"],
    rules: [["PROC","sp_set_viewing_outcome xác nhận đúng bên liên quan, giờ thực và trạng thái trước khi chuyển."],["UI","Đồng ý thuê không hủy lịch người khác và không giữ phòng. Nhiều người có thể AGREED, chủ trọ chọn người để gửi hợp đồng."],["UI","Thẻ chat đọc cùng bản ghi lịch, không tạo bản sao hay lịch mới khi tải lại."]],
    data: [["room_viewing_requests","Trạng thái hẹn, xác nhận tham dự, quyết định thuê và lý do hủy."],["contracts","Chặn rút ý định khi còn hợp đồng mở."]],
    limits: ["Không đảo ngược quyết định bằng nút/form cũ; cần theo đúng chuyển trạng thái cho phép."], related: ["create-contract","cancel-contract"]
  },
  {
    id: "create-contract", group: "contracts", title: "Lập hợp đồng thuê mới từ lịch đã xem", roles: ["landlord","tenant"], scope: "demo",
    path: "Chủ trọ → Lịch xem COMPLETED, AGREED → Lập hợp đồng", intro: "Gửi hợp đồng là thời điểm giữ phòng, chưa phải xác nhận người thuê đã vào ở.",
    steps: [["Chủ trọ","Chọn lịch đủ điều kiện, thời hạn, giá/cọc, mẫu điều khoản và thành viên ban đầu."],["Hệ thống","Kiểm tra quyền nhà, phòng trống, hợp đồng mở, sức chứa và người xem đã đồng ý."],["Hệ thống","Tạo hợp đồng PENDING_CONFIRMATION và thành viên PLANNED; người xem là đại diện ban đầu."],["Hệ thống","Giữ phòng, đóng hoạt động xem sắp tới và thông báo trong cùng giao dịch."],["Đại diện","Xem nội dung rồi xác nhận hoặc yêu cầu sửa."]],
    states: ["Hợp đồng PENDING_CONFIRMATION; phòng RESERVED; thành viên PLANNED"],
    rules: [["DB","Mỗi phòng và mỗi lịch chỉ có một hợp đồng mở ở DRAFT/PENDING_CONFIRMATION/CONFIRMED/ACTIVE. Số hợp đồng duy nhất."],["PROC","sp_create_rental_contract kiểm tra lịch COMPLETED + AGREED, thời hạn end ≥ start và tổng thành viên ≤ sức chứa; thất bại rollback toàn bộ."],["PROC","Nhà phải có quyền cho thuê hiệu lực. Không được dùng PAPER_IMPORT để né quy trình thuê mới."],["DB","Lưu riêng người xem/đại diện ban đầu với đại diện hiện tại, để bàn giao không sửa bằng chứng thuê gốc."]],
    data: [["contracts","Hợp đồng, phòng/nhà/chủ trọ, đại diện ban đầu/hiện tại, lịch gốc."],["contract_revisions","Phiên bản điều khoản và thành viên lúc gửi."],["room_tenants","Thành viên ban đầu PLANNED."],["contract_representative_history","Giai đoạn đại diện đầu tiên."]],
    limits: ["Người phụ có thể chưa có tài khoản, vẫn có dòng cư trú riêng. Mở form hoặc bấm AGREED chưa giữ phòng."], related: ["reserve-cleanup","contract-revision","move-in"]
  },
  {
    id: "reserve-cleanup", group: "contracts", title: "Tự xử lý lịch/đề nghị khi hợp đồng giữ phòng", roles: ["landlord","tenant","system"], scope: "demo",
    path: "Tự chạy khi chủ trọ gửi hợp đồng mới", intro: "Các lịch sắp tới của cùng phòng được đóng có dấu vết để tránh tiếp tục hẹn một phòng đã giữ.",
    steps: [["Hệ thống","Đếm hoạt động bị ảnh hưởng khi mở form; khi gửi kiểm tra lại dữ liệu mới nhất."],["Hệ thống","Hủy SCHEDULED chưa bắt đầu; từ chối PENDING còn hạn và chuyển đề nghị quá giờ thành EXPIRED."],["Hệ thống","Giữ các lịch đã xem, đã hủy, không đến, đang diễn ra hoặc quá giờ để đối soát."],["Hệ thống","Thông báo người liên quan và tổng kết cho chủ trọ, cùng giao dịch tạo hợp đồng."]],
    states: ["Lịch tương lai SCHEDULED → CANCELLED", "Đề nghị còn hạn PENDING → REJECTED; quá giờ → EXPIRED"],
    rules: [["PROC","Xử lý theo room_id trên mọi bài đăng của phòng, không chỉ bài dùng tạo hợp đồng."],["PROC","Lưu lý do, người, thời điểm; lỗi tạo hợp đồng hoặc thông báo phải rollback giữ phòng và toàn bộ việc đóng lịch."],["UI","Hủy hợp đồng về sau không tự khôi phục lịch/đề nghị và không tự mời lại người thuê cũ."]],
    data: [["contracts","Nguồn giữ phòng."],["room_viewing_requests","Lịch được hủy có dấu vết."],["room_viewing_proposals","Đề nghị được đóng/hết hạn."],["notifications","Thông báo đúng các bên."]],
    limits: ["Lịch đã diễn ra/đang diễn ra không bị biến thành hủy tự động."], related: ["cancel-contract","propose-viewing"]
  },
  {
    id: "contract-revision", group: "contracts", title: "Xác nhận nội dung hoặc yêu cầu sửa hợp đồng", roles: ["tenant","landlord"], scope: "demo",
    path: "Hợp đồng → Xem chi tiết → Xác nhận / Yêu cầu sửa", intro: "Xác nhận điều khoản và xác nhận đã thực tế vào ở là hai bước khác nhau.",
    steps: [["Đại diện hiện tại","Xem phiên bản đang chờ; xác nhận hoặc gửi nội dung cần sửa."],["Hệ thống","Nếu cần sửa, hủy phiên bản chờ cũ và tạo bản nháp tiếp theo."],["Chủ trọ","Chỉnh ngày kết thúc, giá, điều khoản rồi gửi lại phiên bản mới."],["Đại diện","Xác nhận bản đang chờ; hợp đồng CONFIRMED, thành viên vẫn PLANNED."]],
    states: ["PENDING_CONFIRMATION → CONFIRMED", "Yêu cầu sửa → phiên bản cũ CANCELLED + bản DRAFT → PENDING_CONFIRMATION"],
    rules: [["DB","Số phiên bản duy nhất theo hợp đồng; bản xác nhận ghi nhận đúng đại diện và dữ liệu tại thời điểm đó."],["UI","Chỉ đại diện đang có quyền xác nhận; thuê mới phải kiểm tra lại quyền cho thuê của nhà khi gửi/xác nhận."],["UI","Không tự ACTIVE hợp đồng hoặc ghi ngày vào ở chỉ vì xác nhận nội dung."]],
    data: [["contracts","Trạng thái tổng và phiên bản hiện tại."],["contract_revisions","Nội dung, ngày/giá, thành viên chụp lại, người/thời điểm xác nhận."]],
    limits: ["Wireframe mô phỏng xác nhận; chưa có chữ ký điện tử, tài liệu ký số hoặc dịch vụ ký từ xa."], related: ["move-in","templates","cancel-contract"]
  },
  {
    id: "move-in", group: "contracts", title: "Xác nhận người thuê thực tế vào ở", roles: ["landlord","tenant"], scope: "demo",
    path: "Chủ trọ → Hợp đồng → Xác nhận vào ở / xác nhận từng thành viên", intro: "Một nhóm có thể vào ở cùng lúc hoặc từng người; chưa đến vẫn giữ trạng thái dự kiến.",
    steps: [["Chủ trọ","Chọn một hoặc nhiều thành viên PLANNED đã thực tế đến và ngày chuyển vào."],["Hệ thống","Kiểm tra phiên bản xác nhận, thời hạn, sức chứa và tài khoản đang có lượt ở khác."],["Hệ thống","Lần đầu phải có đại diện: chuyển người được chọn ACTIVE, hợp đồng ACTIVE, phòng OCCUPIED."],["Chủ trọ","Xác nhận các thành viên còn PLANNED vào ngày khác khi họ thực sự đến."]],
    states: ["PLANNED → ACTIVE", "CONFIRMED → ACTIVE (Còn hiệu lực)"],
    rules: [["PROC","sp_confirm_move_in không cho ngày tương lai hoặc ngoài thời hạn; lần kích hoạt phải có đại diện, quyền nhà của thuê mới còn hiệu lực."],["DB","Một tài khoản chỉ có một lượt ACTIVE toàn hệ thống; người chưa có tài khoản vẫn có dòng riêng."],["DB","ACTIVE/LEFT cần người và thời điểm xác nhận vào; PLANNED có ngày dự kiến, chưa có ngày vào/ra."],["UI","Danh sách hợp đồng/người ở giữ người chưa đến để không làm mất chỗ dự kiến."]],
    data: [["room_tenants","Ngày dự kiến/thực tế, trạng thái, người xác nhận."],["contracts","Thời điểm kích hoạt và trạng thái."],["rooms","Tình trạng OCCUPIED."]],
    limits: ["Không cho tài khoản đang ở nơi khác vào thêm lượt ACTIVE; phải giải quyết lượt ở trước."], related: ["cancel-contract","residents","join-hold"]
  },
  {
    id: "cancel-contract", group: "contracts", title: "Hủy trước vào ở, hủy người dự kiến và nhập giấy", roles: ["landlord","tenant","system"], scope: "partial",
    path: "Hợp đồng chưa vào ở → Hủy · Người ở → Hủy dự kiến", intro: "Giải phóng chỗ đúng ngữ cảnh, giữ nguyên bằng chứng đã tồn tại.",
    steps: [["Chủ trọ / Bên có quyền","Hủy hợp đồng DRAFT/PENDING_CONFIRMATION/CONFIRMED với lý do khi chưa vào ở."],["Hệ thống","Chuyển thành viên dự kiến CANCELLED, đóng yêu cầu còn mở và giải phóng phòng."],["Chủ trọ","Có thể hủy một người dự kiến không đến; không hủy riêng đại diện dự kiến để né xử lý hợp đồng."],["Máy chủ","PAPER_IMPORT lưu hợp đồng đã ký/đang có; chỉ dành cho đường nhập được phân quyền riêng."]],
    states: ["Hợp đồng chưa ACTIVE → CANCELLED", "PLANNED → CANCELLED"],
    rules: [["PROC","sp_cancel_contract / sp_cancel_planned_member yêu cầu đúng quyền, trạng thái và lý do; không giả ngày vào/ra cho người chưa ở."],["DB","PAPER_IMPORT có tài liệu hợp đồng giấy và ngữ cảnh nguồn riêng; không bắt buộc lịch xem như NEW_RENTAL."],["UI","Không khôi phục lịch xem cũ sau hủy; cần tạo lịch mới. Hợp đồng đã ACTIVE đi theo luồng chấm dứt/rời phòng."]],
    data: [["contracts","Nguồn NEW_RENTAL/PAPER_IMPORT/TRANSFER và lý do đóng."],["room_tenants","Lượt dự kiến bị hủy."],["files","Tài liệu hợp đồng giấy."],["contract_revisions","Phiên bản đã nhập/ký."]],
    limits: ["Demo có dữ liệu nhập giấy mẫu, chưa có form nhập hợp đồng giấy đầy đủ."], related: ["end-lease","residents"]
  },
  {
    id: "residents", group: "residents", title: "Danh sách người ở, lịch sử và xuất CSV", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Người ở · Hợp đồng → thành viên / lịch sử", intro: "Lượt cư trú là bằng chứng ai thực tế ở, không lấy mỗi tên đại diện để thay danh sách cư dân.",
    steps: [["Chủ trọ","Xem người ACTIVE, PLANNED, đã LEFT và đã hủy dự kiến theo phòng/hợp đồng."],["Hệ thống","Giữ hiển thị ACTIVE kể cả hợp đồng cũ đóng sai, kèm yêu cầu đối soát."],["Chủ trọ","Xuất danh sách đang ở hoặc xử lý vào/rời, yêu cầu thêm người, bàn giao đại diện."]],
    states: ["PLANNED / ACTIVE / LEFT / CANCELLED"],
    rules: [["DB","FK ghép giữ đúng người-hợp đồng-phòng; một tài khoản không có hai thành viên mở trùng cùng hợp đồng."],["UI","CSV người đang ở dựa vào ACTIVE, không lọc mất người bằng trạng thái hợp đồng."],["API","Danh tính cư dân chỉ trả cho chủ quản lý/quản trị có quyền, không công khai căn cước/ngày sinh."]],
    data: [["room_tenants","Danh tính, tài khoản tùy chọn, thời gian ở và nguồn tiếp nhận."],["contracts","Ngữ cảnh hợp đồng và đại diện."],["contract_representative_history","Ai đại diện từng giai đoạn."]],
    limits: ["Không tự sửa dữ liệu lịch sử mâu thuẫn bằng suy đoán ngày rời phòng."], related: ["departure","handover","join-consent"]
  },
  {
    id: "join-consent", group: "residents", title: "Đề nghị thêm người và hai đồng ý thuê chung", roles: ["tenant","landlord"], scope: "partial",
    path: "Nghiệp vụ thuê chung → yêu cầu thêm người → Chủ trọ / Người ở", intro: "Kết nối bạn ghép không thay thế đồng thuận thuê của đại diện hiện tại và người xin vào.",
    steps: [["Đại diện / Người xin vào","Trao đổi nhu cầu và cung cấp hai đồng ý riêng cho việc thuê chung."],["Máy chủ","Kiểm tra đại diện hiện tại, hợp đồng và người xin vào; lưu ai đồng ý, lúc nào."],["Hệ thống","Chỉ khi đủ hai đồng ý mới chuyển yêu cầu tới chủ trọ."],["Chủ trọ","Xét duyệt thực tế theo hạn hợp đồng và số chỗ."]],
    states: ["PENDING_CONSENT → PENDING_LANDLORD", "PENDING_LANDLORD → APPROVED / REJECTED / CANCELLED"],
    rules: [["DB","PENDING_LANDLORD/APPROVED/COMPLETED bắt buộc cả hai đồng ý; người đồng ý xin vào phải chính applicant_id."],["DB","Một yêu cầu mở cho một applicant + hợp đồng; applicant khác requested_by."],["UI","Lời mời từ đại diện cũ vẫn kết nối được, nhưng khi xin ở phải lấy đồng ý mới từ đại diện hiện tại."],["API","Khóa và kiểm tra hợp đồng ACTIVE, đại diện còn ở và tài khoản; không sao chép ACCEPTED từ roommate_requests."]],
    data: [["occupant_join_requests","Hai đồng ý, người xin vào, ngày dự kiến, đại diện tại lúc yêu cầu."],["roommate_requests","Ngữ cảnh kết nối, không phải bằng chứng thuê."],["contracts","Hợp đồng và đại diện hiện tại."]],
    limits: ["Demo có yêu cầu/đồng ý mẫu và xử lý duyệt, chưa có đầy đủ form hai bên tạo/xác nhận yêu cầu mới."], related: ["join-hold","handover"]
  },
  {
    id: "join-hold", group: "residents", title: "Duyệt thêm người, giữ 48 giờ và hoàn tất vào ở", roles: ["landlord","tenant","system"], scope: "demo",
    path: "Chủ trọ → Người ở → Yêu cầu thêm người", intro: "Duyệt giữ một chỗ có hạn; hoàn tất mới tạo lượt ở thực tế.",
    steps: [["Chủ trọ","Kiểm tra hai đồng ý, hợp đồng ACTIVE, đại diện ACTIVE, ngày dự kiến và còn chỗ."],["Hệ thống","APPROVED giữ một chỗ trong 48 giờ; từ chối cần lý do. Có thể hủy giữ chỗ."],["Chủ trọ","Khi người xin vào đến thực tế, xác nhận hoàn tất."],["Hệ thống","Kiểm tra lại hạn giữ/hợp đồng/sức chứa/tài khoản rồi tạo ACTIVE và liên kết yêu cầu-lượt ở hai chiều."]],
    states: ["PENDING_LANDLORD → APPROVED → COMPLETED", "APPROVED → CANCELLED / EXPIRED; chờ → REJECTED"],
    rules: [["PROC","sp_approve_occupant_join tính người ở + người dự kiến + chỗ giữ còn hạn; hai phiên tranh chỗ chỉ một được duyệt."],["PROC","sp_complete_occupant_join kiểm tra lại dù trước đó đã duyệt; hết hạn không được hoàn tất kể cả worker chưa chạy."],["DB","join_request_id và completed_room_tenant_id được ràng buộc đúng hợp đồng/người; gửi lặp không tạo thêm lượt ở."],["UI","48 giờ là chính sách hiện tại của demo, cần cấu hình chính sách máy chủ khi triển khai."]],
    data: [["occupant_join_requests","Quyết định, hold_expires_at và lượt ở được tạo."],["room_tenants","Lượt ACTIVE nguồn APPROVED_JOIN."],["rooms","Sức chứa dùng chung."]],
    limits: ["Giữ chỗ cho người ở ghép khác với giữ cả phòng bằng hợp đồng mới."], related: ["rooms","departure"]
  },
  {
    id: "departure", group: "residents", title: "Thành viên rời phòng và người cuối cùng rời", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Người ở → Xác nhận rời", intro: "Đóng đúng lượt cư trú, giữ người còn ở và lịch sử đã phát sinh.",
    steps: [["Chủ trọ","Chọn người đã thực tế rời và ngày rời hợp lệ."],["Hệ thống","Thành viên thường chuyển LEFT; các thành viên khác giữ nguyên."],["Hệ thống","Nếu là đại diện và còn người thì chuyển sang bàn giao, không tự đóng hợp đồng."],["Hệ thống","Người cuối cùng rời, không còn thành viên mở thì kết thúc hợp đồng, đóng giai đoạn đại diện và hủy yêu cầu mở."]],
    states: ["ACTIVE → LEFT", "Hết thành viên mở → hợp đồng kết thúc; phòng tính lại"],
    rules: [["DB","LEFT cần ngày ra ≥ ngày vào, người và thời điểm xác nhận ra."],["PROC","sp_move_out thực hiện đồng bộ lịch sử, hợp đồng và tình trạng phòng; không chỉ đổi nhãn phòng."],["UI","Hợp đồng đang có vẫn xử lý rời phòng/kết thúc được khi quyền cho thuê nhà hết hạn hoặc bị thu hồi."]],
    data: [["room_tenants","Ngày/người/thời điểm xác nhận rời."],["contracts","Kết thúc khi không còn thành viên mở."],["contract_representative_history","Đóng giai đoạn đại diện."],["occupant_join_requests","Hủy yêu cầu mở khi kết thúc."]],
    limits: ["Thành viên PLANNED chưa đến dùng hủy dự kiến, không chuyển LEFT với ngày vào giả."], related: ["handover","cancel-contract"]
  },
  {
    id: "handover", group: "residents", title: "Bàn giao đại diện khi người đại diện rời", roles: ["landlord","tenant"], scope: "demo",
    path: "Người ở → đại diện → Xác nhận rời → Bàn giao · Hợp đồng → Lịch sử đại diện", intro: "Giữ hợp đồng đang thuê và người còn ở; thay đại diện có chứng cứ, không ghi đè lịch sử.",
    steps: [["Hệ thống","Tìm người cùng hợp đồng đang ACTIVE, có tài khoản và không bị khóa."],["Chủ trọ","Một người đủ điều kiện được chọn sẵn; nhiều người phải chọn. Nhập lý do và ghi nhận người nhận đã đồng ý."],["Hệ thống","Kiểm tra lại đại diện/người nhận; đóng giai đoạn cũ, ghi người cũ LEFT, đổi đại diện và mở giai đoạn mới."],["Hệ thống","Hủy yêu cầu thêm người/điều chỉnh đang mở để không dùng đồng ý người cũ; thông báo hai đại diện."]],
    states: ["Đại diện cũ → giai đoạn đóng; đại diện mới → giai đoạn hiện hành", "Hợp đồng vẫn ACTIVE, phòng vẫn OCCUPIED"],
    rules: [["PROC","sp_handover_representative xử lý trong một giao dịch; không chọn PLANNED/LEFT, người khác hợp đồng hoặc người bị khóa."],["DB","Một giai đoạn đại diện hiện hành/hợp đồng; chuỗi trước-sau đúng hợp đồng; lịch sử đã ghi bất biến."],["UI","Giữ số hợp đồng, phòng, giá/cọc, thời hạn, người xem gốc, phiên bản đã xác nhận và người trả hóa đơn cũ."],["UI","Không còn người đủ điều kiện nhưng vẫn còn thành viên mở thì phải hoàn tất thông tin/vào ở trước; chưa cho đại diện cũ rời."]],
    data: [["contract_representative_history","Người, tên tại lúc nhận, bắt đầu/kết thúc, người ghi nhận, đồng thuận và lý do."],["contracts","Đại diện hiện tại tách khỏi đại diện/khách xem ban đầu."],["room_tenants","Người cũ rời, người mới vẫn đang ở."],["notifications","Thông báo bàn giao."]],
    limits: ["Demo là chủ trọ ghi nhận đồng ý, chưa phải người nhận tự đăng nhập ký phụ lục. Dữ liệu cũ không biết thời điểm nhận thì để chưa rõ, không đoán theo ngày ký."], related: ["change-request","bill","join-consent"]
  },
  {
    id: "change-request", group: "changes", title: "Luồng chung yêu cầu điều chỉnh hợp đồng", roles: ["tenant","landlord"], scope: "demo",
    path: "Người thuê → Hợp đồng → Chi tiết → Yêu cầu · Chủ trọ → Hợp đồng → Yêu cầu gia hạn / điều chỉnh", intro: "Cả hai bên phải thống nhất phương án, sau đó chủ trọ mới áp dụng đúng ngày hiệu lực.",
    steps: [["Đại diện hiện tại","Gửi RENEWAL / TRANSFER / TERMINATION, ngày hiệu lực và nội dung."],["Chủ trọ","Chấp nhận hoặc từ chối với lý do."],["Đại diện","Xác nhận phương án đã được chấp nhận."],["Chủ trọ","Đến ngày hiệu lực, kiểm tra lại phiên bản/đại diện/điều kiện rồi áp dụng."]],
    states: ["PENDING → APPROVED_WAITING_CONFIRMATION → READY_TO_APPLY → COMPLETED", "PENDING → REJECTED; CANCELLED / EXPIRED có trong CSDL"],
    rules: [["DB","Mỗi hợp đồng chỉ có một yêu cầu điều chỉnh mở; READY_TO_APPLY/COMPLETED cần người/thời điểm duyệt và xác nhận."],["UI","Chỉ đại diện gửi/xác nhận; chỉ chủ quản lý duyệt/áp dụng. Bàn giao đại diện hủy yêu cầu cũ."],["PROC","sp_apply_contract_change kiểm tra lại hợp đồng ACTIVE, phiên bản gốc, ngày hiệu lực và ghi kết quả cùng giao dịch."],["UI","Gửi, chấp nhận hoặc xác nhận chưa làm thay đổi hợp đồng. Ngày hiệu lực không trước ngày bắt đầu hoặc ngày vào của người đang ở."]],
    data: [["contract_change_requests","Loại, phương án, phiên bản gốc, đại diện, duyệt/xác nhận/áp dụng."],["contracts","Hợp đồng nguồn."],["contract_revisions","Phiên bản đề xuất/kết quả."]],
    limits: ["Chưa có trình chỉnh giá/điều khoản tùy ý trong form gia hạn; thay đổi trên UI hiện chủ yếu là gia hạn, đổi phòng và chấm dứt."], related: ["renewal","transfer","end-lease"]
  },
  {
    id: "renewal", group: "changes", title: "Gia hạn thời hạn hợp đồng", roles: ["tenant","landlord"], scope: "demo",
    path: "Hợp đồng → Chi tiết → Yêu cầu gia hạn", intro: "Giữ phòng/người ở và tăng thời hạn bằng phương án hai bên đã đồng ý.",
    steps: [["Đại diện","Nhập ngày hiệu lực, ngày kết thúc mới và lý do; form gợi ý thêm một năm."],["Chủ trọ → Đại diện","Chấp nhận rồi xác nhận đúng phương án."],["Chủ trọ","Đến ngày hiệu lực, áp dụng; ngày kết thúc tăng theo phương án đã xác nhận."],["Hệ thống","Tăng số phiên bản và lưu liên kết yêu cầu, không thay người ở."]],
    states: ["RENEWAL theo luồng duyệt chung → COMPLETED"],
    rules: [["UI","Ngày kết thúc mới phải sau ngày kết thúc cũ; phải còn đúng phiên bản và đại diện lúc yêu cầu."],["PROC","Gia hạn cần quyền cho thuê nhà hiệu lực và thời điểm áp dụng hợp lệ; trigger chặn tăng end_date khi thiếu quyền."],["DB","Giữ phiên bản cũ để truy vết, không ghi đè nội dung đã ký chỉ để mất lịch sử."]],
    data: [["contract_change_requests","Ngày kết thúc mới trong phương án."],["contracts","Ngày kết thúc sau áp dụng."],["contract_revisions","Phiên bản gia hạn."]],
    limits: ["Luồng chưa thương lượng giá/điều khoản mới đầy đủ; demo không dùng API hoặc ký số."], related: ["change-request","house-rights-expiry"]
  },
  {
    id: "transfer", group: "changes", title: "Đổi sang phòng khác và tạo hợp đồng chuyển phòng", roles: ["tenant","landlord"], scope: "demo",
    path: "Hợp đồng → Chi tiết → Yêu cầu thay đổi → chọn phòng đích", intro: "Chuyển toàn bộ nhóm thành viên còn mở, giữ liên kết lịch sử giữa hai hợp đồng.",
    steps: [["Đại diện và chủ trọ","Thống nhất phòng đích/ngày hiệu lực qua yêu cầu điều chỉnh."],["Hệ thống","Kiểm tra phòng khác cùng chủ, trống, không hợp đồng/chỗ chiếm, đủ cho toàn bộ người ACTIVE/PLANNED và quyền nhà đích."],["Chủ trọ","Áp dụng sau mọi kiểm tra; đóng lượt nguồn, tạo hợp đồng TRANSFER và thành viên PLANNED mới."],["Chủ trọ","Tiếp tục xác nhận vào ở thực tế tại phòng đích theo nhóm hoặc từng người."]],
    states: ["Nguồn: ACTIVE → TERMINATED, người đang ở → LEFT", "Đích: CONFIRMED + PLANNED; phòng RESERVED → OCCUPIED khi vào"],
    rules: [["PROC","Phải kiểm tra toàn bộ trước khi đóng nguồn; lỗi ở bất kỳ bước nào rollback cả nguồn/đích."],["DB","previous_contract_id và result_contract_id giữ liên kết, các thành viên mới thuộc đúng phòng/hợp đồng."],["UI","Không mang người LEFT/CANCELLED hoặc thông tin xác nhận cũ sang; không chỉ chuyển tên đại diện và bỏ người còn lại."]],
    data: [["contracts","Hợp đồng nguồn/đích, nguồn TRANSFER và liên kết trước đó."],["room_tenants","Đóng nguồn, tạo lượt dự kiến tại đích."],["contract_change_requests","Phòng đích và hợp đồng kết quả."],["contract_representative_history","Chuỗi đại diện riêng từng hợp đồng."]],
    limits: ["Đích không đủ chỗ hoặc mất quyền cho thuê thì chưa thay đổi hợp đồng nguồn."], related: ["move-in","rooms","house-proof"]
  },
  {
    id: "end-lease", group: "changes", title: "Yêu cầu chấm dứt và đóng hợp đồng", roles: ["tenant","landlord"], scope: "demo",
    path: "Hợp đồng → Chi tiết → Yêu cầu chấm dứt", intro: "Kết thúc có ngày hiệu lực và đóng từng lượt ở, không chỉ đổi nhãn hợp đồng.",
    steps: [["Đại diện → Chủ trọ → Đại diện","Gửi, chấp nhận và xác nhận phương án chấm dứt."],["Chủ trọ","Áp dụng khi đến ngày và còn đúng điều kiện."],["Hệ thống","Người ACTIVE ghi ngày ra, người chưa đến CANCELLED; đóng đại diện hiện hành và yêu cầu mở."],["Hệ thống","Tính lại phòng, giữ hợp đồng/hóa đơn/bản ký/lịch sử cho các bên từng tham gia."]],
    states: ["Yêu cầu TERMINATION → COMPLETED", "Hợp đồng ACTIVE → TERMINATED"],
    rules: [["PROC","Ngày hiệu lực không trước ngày vào ở của thành viên đang ở; không được đóng hợp đồng mà bỏ lại lượt ACTIVE/PLANNED không xử lý."],["UI","Quyền cho thuê hết hiệu lực không ngăn kết thúc hợp đồng cũ."],["DB","Đóng lưu thời điểm/lý do/người xử lý theo ngữ cảnh, giữ bản ghi cư trú và liên kết hóa đơn."]],
    data: [["contracts","Trạng thái và lý do đóng."],["contract_change_requests","Phương án chấm dứt."],["room_tenants","Ngày ra hoặc hủy dự kiến."],["contract_representative_history","Kết thúc giai đoạn đại diện."],["invoices","Nghĩa vụ cũ không bị xóa."]],
    limits: ["Chưa mô phỏng quyết toán cọc hoặc tự động kết thúc vì đến hạn; EXPIRED có trong SQL nhưng cần tác vụ máy chủ phù hợp."], related: ["departure","pay-invoice"]
  },
  {
    id: "services", group: "billing", title: "Dịch vụ theo nhà và giá riêng theo phòng", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Dịch vụ → chọn nhà / phòng", intro: "Giá nhà là mặc định; phòng được kế thừa hoặc có giá riêng mà không sửa kỳ đã phát hành.",
    steps: [["Chủ trọ","Tạo dịch vụ, đơn vị, giá và cách tính cho nhà; nhà chưa có phòng vẫn cấu hình được."],["Chủ trọ","Bật dịch vụ tại phòng và nhập giá riêng nếu cần."],["Hệ thống","Lập kỳ mới chỉ dùng dịch vụ đang bật cả hai cấp và lấy giá riêng nếu khác NULL."],["Chủ trọ","Ngừng dịch vụ khi cần; hóa đơn cũ giữ nguyên dữ liệu tiền."]],
    states: ["Dịch vụ tại nhà active / ngừng; áp dụng tại phòng active / ngừng"],
    rules: [["DB","Tách danh mục rental_services, cấu hình house_services và gán room_services; FK bảo đảm dịch vụ/phòng đúng nhà."],["UI","Tên dịch vụ không trùng trong nhà; giá không âm, phương pháp METERED/PER_PERSON/PER_ROOM."],["UI","Giá riêng 0 được chấp nhận; bỏ trống/NULL mới kế thừa. Không áp dụng dịch vụ của nhà khác."],["DB","invoice_items lưu đơn giá và phương pháp tại lúc lập để thay đổi cấu hình không sửa hóa đơn lịch sử."]],
    data: [["rental_services","Danh mục dịch vụ."],["house_services","Đơn vị, giá, phương pháp và trạng thái tại nhà."],["room_services","Gán dịch vụ cho phòng, giá riêng."],["invoice_items","Bản chụp giá/phương pháp khi tính tiền."]],
    limits: ["Demo giữ cấu hình danh mục/nhà trong mảng services; API phải ánh xạ thành các bảng tương ứng."], related: ["bill","room-detail"]
  },
  {
    id: "bill", group: "billing", title: "Lập và sửa bản nháp hóa đơn", roles: ["landlord"], scope: "demo",
    path: "Chủ trọ → Hóa đơn → Lập hóa đơn → Lưu nháp", intro: "Tính tiền theo hợp đồng và cấu hình dịch vụ hiện tại, lưu dữ liệu kỳ đó để truy vết.",
    steps: [["Chủ trọ","Chọn hợp đồng ACTIVE, kỳ tháng và hạn thanh toán."],["Hệ thống","Thêm tiền thuê; theo phòng lấy 1, theo người lấy số ACTIVE tại lúc lập, đồng hồ lấy cuối trừ đầu."],["Chủ trọ","Nhập chỉ số, khoản khác và giảm trừ rồi lưu DRAFT; có thể sửa bản nháp."],["Hệ thống","Lưu người trả hiện tại, dòng tiền và đơn giá của kỳ; không chuyển nghĩa vụ hóa đơn cũ khi đổi đại diện."]],
    states: ["Chưa có kỳ → DRAFT; sửa vẫn DRAFT"],
    rules: [["DB","Mỗi contract_id + billing_period chỉ có một hóa đơn chưa CANCELLED; kỳ là ngày đầu tháng."],["DB","Số lượng/đơn giá không âm; amount = ROUND(quantity × unit_price,2). Đồng hồ cuối ≥ đầu ≥ 0, số lượng bằng chênh lệch."],["DB","Theo phòng có quantity=1; theo người là số nguyên. Hóa đơn giữ dữ liệu đại diện/người trả và phiên bản hợp đồng tại lúc lập."],["UI","Tổng = tiền thuê + dịch vụ + khoản khác − giảm trừ, không được âm; người chưa ACTIVE không tính vào dịch vụ theo người."]],
    data: [["invoices","Kỳ, người trả, hạn, trạng thái, hợp đồng/phiên bản và số người tại lúc lập."],["invoice_items","Dòng tiền, phương pháp, chỉ số, số lượng và đơn giá chụp lại."],["room_services","Nguồn dịch vụ áp dụng."]],
    limits: ["Cần API kiểm tra quyền/tổng tiền toàn diện; một số đầu vào demo còn dựa vào kiểm tra form HTML."], related: ["pay-invoice","handover"]
  },
  {
    id: "pay-invoice", group: "billing", title: "Phát hành, thu tiền, hủy và hóa đơn quá hạn", roles: ["landlord","tenant","system"], scope: "partial",
    path: "Hóa đơn → Chi tiết → Phát hành / Thu tiền / Hủy", intro: "Sau phát hành, nội dung hóa đơn là lịch sử cần bảo toàn.",
    steps: [["Chủ trọ","Kiểm tra bản nháp có dòng tiền rồi phát hành thành UNPAID."],["Người thuê","Xem hóa đơn của mình; chủ trọ ghi nhận đã thu để chuyển PAID."],["Chủ trọ","Nếu cần hủy hóa đơn đã phát hành, ghi lý do và giữ bản cũ."],["Máy chủ","CSDL có OVERDUE và liên kết hóa đơn thay thế; cần bổ sung tác vụ/quy trình đầy đủ."]],
    states: ["DRAFT → UNPAID → PAID", "UNPAID → CANCELLED; OVERDUE có trong CSDL"],
    rules: [["PROC","Trigger cấm sửa/xóa dòng tiền của hóa đơn đã phát hành; thay giá dịch vụ không cập nhật hóa đơn cũ."],["DB","PAID cần paid_by_id và paid_at; CANCELLED cần người/thời điểm/lý do. Hóa đơn thay thế phải cùng hợp đồng/kỳ theo FK."],["UI","Demo cho chủ trọ ghi nhận thu toàn bộ; không có thanh toán trực tuyến hoặc thu một phần."],["UI","Người trả cũ vẫn xem hóa đơn của mình sau bàn giao; kỳ mới lấy đại diện hiện tại."]],
    data: [["invoices","Phát hành, người trả/thu, thời điểm, hủy và liên kết thay thế."],["invoice_items","Nội dung bất biến sau phát hành."]],
    limits: ["Chưa có cổng thanh toán, đối soát ngân hàng, biên nhận số hoặc worker quá hạn thực."], related: ["bill","end-lease"]
  },
  {
    id: "review", group: "moderation", title: "Đánh giá phòng theo bằng chứng đã thuê", roles: ["tenant","admin"], scope: "partial",
    path: "Người thuê → Hợp đồng đã chấm dứt → Đánh giá phòng", intro: "Đánh giá gắn một lượt thuê thực tế, không chỉ một tài khoản bất kỳ nhìn thấy bài.",
    steps: [["Người thuê","Mở hợp đồng đã chấm dứt có lượt cư trú của mình, chọn Đánh giá phòng, nhập sao và nhận xét."],["Wireframe","Chặn đánh giá trùng theo hợp đồng rồi hiển thị nhận xét."],["Máy chủ","Khi tích hợp, lấy đúng room_tenant_id của người đánh giá và kiểm tra chính sách thời điểm/nội dung."],["Quản trị","SQL có trạng thái ẩn/xóa đánh giá để kiểm duyệt; UI chưa mô phỏng đủ quy trình."]],
    states: ["PUBLISHED / HIDDEN / DELETED (CSDL)"],
    rules: [["DB","Rating từ 1 đến 5; UNIQUE (reviewer_id,room_id,contract_id). FK ghép tới room_tenants giữ đúng người-phòng-hợp đồng làm bằng chứng."],["UI","Demo kiểm tra thành viên ACTIVE/LEFT và chống trùng contractId; mức chống trùng này chưa giống hoàn toàn cặp khóa SQL."],["API","Điều kiện lúc nào được đánh giá, hạn sửa và kiểm duyệt cần được chốt/kiểm tra trên máy chủ; không khẳng định SQL đã áp dụng đủ chính sách này."]],
    data: [["reviews","Người đánh giá, lượt ở chứng minh, sao, nội dung và trạng thái."],["room_tenants","Chứng cứ đã thực tế cư trú."]],
    limits: ["Nút hiện khi hợp đồng TERMINATED; handler hiện kiểm tra thành viên ACTIVE/LEFT, chưa kiểm tra đầy đủ chính sách thời điểm. Chưa có luồng sửa/phản hồi/kiểm duyệt đánh giá đầy đủ."], related: ["report","residents"]
  },
  {
    id: "report", group: "moderation", title: "Báo cáo vi phạm và kết luận xử lý", roles: ["tenant","admin"], scope: "partial",
    path: "Chi tiết tin → Báo cáo · Quản trị → Báo cáo → xử lý", intro: "Ghi nhận phản ánh theo đúng đối tượng và giữ kết luận có người xử lý.",
    steps: [["Người thuê","Mở đúng bài được phép xem, nhập lý do và gửi báo cáo."],["Quản trị","Xem phản ánh, kiểm tra đối tượng và ghi kết luận."],["Hệ thống","Giữ trạng thái RESOLVED và nhật ký; thao tác ẩn bài/khóa tài khoản được làm theo luồng tương ứng."],["Máy chủ","CSDL mở rộng cho tranh chấp hợp đồng, người dùng hoặc kết nối, ngoài form báo cáo bài hiện có."]],
    states: ["PENDING → RESOLVED (demo)", "INVESTIGATING / DISMISSED: có trong CSDL"],
    rules: [["DB","Một report nhắm đúng một trong reported_user_id / reported_post_id / contract_id / roommate_request_id."],["DB","RESOLVED/DISMISSED cần resolution, handled_by_id và handled_at; type thuộc VIOLATION/DISPUTE."],["API","Chỉ người có quyền đọc đối tượng mới gửi/xem dữ liệu tương ứng; bằng chứng báo cáo là tệp riêng tư."],["UI","Kết luận báo cáo không tự ẩn bài hoặc khóa tài khoản; đó là quyết định riêng có lý do."]],
    data: [["reports","Người báo cáo, đối tượng duy nhất, loại và kết luận."],["files","Minh chứng nếu triển khai upload."],["moderation_actions","Quyết định quản trị liên quan."]],
    limits: ["Wireframe hiện chủ yếu báo cáo tin; chưa có quy trình tranh chấp/đính kèm minh chứng đầy đủ."], related: ["moderate-post","lock-account","audit"]
  },
  {
    id: "lock-account", group: "moderation", title: "Khóa và mở khóa tài khoản", roles: ["admin"], scope: "partial",
    path: "Quản trị → Tài khoản → Khóa / Mở khóa", intro: "Quyết định quản trị có lý do; các thao tác quan trọng phải kiểm tra lại trạng thái tài khoản.",
    steps: [["Quản trị","Chọn tài khoản, nhập lý do khóa hoặc mở khóa."],["Wireframe","Cập nhật danh sách tài khoản khóa và ghi audit."],["Hệ thống","Các luồng đã có kiểm tra khóa chặn thao tác tương ứng; quyền nhà của chủ bị khóa không còn hiệu lực."],["Máy chủ","Cần chặn tập trung trên mọi request và thu hồi phiên khi chính sách yêu cầu."]],
    states: ["ACTIVE ↔ LOCKED; DISABLED có trong SQL"],
    rules: [["DB","users lưu locked_at, locked_by_id, lock_reason và trạng thái hợp lệ."],["UI","Khóa/mở cần lý do; các kiểm tra ở demo chưa bao phủ toàn bộ handler như middleware máy chủ."],["API","Không chỉ ẩn nút: chặn request, xử lý phiên đang mở và kiểm soát quyền quản trị trên máy chủ."]],
    data: [["users","Trạng thái và lý do/người khóa."],["auth_sessions","Thu hồi phiên theo chính sách."],["moderation_actions","Nhật ký khóa/mở."]],
    limits: ["Đây là mô phỏng quyết định, chưa phải cơ chế ngăn truy cập bảo mật trên máy chủ."], related: ["sessions","house-rights-expiry"]
  },
  {
    id: "templates", group: "moderation", title: "Mẫu hợp đồng và phiên bản mẫu", roles: ["admin","landlord"], scope: "demo",
    path: "Quản trị → Mẫu hợp đồng · Chủ trọ → Lập hợp đồng → chọn mẫu", intro: "Mẫu giúp điền nội dung nhưng không sửa ngược hợp đồng đã gửi hoặc ký.",
    steps: [["Quản trị","Tạo nội dung mẫu; cùng tên tạo phiên bản tiếp theo."],["Quản trị","Bật/ngừng mẫu để điều khiển mẫu dùng cho hợp đồng mới."],["Chủ trọ","Chọn mẫu đang bật, kiểm tra/chỉnh điều khoản trước khi gửi."],["Hệ thống","Giữ phiên bản/nội dung hợp đồng riêng, không phụ thuộc việc mẫu về sau bị ngừng."]],
    states: ["Mẫu active / ngừng; version tăng khi tạo phiên bản mới"],
    rules: [["DB","Mẫu có tên/phiên bản duy nhất, phiên bản > 0 và nội dung, các hợp đồng tham chiếu mẫu/phiên bản qua contract_revisions."],["UI","Không xóa phiên bản cũ chỉ vì tạo mẫu mới; chỉ dùng mẫu active để lập hợp đồng mới."],["API","Kiểm tra quyền tạo/sửa/bật mẫu và lưu dấu vết người quản trị."]],
    data: [["contract_templates","Mẫu, phiên bản, nội dung và active."],["contract_revisions","Nội dung cụ thể của hợp đồng và mẫu đã dùng."]],
    limits: ["Mẫu không tự bảo đảm tính pháp lý và chưa có ký số; người lập vẫn kiểm tra điều khoản cụ thể."], related: ["contract-revision","audit"]
  },
  {
    id: "audit", group: "moderation", title: "Nhật ký kiểm duyệt và truy vết thay đổi", roles: ["admin","system"], scope: "demo",
    path: "Quản trị → Nhật ký", intro: "Giải thích ai ra quyết định, đối với đối tượng nào, khi nào và vì sao.",
    steps: [["Người có quyền","Thực hiện quyết định duyệt/từ chối/ẩn tin, hồ sơ, khóa/mở, báo cáo hoặc xác minh nhà."],["Hệ thống","Lưu actor, action, đối tượng và lý do; SQL có before_snapshot / after_snapshot."],["Quản trị","Tra nhật ký, đối chiếu với lịch sử nghiệp vụ gốc."]],
    states: ["Sự kiện quyết định → bản ghi audit được giữ"],
    rules: [["DB","moderation_actions nhắm đúng một loại đối tượng; các FK giữ liên kết với đối tượng hợp lệ."],["PROC","Quyết định quyền nhà, audit và thông báo được ghi cùng giao dịch; không báo thành công khi ghi nửa chừng."],["API","API giới hạn quyền đọc/ghi nhật ký; audit không thay thế các bản ghi cư trú/phiên bản/đồng thuận gốc."]],
    data: [["moderation_actions","Người xử lý, đối tượng, action, reason, bản chụp và thời điểm."]],
    limits: ["Danh sách audit demo chưa mô phỏng mọi cột của SQL và mọi thay đổi dữ liệu."], related: ["data-safety","house-proof"]
  },
  {
    id: "data-safety", group: "integrity", title: "Ràng buộc chung, giao dịch và dữ liệu lịch sử", roles: ["system","tenant","landlord","admin"], scope: "partial",
    path: "Áp dụng cho toàn hệ thống · database/schema.sql + database/source/", intro: "Các điều kiện bảo vệ dữ liệu được chia thành kiểm tra giao diện, ràng buộc SQL và kiểm tra máy chủ cần tích hợp.",
    steps: [["Giao diện","Kiểm tra form để hướng dẫn; khi gửi kiểm tra lại quyền, trạng thái và phiên bản thay vì chỉ khóa nút."],["CSDL","FK chống sai quan hệ, CHECK chặn giá trị bất hợp lệ, UNIQUE chặn trùng."],["Stored procedure","Khóa hàng, đọc lại điều kiện rồi ghi toàn bộ hoặc rollback; request đồng thời không được chiếm cùng chỗ."],["Máy chủ","Xác thực phiên, actor, quyền đối tượng; gọi thủ tục phù hợp và xử lý xung đột/thử lại có kiểm soát."]],
    states: ["Kiểm tra → khóa/đọc lại → ghi cùng giao dịch → commit hoặc rollback"],
    rules: [["PROC","Dùng thủ tục công khai cho quy trình thuê/xác minh/bài chờ; không cấp quyền ghi tùy ý hoặc gọi helper _v5_* cho client."],["API","Giờ lịch lưu UTC, hiển thị/diễn giải ngày nghiệp vụ theo Việt Nam. Lọc dữ liệu riêng tư trên máy chủ."],["DB","Giữ lịch sử đã ký, hóa đơn đã phát hành, người trả cũ, đồng thuận và đại diện theo từng giai đoạn."],["UI","Bản cũ thiếu thời điểm phải ghi chưa rõ, không tự đoán ngày ra/nhận đại diện hoặc mở lại hợp đồng đã kết thúc."]],
    data: [["contracts","Tính nhất quán hợp đồng/phòng."],["room_tenants","Cư trú thực tế và chứng cứ."],["contract_representative_history","Lịch sử đại diện bất biến."],["invoices","Nghĩa vụ đã phát hành."],["notifications","Khóa sự kiện tránh phát trùng."]],
    limits: ["Wireframe hiện chạy localStorage; đồng bộ tab dùng storage event. Chưa có API bảo mật hoặc giao dịch máy chủ nối với giao diện."], related: ["file-storage","migration"]
  },
  {
    id: "file-storage", group: "integrity", title: "Tệp, quyền riêng tư và giới hạn lưu trữ", roles: ["tenant","landlord","admin","system"], scope: "partial",
    path: "Tệp minh chứng nhà / căn cước / hợp đồng / báo cáo", intro: "CSDL lưu metadata và khóa kho tệp; quyền mở tài liệu phải xét theo chủ thể và ngữ cảnh.",
    steps: [["Người dùng","Chọn tệp đúng mục đích nghiệp vụ."],["Máy chủ","Khi tích hợp, kiểm tra nội dung/MIME/kích thước, quyền sở hữu và lưu kho riêng tư."],["Hệ thống","Gắn tệp vào đúng hồ sơ; người có quyền được xem bằng đường dẫn tạm có kiểm tra."],["Wireframe","Minh chứng nhà lưu Blob trong IndexedDB và metadata trong localStorage; reload cùng trình duyệt mở lại được."]],
    states: ["STAGED → ACTIVE; ARCHIVED / DELETED theo chính sách"],
    rules: [["DB","storage_key duy nhất; size_bytes ≥ 0; ngoài AVATAR/POST_IMAGE, tài liệu bắt buộc PRIVATE."],["PROC","Minh chứng nhà phải thuộc người nộp, ACTIVE, đúng purpose/loại và giới hạn tệp; tài liệu tham chiếu được bảo vệ bất biến/riêng tư."],["API","Cần chính sách quét tệp, hạn lưu, tải xuống và xóa hợp lệ; không cho truy cập chỉ bằng đoán ID hoặc URL."]],
    data: [["files","Chủ tệp, storage_key, tên/MIME/kích thước/SHA-256, mục đích, quyền và hạn dùng."],["house_verification_documents","Ngữ cảnh minh chứng nhà."]],
    limits: ["Tệp cục bộ không có ở máy/trình duyệt khác. Chuyển vai trò demo không thay thế phân quyền kho tệp thật."], related: ["house-proof","identity"]
  },
  {
    id: "migration", group: "integrity", title: "Tạo CSDL mới, nâng cấp và giới hạn triển khai", roles: ["system","admin"], scope: "database",
    path: "database/schema.sql · database/migrations/ · README.md", intro: "Schema hiện có 43 bảng. SQL đã chuẩn bị cho backend, wireframe chưa ghi trực tiếp vào MySQL.",
    steps: [["Kỹ thuật","Tạo mới bằng schema.sql, hoặc sao lưu/dừng ghi để nâng cấp dữ liệu cũ."],["Kỹ thuật","Từ v5 gốc chạy lần lượt: workflows → chat_post_sharing → viewing_proposals → contract_viewing_cleanup → multiple_room_posts → post_review_quota → house_right_verification."],["Hệ thống","Preflight chặn sai thứ tự/chạy lại hoặc dữ liệu mâu thuẫn; không tự xóa hay sửa quyết định để qua kiểm tra."],["Kỹ thuật","Triển khai API, view công khai và kho tệp tương ứng, rồi kiểm tra trên dữ liệu thật theo quy trình riêng."]],
    states: ["Schema mới hoặc nâng cấp một lần theo thứ tự; không chạy cả hai lên cùng CSDL mới"],
    rules: [["DB","DDL MySQL có implicit commit; không dùng --force để bỏ qua lỗi migration."],["PROC","Nhà cũ không được tự cấp phê duyệt; hợp đồng/người ở/bài cũ được giữ và tin công khai cần xác minh nhà."],["API","Ánh xạ dữ liệu demo sang SQL thay vì đưa nguyên JSON JavaScript vào bảng hoặc coi tài khoản mẫu là phiên đăng nhập."]],
    data: [["rental_houses","Bổ sung tên/phiên bản/khóa tạo."],["rental_house_verifications","Xác minh nhà sau migration."],["posts","Lượt chờ 1–3 và nguồn công khai."],["contract_representative_history","Bản gốc lịch sử với thời điểm chưa rõ nếu không có chứng cứ."]],
    limits: ["Các kiểm thử SQL dùng MySQL tạm. Chưa áp dụng migration lên CSDL thật hoặc triển khai backend chỉ bằng mở wireframe."], related: ["data-safety","house-rights-expiry"]
  }
];

const BUSINESS_JOURNEY = [
  ["create-house","Tạo nhà"], ["house-proof","Xác minh quyền"], ["submit-post","Đăng tin"], ["propose-viewing","Hẹn xem"],
  ["create-contract","Gửi hợp đồng"], ["move-in","Vào ở"], ["bill","Lập hóa đơn"], ["end-lease","Kết thúc"]
];
function businessGuideState() {
  const raw = state.businessGuide || {};
  return {
    query: typeof raw.query === "string" ? raw.query.slice(0,180) : "",
    group: raw.group === "all" || BUSINESS_GROUPS.some(([id]) => id === raw.group) ? raw.group : "all",
    role: Object.hasOwn(BUSINESS_ROLES,raw.role) ? raw.role : "all",
    scope: Object.hasOwn(BUSINESS_SCOPES,raw.scope) ? raw.scope : "all",
    expanded: Array.isArray(raw.expanded) ? raw.expanded.filter((id) => BUSINESS_FLOWS.some((f) => f.id === id)) : ["create-house"]
  };
}
function businessSearchText(value) { return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase(); }
function businessGuideFlows(filters, includeGroup = true) {
  const words = businessSearchText(filters.query).trim().split(/\s+/).filter(Boolean);
  return BUSINESS_FLOWS.filter((flow) => {
    if (includeGroup && filters.group !== "all" && flow.group !== filters.group || filters.role !== "all" && !flow.roles.includes(filters.role) || filters.scope !== "all" && flow.scope !== filters.scope) return false;
    const searchable = businessSearchText(JSON.stringify(flow) + " " + flow.roles.map((role) => BUSINESS_ROLES[role]).join(" ") + " " + BUSINESS_SCOPES[flow.scope]);
    return words.every((word) => searchable.includes(word));
  });
}
function businessScopeBadge(scope) { return `<span class="guide-scope guide-scope-${scope}">${BUSINESS_SCOPES[scope]}</span>`; }
function renderBusinessGroupSelect(filters, base) {
  return `<label class="field guide-mobile-group">Nhóm nghiệp vụ<select name="group"><option value="all" ${filters.group === "all" ? "selected" : ""}>Tất cả các luồng · ${base.length}</option>${BUSINESS_GROUPS.map(([id,label]) => `<option value="${id}" ${filters.group === id ? "selected" : ""}>${label} · ${base.filter((flow) => flow.group === id).length}</option>`).join("")}</select></label>`;
}
function renderBusinessFlow(flow, expanded) {
  const number = String(BUSINESS_FLOWS.indexOf(flow)+1).padStart(2,"0");
  return `<details class="guide-flow" id="business-flow-${flow.id}" data-business-flow="${flow.id}" ${expanded.includes(flow.id) ? "open" : ""}>
    <summary><span class="guide-flow-number">${number}</span><span class="guide-flow-heading"><strong>${esc(flow.title)}</strong><span>${esc(flow.intro)}</span><span class="guide-flow-meta">${businessScopeBadge(flow.scope)}<span>${flow.roles.map((role) => BUSINESS_ROLES[role]).join(" · ")}</span></span></span>${icon("chevron-down")}</summary>
    <div class="guide-flow-body"><p class="guide-path"><strong>Bắt đầu ở đâu</strong>${esc(flow.path)}</p>
      <section><h3>Các bước thực hiện</h3><ol class="guide-steps">${flow.steps.map(([actor,action]) => `<li><strong>${esc(actor)}</strong><p>${esc(action)}</p></li>`).join("")}</ol></section>
      <section><h3>Trạng thái và kết quả</h3><ul class="guide-states">${flow.states.map((label) => `<li>${esc(label)}</li>`).join("")}</ul></section>
      <section><h3>Ràng buộc dữ liệu / nghiệp vụ</h3><ul class="guide-rules">${flow.rules.map(([layer,rule]) => `<li><span class="guide-layer guide-layer-${layer}">${BUSINESS_LAYERS[layer]}</span><p>${esc(rule)}</p></li>`).join("")}</ul></section>
      <details class="guide-data"><summary>Bảng dữ liệu liên quan · ${flow.data.length}</summary><div class="table-scroll"><table><thead><tr><th>Bảng</th><th>Thông tin sử dụng</th></tr></thead><tbody>${flow.data.map(([table,description]) => `<tr><td><code>${esc(table)}</code></td><td>${esc(description)}</td></tr>`).join("")}</tbody></table></div></details>
      <aside class="guide-limits"><h3>Phạm vi hiện tại / phần cần bổ sung</h3><ul>${flow.limits.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></aside>
      ${flow.related.length ? `<div class="guide-related"><strong>Đọc tiếp</strong>${flow.related.map((id) => { const related = BUSINESS_FLOWS.find((item) => item.id === id); return button(esc(related.title),"business-flow",id,"small"); }).join("")}</div>` : ""}
    </div></details>`;
}
function renderBusinessGuide() {
  const filters = businessGuideState(), matches = businessGuideFlows(filters), base = businessGuideFlows(filters,false);
  const tables = new Set(BUSINESS_FLOWS.flatMap((flow) => flow.data.map(([table]) => table)));
  const count = (id) => base.filter((flow) => flow.group === id).length;
  return `<div class="business-guide">
    <div class="page-heading"><div><p class="guide-eyebrow">TRỌDAY · BẢN ĐỒ NGHIỆP VỤ</p><h1>Logic nghiệp vụ</h1><p>Đi từ thao tác của từng vai trò đến trạng thái, dữ liệu và điều kiện cần kiểm tra.</p></div>${button(`${icon("arrow-left")} Quay lại wireframe`,"business-return")}</div>
    <div class="guide-introduction"><div><strong>${BUSINESS_FLOWS.length} luồng · ${BUSINESS_GROUPS.length} nhóm · ${tables.size} bảng dữ liệu</strong><p>Đối chiếu từ wireframe và CSDL hiện tại. Đây là tài liệu tương tác; các nút trong trang chỉ mở nội dung hướng dẫn.</p></div><div class="guide-legend">${Object.keys(BUSINESS_SCOPES).map(businessScopeBadge).join("")}</div><p class="guide-scope-note">“Mô phỏng” là thao tác đang chạy trong trình duyệt. Các nhãn CSDL/API chỉ ra phần được bảo vệ trong SQL hoặc còn cần máy chủ; giao diện hiện chưa kết nối MySQL.</p></div>
    <section class="guide-journey" aria-labelledby="business-journey-title"><h2 id="business-journey-title">Hành trình thuê phòng</h2><p>Chọn một bước để mở luồng chi tiết. Ở ghép có nhánh kết nối riêng, sau đó mới làm thủ tục thuê chung.</p><ol>${BUSINESS_JOURNEY.map(([id,label],index) => `<li><button type="button" data-action="business-flow" data-id="${id}"><span>${index+1}</span>${label}${index < BUSINESS_JOURNEY.length-1 ? icon("arrow-right") : icon("check")}</button></li>`).join("")}</ol><div class="guide-roommate-path"><strong>Nhánh ở ghép</strong>${button("Tạo hồ sơ","business-flow","roommate-profile","small")}${icon("arrow-right")}${button("Kết nối & trò chuyện","business-flow","roommate-invite","small")}${icon("arrow-right")}${button("Đồng ý thuê chung riêng","business-flow","join-consent","small")}</div></section>
    <form class="guide-filters" data-form="business-guide-search" role="search" aria-label="Tìm logic nghiệp vụ"><label class="field">Tìm luồng, trạng thái, bảng hoặc ràng buộc<input type="search" name="query" maxlength="180" value="${esc(filters.query)}" placeholder="Ví dụ: gia hạn, 48 giờ, room_tenants…"></label><label class="field">Vai trò liên quan<select name="role">${[["all","Tất cả vai trò"],...Object.entries(BUSINESS_ROLES)].map(([id,label]) => `<option value="${id}" ${filters.role === id ? "selected" : ""}>${label}</option>`).join("")}</select></label><label class="field">Phạm vi triển khai<select name="scope">${[["all","Tất cả phạm vi"],...Object.entries(BUSINESS_SCOPES)].map(([id,label]) => `<option value="${id}" ${filters.scope === id ? "selected" : ""}>${label}</option>`).join("")}</select></label>${renderBusinessGroupSelect(filters,base)}<button type="submit" class="button primary">${icon("search")} Tìm / Lọc</button>${button("Đặt lại","business-reset")}</form>
    <div class="guide-layout"><nav class="guide-navigation" aria-label="Nhóm logic nghiệp vụ"><h2>Nhóm nghiệp vụ</h2><button type="button" data-action="business-group" data-id="all" aria-current="${filters.group === "all" ? "true" : "false"}"><span>Tất cả các luồng</span><span>${base.length}</span></button>${BUSINESS_GROUPS.map(([id,label,glyph]) => `<button type="button" data-action="business-group" data-id="${id}" aria-current="${filters.group === id ? "true" : "false"}">${icon(glyph)}<span>${label}</span><span>${count(id)}</span></button>`).join("")}</nav>
      <div class="guide-results"><div class="guide-results-bar"><h2 id="business-results-title" tabindex="-1">${filters.group === "all" ? "Tất cả các luồng" : BUSINESS_GROUPS.find(([id]) => id === filters.group)[1]} <span>· ${matches.length} / ${BUSINESS_FLOWS.length}</span></h2><div>${button("Mở tất cả","business-expand","open","small")}${button("Thu gọn","business-expand","close","small")}</div></div><p class="guide-result-count" role="status">${matches.length} luồng phù hợp. ${filters.role !== "all" ? `Vai trò: ${BUSINESS_ROLES[filters.role]}. ` : ""}Bấm tiêu đề để mở hoặc thu gọn từng luồng.</p>
      ${matches.length ? BUSINESS_GROUPS.filter(([id]) => matches.some((flow) => flow.group === id)).map(([id,label]) => `<section class="guide-group" aria-labelledby="business-group-${id}"><h2 id="business-group-${id}">${label}</h2>${matches.filter((flow) => flow.group === id).map((flow) => renderBusinessFlow(flow,filters.expanded)).join("")}</section>`).join("") : `<div class="guide-empty">${empty("Không tìm thấy luồng phù hợp","Thử bỏ bớt từ khóa, chọn tất cả vai trò hoặc đặt lại bộ lọc.")}${button("Xem lại toàn bộ","business-reset","","primary")}</div>`}
      <footer class="guide-sources"><strong>Nguồn đối chiếu</strong><a href="docs/business-rules.md" target="_blank" rel="noopener">Quy tắc nghiệp vụ đầy đủ ${icon("external-link")}</a><a href="database/schema.sql" target="_blank" rel="noopener">Cấu trúc CSDL hiện tại ${icon("external-link")}</a><p>Các giới hạn mô phỏng được nêu riêng trong từng luồng. Không coi việc có màn hình hoặc có bảng là đã có API hoàn chỉnh.</p></footer>
    </div></div></div>`;
}
function openBusinessGuide() {
  if (state.view !== "business-guide") state.businessGuideReturn = { role:state.role, view:state.view };
  closeDialog(); state.view = "business-guide"; save(); render(); window.scrollTo(0,0); $("#app-main").focus({preventScroll:true});
}
function returnFromBusinessGuide() {
  const previous = state.businessGuideReturn;
  state.view = previous?.role === state.role && (NAV[state.role].some(([id]) => id === previous.view) || ["detail","room-detail"].includes(previous.view)) ? previous.view : state.role === "tenant" ? "discover" : "dashboard";
  save(); render(); window.scrollTo(0,0); $("#app-main").focus({preventScroll:true});
}
function updateBusinessGuide(patch) {
  if (state.view !== "business-guide") return;
  state.businessGuide = { ...businessGuideState(), ...patch };
  state.businessGuide = businessGuideState(); save(); render(); $("#business-results-title").focus({preventScroll:true});
}
function showBusinessFlow(id) {
  const flow = BUSINESS_FLOWS.find((item) => item.id === id); if (!flow) return;
  if (state.view !== "business-guide") openBusinessGuide();
  updateBusinessGuide({ query:"", group:flow.group, role:"all", scope:"all", expanded:[id] });
  const details = $(`#business-flow-${id}`);
  details?.scrollIntoView?.({behavior:"smooth",block:"start"}); details?.querySelector?.("summary")?.focus();
}
function setBusinessGuideExpanded(open) {
  const filters = businessGuideState(), visible = new Set(businessGuideFlows(filters).map((flow) => flow.id));
  updateBusinessGuide({expanded: open ? [...new Set([...filters.expanded,...visible])] : filters.expanded.filter((id) => !visible.has(id))});
}
document.addEventListener("toggle", (event) => {
  const element = event.target;
  if (state.view !== "business-guide" || !element.isConnected || !element.matches?.("details[data-business-flow]")) return;
  const filters = businessGuideState(), id = element.dataset.businessFlow;
  state.businessGuide = {...filters, expanded: element.open ? [...new Set([...filters.expanded,id])] : filters.expanded.filter((item) => item !== id)};
  save();
}, true);
