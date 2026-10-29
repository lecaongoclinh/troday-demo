"""Generate the master team checklist. Save a copy before tracking real work."""
import json
import sys
sys.dont_write_bytecode=True
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xlsx_utils import Sheet,workbook,NS

ROOT=Path(__file__).resolve().parent.parent
DATA=ROOT/'docs/work-plan.json'
TARGET=ROOT/'docs/backend-team-checklist.xlsx'
P=json.loads(DATA.read_text(encoding='utf-8'))
tasks=P['tasks'];N=len(tasks)+1
by_id={t['id']:t for t in tasks}
row_by_id={t['id']:i for i,t in enumerate(tasks,2)}
F=lambda expr,cached=0:('formula',expr,cached)
status_range=f"BE_Tasks!$P$2:$P${N}"
id_range=f"BE_Tasks!$A$2:$A${N}"
lookup=lambda id_:f'INDEX({status_range},MATCH("{id_}",{id_range},0))'
warning=lambda id_:f'INDEX(BE_Tasks!$Z$2:$Z${N},MATCH("{id_}",{id_range},0))'
rows=[]
for r,t in enumerate(tasks,2):
    condition='AND('+','.join(f'AND({lookup(id_)}="Hoàn thành",{warning(id_)}="")' for id_ in t['blockers'])+')' if t['blockers'] else 'TRUE'
    rows.append([t['id'],t['phase'],t['laneOrder'],t['owner'],t['reviewer'],t['title'],t['points'],len(t['apiIds']),', '.join(t['apiIds']),'\n'.join(t['files']),', '.join(t['dependsOn']),', '.join(t['integrationWith']),', '.join(t['decisions']),'\n'.join(t['deliverables']),'\n'.join(t['acceptance']),'Chưa làm',*(['Chưa']*7),F(f'COUNTIF(Q{r}:W{r},"Xong")/7'),F(f'IF({condition},"Đủ điều kiện","Chờ phụ thuộc")','Đủ điều kiện' if not t['blockers'] else 'Chờ phụ thuộc'),F(f'IF(AND(P{r}="Hoàn thành",OR(X{r}<1,Y{r}<>"Đủ điều kiện",AND(AE{r}="",AD{r}=""))),"Thiếu bước / phụ thuộc / bằng chứng","")',''),'','','','','','','Mở task'])
headers=['Task ID','Mốc','Thứ tự trong lane','Owner','Reviewer','Công việc','SP tương đối','Số API','API ID','Phạm vi file được sửa','Phụ thuộc trước tích hợp','Cần phối hợp nghiệm thu','Quyết định liên quan','Đầu ra bàn giao','Tiêu chí nghiệm thu','Trạng thái',*P['checklist'],'Tiến độ 7 bước','Điều kiện nghiệm thu','Cảnh báo hoàn thành','Bắt đầu','Hạn','Ngày xong','PR / commit','Bằng chứng test / quyết định','Ghi chú / lý do bị chặn','Link task']
assert len(headers)==33 and all(len(r)==33 for r in rows)
task_sheet=Sheet('BE_Tasks',headers,rows,{1:16,2:10,3:12,4:10,5:12,6:55,7:12,8:12,9:40,10:95,11:40,12:40,13:24,14:100,15:100,16:21,24:16,25:24,26:45,30:45,31:65,32:65,33:18},freeze='G2')
task_sheet.dropdown(f'P2:P{N}',P['statuses']);task_sheet.dropdown(f'Q2:W{N}',['Chưa','Đang làm','Xong'])
for r,t in enumerate(tasks,2):
    task_sheet.styles[(r,4)]=6+ord(t['owner'])-ord('A');task_sheet.styles[(r,24)]=3
    for c in (27,28,29):task_sheet.styles[(r,c)]=4
    task_sheet.styles[(r,33)]=5;task_sheet.links.append((f'AG{r}',f'../work-plan.html#{t["id"]}'))
task_sheet.conditionals=[f'<conditionalFormatting sqref="X2:X{N}"><cfRule type="dataBar" priority="1"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="FF087D72"/></dataBar></cfRule></conditionalFormatting>']
task_sheet.validations.append(f'<dataValidation type="date" operator="between" allowBlank="1" showErrorMessage="1" sqref="AA2:AC{N}"><formula1>43831</formula1><formula2>73050</formula2></dataValidation>')

guide=[
 ['Mục tiêu','Phân công 3 người A/B/C theo module và mốc phụ thuộc, bao phủ 176 API. FE và AI để trống. Đây là kế hoạch, chưa có task backend nào được thực hiện.'],
 ['Tạo bản làm việc','Save As một bản sao trước khi cập nhật. npm run plan:build sẽ thay bản master sinh từ mã nguồn; không ghi tiến độ thực vào master rồi chạy build.'],
 ['Cách cập nhật','BE_Tasks là nguồn trạng thái chính trong workbook: P chọn trạng thái, Q:W đánh dấu 7 bước, AA:AC nhập ngày, AD:AF lưu PR/bằng chứng/lý do. Tăng chiều cao hàng khi cần đọc đủ nội dung dài.'],
 ['Hoàn thành','Chọn Hoàn thành sau khi 7 bước Xong, các task phụ thuộc đã Hoàn thành và có bằng chứng tại AE. Cột Z cảnh báo khai báo chưa đủ. Công thức kiểm tra không thay thế review/test thật.'],
 ['Mốc và SP','8 mốc là thứ tự tích hợp, không phải các tuần cố định. SP là độ lớn tương đối, không phải ngày công; xem lại sau G1. Chưa gán deadline vì chưa có năng lực/lịch làm việc.'],
 ['Làm song song','Sau G0 có thể code với fixture/mock cùng contract v1. Chờ tích hợp dùng khi module đã viết nhưng provider thật chưa sẵn sàng. Chỉ nghiệm thu đầy đủ khi phụ thuộc và test liên module đạt.'],
 ['Tên người thực tế','Điền tên thành viên tương ứng A/B/C tại Tong_quan, cột Tên thực tế; giữ ký hiệu owner để liên kết task/API ổn định. Không đổi owner của một task lẻ rồi cùng sửa một module.'],
 ['API coverage','API_176 tra trạng thái tự động từ BE_Tasks bằng INDEX/MATCH; mỗi endpoint có đúng một task/owner. Không nhập trạng thái độc lập tại API_176.'],
 ['Tiến độ tổng','Tong_quan dùng COUNTIF và SUMPRODUCT(SP × tiến độ)/SUM(SP). Tỷ lệ task hoàn thành theo trạng thái là chỉ số khác; review cả cột cảnh báo. Excel tính lại công thức khi mở.'],
 ['File dùng chung','A là người tích hợp bootstrap/dependency/CI/output SQL. B/C chỉ sửa source SQL đã phân, mỗi người có fixtures/tests riêng. Tất cả đường dẫn backend/** là đề xuất, không phải backend đã có.'],
 ['Đồng bộ trang','Tiến độ trên trang chỉ lưu trong trình duyệt này; Excel không tự đồng bộ với trang hoặc máy khác. Team nên dùng một bản workbook chung hoặc công cụ task làm nguồn thật.'],
 ['FE / AI','Hai sheet cuối hoàn toàn trống, dành cho lập kế hoạch sau. Không tự phát sinh task FE/AI.'],
 ['Nguồn','docs/api-catalog.json + scripts/work-plan-blueprint.cjs → docs/work-plan.json, work-plan-data.js và file Excel này. Kiểm tra: npm run plan:check; npm run test:work-plan.']
]
overview=[['Ngày kế hoạch','2026-10-29','',''],['Tổng task',len(tasks),'',''],['Tổng API',len(P['assignments']),'',''],['Mốc tích hợp',len(P['phases']),'',''],['SP dự kiến',P['counts']['points'],'Độ lớn tương đối, không phải ngày công',''],['Hoàn thành',F(f'COUNTIF({status_range},"Hoàn thành")'),'',''],['Đang làm',F(f'COUNTIF({status_range},"Đang làm")'),'',''],['Chờ tích hợp',F(f'COUNTIF({status_range},"Chờ tích hợp")'),'',''],['Chờ review',F(f'COUNTIF({status_range},"Chờ review")'),'',''],['Bị chặn',F(f'COUNTIF({status_range},"Bị chặn")'),'',''],['Chưa làm',F(f'COUNTIF({status_range},"Chưa làm")',len(tasks)),'',''],['Tiến độ theo SP',F(f'SUMPRODUCT(BE_Tasks!G2:G{N},BE_Tasks!X2:X{N})/SUM(BE_Tasks!G2:G{N})'),'7 bước, có trọng số độ lớn',''],['Hoàn thành nhưng thiếu bằng chứng',F(f'COUNTIF(BE_Tasks!Z2:Z{N},"Thiếu*")'),'Cần review lại trước nghiệm thu',''],['Người / vai trò','SP','Số task','Tên thực tế']]
for p in P['people']:overview.append([p['id']+' — '+p['role'],p['points'],p['taskCount'],''])
overview.append(['Tiến độ từng người','SP đã xử lý','Tỷ lệ theo SP','Task hoàn thành'])
for p in P['people']:
    numerator=f'SUMPRODUCT((BE_Tasks!$D$2:$D${N}="{p["id"]}")*BE_Tasks!$G$2:$G${N}*BE_Tasks!$X$2:$X${N})'
    overview.append([p['id'],F(numerator),F(numerator+f'/SUMIF(BE_Tasks!$D$2:$D${N},"{p["id"]}",BE_Tasks!$G$2:$G${N})'),F(f'COUNTIFS(BE_Tasks!$D$2:$D${N},"{p["id"]}",{status_range},"Hoàn thành")')])
summary=Sheet('Tong_quan',['Chỉ số','Giá trị','Diễn giải / số task','Tên thực tế / đã xong'],overview,{1:55,2:28,3:65,4:35},filters=False)
summary.styles[(13,2)]=3
for r in range(len(overview)-1,len(overview)+2):summary.styles[(r,3)]=3

api_rows=[]
for a in P['assignments']:
    api_rows.append([a['id'],a['method'],a['path'],a['title'],a['owner'],a['taskId'],a['phase'],', '.join(a['flowIds']),F(lookup(a['taskId']),'Chưa làm'),F(f'INDEX(BE_Tasks!$X$2:$X${N},MATCH("{a["taskId"]}",{id_range},0))'),a['decision'] or '','Mở API','Mở task'])
api_sheet=Sheet('API_176',['API ID','Method','Endpoint','Chức năng','Owner','Task','Mốc','Luồng','Trạng thái task','Tiến độ task','Quyết định','Đặc tả API','Phân công'],api_rows,{1:14,2:10,3:70,4:60,5:10,6:17,7:10,8:45,9:22,10:18,11:18,12:18,13:18},freeze='D2')
for r,a in enumerate(P['assignments'],2):
    api_sheet.styles[(r,5)]=6+ord(a['owner'])-65;api_sheet.styles[(r,10)]=3
    for c,ref,target in [(12,f'L{r}',f'../api-guide.html#{a["id"]}'),(13,f'M{r}',f'../work-plan.html#{a["taskId"]}')]:api_sheet.styles[(r,c)]=5;api_sheet.links.append((ref,target))

ownership=Sheet('Owner_Files',['Module','Owner','Phạm vi file','Nghiệp vụ','Quy tắc bàn giao'],[[m['title'],m['owner'],'\n'.join(m['paths']),m['scope'],m['boundary']] for m in P['modules']],{1:40,2:12,3:110,4:95,5:95})
phase_rows=[]
for phase in P['phases']:
    gate=next(g for g in P['gates'] if g['phase']==phase['id'])
    cond='AND('+','.join(f'AND({lookup(t)}="Hoàn thành",{warning(t)}="")' for t in gate['taskIds'])+')'
    phase_rows.append([phase['id'],phase['title'],phase['goal'],', '.join(phase['taskIds']),phase['points'],gate['id'],gate['acceptance'],F(f'IF({cond},"Đạt","Chưa đạt")','Chưa đạt')])
phases=Sheet('Giai_doan',['Mốc','Tên','Mục tiêu','Task','SP','Gate','Điều kiện qua gate','Trạng thái gate'],phase_rows,{2:50,3:100,4:65,7:110})
handoffs=Sheet('Ban_giao',['Interface','Provider','Task cung cấp','Consumer','Chữ ký đề xuất','Payload / dữ liệu','Ràng buộc','Trạng thái provider'],[[i['id'],i['owner'],i['taskId'],', '.join(i['consumers']),i['signature'],i['payload'],i['rule'],F(lookup(i['taskId']),'Chưa làm')] for i in P['interfaces']],{1:20,3:18,5:100,6:100,7:110,8:22})
decisions=Sheet('Quyet_dinh',['ID','Vấn đề','Người đề xuất','Task','Người cần chốt','Nội dung','Trạng thái quyết định','Kết luận / ngày','Bằng chứng'],[[d['id'],d['title'],d['owner'],d['taskId'],d['approver'],d['detail'],'Chưa chốt','',''] for d in P['decisions']],{2:50,4:20,5:65,6:110,8:65,9:50})
decisions.dropdown(f'G2:G{len(P["decisions"])+1}',['Chưa chốt','Đang trao đổi','Đã chốt','Hoãn'])
workers=Sheet('Worker_OPS',['ID','Công việc','Owner','Task','Lịch đề xuất','Nghiệp vụ','Nghiệm thu','Trạng thái task'],[[j['id'],j['title'],j['owner'],j['taskId'],j['schedule'],j['logic'],j['acceptance'],F(lookup(j['taskId']),'Chưa làm')] for j in P['jobs']],{2:50,4:20,5:45,6:110,7:100,8:22})
qa=Sheet('QA',['ID','Ca kiểm thử','Task chịu trách nhiệm','Owner liên quan','Kịch bản','Kết quả','Bằng chứng / lỗi'],[[q['id'],q['title'],', '.join(q['taskIds']),', '.join(q['owners']),q['scenario'],'Chưa chạy',''] for q in P['qa']],{2:50,3:50,5:125,7:70})
qa.dropdown(f'F2:F{len(P["qa"])+1}',['Chưa chạy','Pass','Fail','Bị chặn'])
sheets=[Sheet('Huong_dan',['Mục','Cách sử dụng'],guide,{1:35,2:150},filters=False),summary,task_sheet,api_sheet,ownership,phases,handoffs,decisions,workers,qa,Sheet('FE'),Sheet('AI')]
payload=workbook(sheets)
if '--check' in sys.argv:
    assert TARGET.exists() and TARGET.read_bytes()==payload,'Workbook chưa đồng bộ; chạy npm run plan:build (tiến độ thực lưu trong bản sao).'
else:TARGET.write_bytes(payload)
with zipfile.ZipFile(TARGET) as z:
    assert z.testzip() is None
    for name in z.namelist():ET.fromstring(z.read(name))
    for i in (11,12):
        doc=ET.fromstring(z.read(f'xl/worksheets/sheet{i}.xml'))
        assert len(doc.find(f'{{{NS}}}sheetData'))==0,'FE/AI must stay empty'
    doc=ET.fromstring(z.read('xl/worksheets/sheet3.xml'))
    assert len(doc.find(f'{{{NS}}}sheetData'))==len(tasks)+1
    assert len(doc.findall(f'.//{{{NS}}}f'))==3*len(tasks)
    assert len(ET.fromstring(z.read('xl/worksheets/sheet4.xml')).find(f'{{{NS}}}sheetData'))==177
print(f'Excel verified: {len(sheets)} sheets; {len(tasks)} BE tasks; 176 API links; FE/AI empty')
