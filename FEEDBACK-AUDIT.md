# Đối chiếu feedback UI — 25/09/2026

Phạm vi: đối chiếu code hiện tại với các feedback trong task, ưu tiên yêu cầu mới nhất khi có thay đổi hoặc revert. Không khôi phục nguyên gói thiết kế đã được yêu cầu revert.

## Các lỗi xác nhận và sửa trong lần rà này

| Feedback | Nguyên nhân / sửa đổi | Kiểm tra |
| --- | --- | --- |
| Clients bị trắng, panel không đúng | Code lấy main/scrim/dialog bằng vị trí con cố định; thanh icon mới làm lệch các vị trí. Chuyển sang chọn dialog và scrim theo thuộc tính. | Danh sách 7 client vẫn hiện khi đóng/mở panel; mở cả 5 tab cho từng client không có lỗi runtime. |
| Client tabs thiếu dữ liệu, nút vẫn chật | Lỗi chọn nhầm dialog khiến hàm nạp dữ liệu không chạy. Lượt 26/09 nới panel từ 520 lên 620px, bỏ lưới ép bốn cột, dùng flex có thể xuống hàng khi thật sự thiếu chỗ; từng nút giữ padding ngang 12px và cao tối thiểu 44px. | 35 tổ hợp client/tab render được; từng panel có đủ 4 action. Chưa đo kích thước bằng trình duyệt. |
| Client Tasks bị lệch | Bỏ margin âm kéo nội dung sang trái, dùng chiều rộng của vùng chứa. | Kiểm tra DOM và source. |
| Week/Month không chuyển xuống Today; Month lỗi | Controller tìm class chỉ được thêm ở bước enhancement sau đó. Chọn tab theo cấu trúc thật, chuyển node xuống sau Today trước enhancement. | Week, Month, Today, previous/next chạy; mode tab đúng; không còn hàng List/Calendar thừa bên ngoài lịch. |
| Điều hướng Agenda bị trùng / sai active | Giữ một hàng điều hướng dưới tiêu đề; Calendar đánh dấu đúng tab active. Sửa rule cũ làm nhóm tiêu đề mất cấu trúc cột. | DOM có một hàng điều hướng, đúng active route; CSS nhóm tiêu đề được sửa. |
| Search hoạt động không đúng | ⌘K có hai handler: mở Search rồi chuyển New chat. Handler chung tôn trọng event đã được xử lý. | ⌘K mở đúng một Search, giữ nguyên route. |
| Home chatbox chưa nhất quán | Áp dụng cùng kích thước/căn giữa cho Home thường và first-week Home. | Cả hai có composer hook; CSS dùng chung. |
| DocuSign khác hệ thiết kế | Rút gọn envelope thành card có heading, trạng thái, danh sách người ký và liên kết tài liệu; không mô phỏng chữ ký khi chưa có ảnh chữ ký thật. | Tab DocuSign render đủ 3 người ký và trạng thái chờ ký; không có lỗi runtime. |
| Tab All / gợi ý dưới chat | Đổi nhãn All thành Chat (kể cả filter lưu cũ); bỏ hàng gợi ý dưới composer AI. | Chuyển tab Communication log và chat render được. |
| Open work item bị vỡ cột | Cho lưới Playbook đổi theo chiều rộng của chính danh sách; đưa mũi tên nhóm sát tiêu đề và giảm spacing rời rạc. | Hook các hàng/nhóm xuất hiện đúng; chưa đo pixel bằng trình duyệt. |
| Suggested by Sofia ngắn hơn danh sách | Gỡ max-width 720px, kéo thanh theo toàn bộ chiều rộng nhóm Agenda. | Kiểm tra CSS/source; chưa đo pixel bằng trình duyệt. |
| View transaction có dấu cộng | Icon tạo mới được giữ lại khi đổi nhãn sang View transaction. Chỉ bỏ SVG khi client đã có transaction; Start transaction vẫn có dấu cộng. | Kiểm tra mã nguồn và các route client bằng DOM. |
| Quá nhiều action ở Clients/Follow-ups | Clients và Follow-ups đều lặp Ask Sofia ở header dù có trong điều hướng; draft có Review ở hàng chính và thêm Review & send/Edit ở cột phải. Giữ một đường Review draft (cho phép sửa trước khi gửi), bỏ cụm draft trùng ở cột phải và gỡ Ask Sofia lặp trong hai header. Trong client detail, Ask Sofia chuyển thành liên kết nhẹ và View transaction dùng style phụ thay vì nút đen như tạo mới. | Kiểm tra DOM Clients và Follow-ups Due/Upcoming/Done; không có lỗi runtime. |
| Chữ bị nâng cỡ hàng loạt | Quy tắc cũ áp 16px cho mọi `p/li/dd` và control, làm yếu hệ phân cấp. Chuyển sang role: nội dung đọc/tiêu đề công việc/form field 16px, hành động phụ và metadata 14px; Comfortable nâng tương ứng lên 18/16px. | Có assert chống tái đưa selector blanket vào hệ thống; chưa xác minh zoom bằng trình duyệt thật. |
| Cỡ chữ còn lớn, timeline lệch hàng | Theo vai trò Material 3 rút tiêu đề mục về 16/24, nhãn hành động về 14/20; giữ nội dung đọc và field 16/24, Comfortable 18/16. Ngày và mô tả của client timeline/transaction log dùng chung baseline, bỏ padding-top đẩy ngày xuống. | Kiểm tra mã nguồn và hồi quy token; chưa đo pixel trong trình duyệt. |
| Nút client detail còn quá lớn | Bốn nút Call/Email/Message/Start hoặc View transaction dùng chung nhãn `--type-action` 14px/20px, cùng kích cỡ Ask Sofia theo yêu cầu mới nhất; giữ padding ngang 12px và mục tiêu bấm 44px. Comfortable dùng 16px. | Kiểm tra CSS và build; chưa đo pixel trong trình duyệt. |
| Type/Stage lớn hơn Search | Hai bộ lọc Type và Stage dùng nhãn `--type-action` 14px/20px, nét thường, bằng chữ Search; không giảm chiều cao vùng bấm. Comfortable dùng 16px. | Kiểm tra class controller, CSS và build; chưa đo pixel trong trình duyệt. |
| Heading và New chat còn lớn | Chuẩn hóa heading cấp trang về `--type-page-title` 24px/30px, weight 500 trên Home, Agenda, auth và các trang còn lại; giữ heading mục nhỏ hơn để bảo toàn phân cấp. Nhãn New chat/New transaction/Add client trong sidebar, kể cả span bên trong, dùng `--type-action` 14px. | Kiểm tra token, CSS và build; chưa đo pixel trong trình duyệt. |
| Sort, New transaction và select/input chưa bằng Ask Sofia | Lớp primitive cũ vẫn ép 16px cho một số button và field. Chuyển các primitive về `--type-action`; rule chung bao phủ button, select, input, textarea, nhãn lồng bên trong và dialog động. 14px mặc định, 16px Comfortable; không đổi chiều cao/padding control. | Kiểm tra CSS và build; chưa đo pixel trong trình duyệt. |

## Các yêu cầu đã có trong code hiện tại

| Yêu cầu | Bằng chứng / mức xác minh |
| --- | --- |
| Sidebar thu/mở theo icon mục đang chọn | Đã click kiểm thử ở Home, Agenda, Transactions, Clients, Forms. |
| Bỏ Search/notification trùng trên Home | DOM giữ công cụ sidebar và ẩn công cụ trùng trong main. |
| New chat / New transaction có margin-top 20px, nền xám | Rule chung `.sidebar-primary-action` đã có. Kiểm tra source CSS. |
| Bỏ border quanh tiêu đề và nhóm 3 nút onboarding | Rule `.focus-rail > *` bỏ border/shadow; xác nhận các hook nằm đúng trên nhóm 3 action. |
| Border bảng không lặp, hàng bảng không bo góc | Rule `.data-grid` bỏ border-bottom ở header và radius ở hàng. Kiểm tra source CSS. |
| Checklist preview có khoảng đệm dọc | Có class riêng cho heading/row/link và padding/min-height tương ứng. Kiểm tra source. |
| Ngày giờ transaction log không xuống dòng | Dùng cột `max-content` và `white-space: nowrap`. Kiểm tra source. |
| Follow-ups có đủ Due / Upcoming / Done | Đã bỏ rule ẩn tab Done; chỉ bỏ các tiêu đề nhóm lặp lại bên dưới điều hướng. Có kiểm tra hồi quy cho cả ba tab và dữ liệu Done. |
| Nút voice màu xanh | Rule `Talk to Sofia` dùng màu xanh; không đổi tất cả nút thành xanh. |
| Thinking dùng logo ZipQ; confirmation Yes/No và ô nhập chi tiết | Tạo đề xuất trong bộ nhớ, render được confirmation và logo ZipQ khi typing. |

## Giới hạn xác minh

- Lượt tiếp theo đã thêm `design-system/index.html`, `AGENTS.md`, `CLAUDE.md`, `src/readability.css`, và `ACCESSIBILITY-AUDIT.md`. Side menu được gắn hook riêng với nền xám, chữ nhỏ/nền nhạt được chuẩn hóa, có tùy chọn Comfortable 18px. Kiểm tra tự động cho token tương phản đạt 4.5:1 trên ba bề mặt sáng; DOM test cho các route và tùy chọn chữ lớn đạt.

- Build `index.html`, kiểm tra cú pháp và `git diff --check` thành công.
- Lượt rà trước đã chạy bộ kiểm tra DOM bằng jsdom trong bộ nhớ riêng; bộ đó không được lưu vào repo nên không thể chạy lại nguyên trạng. `node scripts/check-ui-regressions.mjs` hiện lưu các kiểm tra hồi quy cho tab Follow-ups và thao tác bàn phím của vùng tương tác, không thay thế kiểm thử trình duyệt thực.
- Công cụ trình duyệt chặn truy cập URL `file://` của trang. Chưa xác nhận pixel, clipping, responsive hoặc animation bằng trình duyệt thực trong lượt này.
- Chưa đối chiếu lại animation với phiên Arcads trực tiếp; sự tồn tại của animation trong code không chứng minh đã giống hoàn toàn reference.
- File local đã được build; lượt này không deploy bản Vercel.
