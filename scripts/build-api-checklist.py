"""Build a real, dependency-free OOXML workbook from the API catalogue.

Generated master checklist starts empty. Use a copy for day-to-day tracking;
rebuilding intentionally replaces the generated master, not the working copy.
"""
import json
import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from xml.sax.saxutils import escape

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs/api-catalog.json'
TARGET = ROOT / 'docs/api-development-checklist.xlsx'
NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
data = json.loads(SOURCE.read_text(encoding='utf-8'))

def col(number):
    result = ''
    while number:
        number, remainder = divmod(number - 1, 26)
        result = chr(65 + remainder) + result
    return result

def text(value):
    return escape(str(value), {'"': '&quot;'})

def cell(ref, value, style=0):
    if isinstance(value, tuple) and value[0] == 'formula':
        return f'<c r="{ref}" s="{style}"><f>{text(value[1])}</f><v>{value[2]}</v></c>'
    if isinstance(value, (int, float)):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    # inlineStr keeps API examples and user text from becoming spreadsheet formulas.
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{text(value)}</t></is></c>'

class Sheet:
    def __init__(self, name, headers, rows, widths=None, freeze='A2', filters=True):
        self.name, self.headers, self.rows = name, headers, rows
        self.widths, self.freeze, self.filters = widths or {}, freeze, filters
        self.validations, self.links, self.conditional = [], [], []
        self.styles = {}

    def xml(self):
        end = f'{col(len(self.headers))}{len(self.rows)+1}'
        letters = ''.join(x for x in self.freeze if x.isalpha())
        number = int(''.join(x for x in self.freeze if x.isdigit()))
        xsplit = 0
        for x in letters:
            xsplit = xsplit * 26 + ord(x) - 64
        xsplit -= 1
        pane = f'<pane xSplit="{xsplit}" ySplit="{number-1}" topLeftCell="{self.freeze}" activePane="bottomRight" state="frozen"/>'
        widths = ''.join(f'<col min="{i}" max="{i}" width="{self.widths.get(i,24)}" customWidth="1"/>' for i in range(1,len(self.headers)+1))
        content = '<row r="1" ht="36" customHeight="1">' + ''.join(cell(f'{col(i)}1',v,1) for i,v in enumerate(self.headers,1)) + '</row>'
        for r, values in enumerate(self.rows, 2):
            content += f'<row r="{r}" ht="70" customHeight="1">' + ''.join(cell(f'{col(c)}{r}',v,self.styles.get((r,c),2 if r%2==0 else 0)) for c,v in enumerate(values,1)) + '</row>'
        validations = ''
        if self.validations:
            validations = f'<dataValidations count="{len(self.validations)}">' + ''.join(self.validations) + '</dataValidations>'
        links = '<hyperlinks>'+''.join(f'<hyperlink ref="{ref}" r:id="rId{i}"/>' for i,(ref,_) in enumerate(self.links,1))+'</hyperlinks>' if self.links else ''
        return f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="{NS}" xmlns:r="{REL}"><dimension ref="A1:{end}"/><sheetViews><sheetView workbookViewId="0">{pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>{widths}</cols><sheetData>{content}</sheetData>{f'<autoFilter ref="A1:{end}"/>' if self.filters else ''}{''.join(self.conditional)}{validations}{links}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>'''

    def dropdown(self, range_, options):
        self.validations.append(f'<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Giá trị không hợp lệ" error="Chọn một giá trị trong danh sách." sqref="{range_}"><formula1>"{text(",".join(options))}"</formula1></dataValidation>')

groups = dict((g[0], g[1]) for g in data['groups'])
flows = dict((f['id'], f) for f in data['flows'])
api_rows = []
for i,e in enumerate(data['endpoints'],2):
    api_rows.append([
        e['id'], groups[e['group']], ', '.join(e['flowIds']), e['method'], data['basePath']+e['path'], e['title'], e['access'], e['priority'], '\n'.join(e['dependencies']), e['adapter'],
        '\n'.join(f"{f['name']}: {f['type']} {'(bắt buộc)' if f['required'] else '(tùy chọn)'} — {f['rule']}" for f in e['inputFields']) or 'Không có JSON body',
        e['output'], e['logic'], '\n'.join(e['errorCodes']), '', 'Chưa làm',
        *(['Chưa']*8), ('formula',f'COUNTIF(Q{i}:X{i},"Xong")/8',0), '', '', '', '', '\n'.join(e['tests']), '', 'Mở đặc tả'
    ])
headers=['Mã API','Nhóm','Luồng liên quan','Method','Endpoint','Chức năng','Quyền truy cập','Ưu tiên','Phụ thuộc / quyết định','SQL / adapter','Request / ràng buộc','Response data','Logic nghiệp vụ','Lỗi cần kiểm tra','Người phụ trách','Trạng thái','Thiết kế','DTO / Validate','Auth / Scope','Logic / SQL','Unit test','Integration test','Tài liệu','Review','Tiến độ','Ngày bắt đầu','Hạn hoàn thành','Ngày xong','PR / commit','Tiêu chí nghiệm thu','Bằng chứng test / ghi chú','Liên kết trang']
api = Sheet('API_Checklist',headers,api_rows,{1:13,2:28,3:30,4:10,5:58,6:42,7:44,8:10,9:48,10:48,11:65,12:55,13:80,14:50,15:20,16:20,25:15,30:80,31:45,32:18},freeze='F2')
last=len(api_rows)+1
api.dropdown(f'H2:H{last}',['P0','P1','P2'])
api.dropdown(f'P2:P{last}',['Chưa làm','Đang làm','Chờ review','Bị chặn','Hoàn thành'])
api.dropdown(f'Q2:X{last}',['Chưa','Đang làm','Xong','Không áp dụng'])
for r in range(2,last+1):
    api.styles[(r,25)]=3
    for c in (26,27,28): api.styles[(r,c)]=4
    api.styles[(r,32)]=5
    api.links.append((f'AF{r}',f'../api-guide.html#{data["endpoints"][r-2]["id"]}'))
api.conditional=[f'<conditionalFormatting sqref="Y2:Y{last}"><cfRule type="dataBar" priority="1"><dataBar><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="FF087D72"/></dataBar></cfRule></conditionalFormatting>',f'<conditionalFormatting sqref="P2:P{last}"><cfRule type="containsText" dxfId="0" priority="2" operator="containsText" text="Hoàn thành"><formula>NOT(ISERROR(SEARCH("Hoàn thành",P2)))</formula></cfRule><cfRule type="containsText" dxfId="1" priority="3" operator="containsText" text="Bị chặn"><formula>NOT(ISERROR(SEARCH("Bị chặn",P2)))</formula></cfRule></conditionalFormatting>']
# Date serial limits 2020–2099, allow empty; Excel displays a real date when entered.
api.validations.append(f'<dataValidation type="date" operator="between" allowBlank="1" showErrorMessage="1" sqref="Z2:AB{last}"><formula1>43831</formula1><formula2>73050</formula2></dataValidation>')

guide_rows=[
 ['Mục đích','Checklist bản gốc sinh từ đặc tả API; tất cả endpoint chưa triển khai. Ngày đặc tả 29/10/2026.'],
 ['Bắt đầu','Lưu một bản sao workbook để theo dõi thực tế. File master sẽ được ghi lại khi chạy npm run api:build.'],
 ['Cập nhật','Trong API_Checklist: chọn owner/ưu tiên/trạng thái; đánh dấu 8 bước Q:X; ghi ngày bắt đầu/hạn/ngày xong/PR/bằng chứng test.'],
 ['Tiến độ','Công thức đếm Xong / 8. Không áp dụng vẫn chưa tính xong: ghi lý do và chỉ đặt Xong khi reviewer xác nhận tiêu chí đã được xử lý.'],
 ['Hoàn thành','Chỉ chọn Hoàn thành khi DTO, auth/scope, nghiệp vụ/giao dịch, unit/integration test, tài liệu và review đã có bằng chứng. Dropdown trạng thái là nhập tay; dashboard đếm trạng thái, tiến độ kỹ thuật ở cột Y.'],
 ['Ưu tiên','P0: nền tảng và tính đúng giao dịch; P1: tính năng cơ sở tiếp theo; P2: mở rộng/chính sách chưa chốt. Đây là thứ tự đề xuất, có thể thay.'],
 ['Tổng quan','Dashboard dùng COUNTIF/COUNTIFS/AVERAGE tham chiếu API_Checklist. Excel tính lại khi mở; workbook chứa công thức, lọc, cố định hàng/cột, dropdown và liên kết trang.'],
 ['Các sheet','Luong_Nghiep_vu truy vết đủ 47 luồng; Rang_buoc giữ rule nguồn; DTO_Fields giữ đầu vào; Du_lieu lấy từ SQL thật, gồm ALTER; Quyet_dinh liệt kê phần cần chốt.'],
 ['Phạm vi','Không có backend/cổng thanh toán đã triển khai. Stored procedure có sẵn vẫn cần API/controller/auth/mapping/lỗi/tests; route import/realtime có phụ thuộc riêng.'],
 ['Tệp liên quan','api-guide.html ở thư mục gốc; docs/api-catalog.json là dữ liệu chung. Mở trang bằng file trực tiếp không cần server; file Excel được tải từ nút trên trang.'],
 ['Nguồn','business-guide.js; docs/business-rules.md; app.js; house-rights.js; database/schema.sql. Hash nguồn có trong api-catalog.json.'],
 ['Đồng bộ','node scripts/build-api-guide.cjs (cần Node 22+ và Python 3); npm run api:check kiểm tra dữ liệu/sự tồn tại và cấu trúc Excel. Không chạy migration lên CSDL.'],
]
dashboard=[['Ngày đặc tả','2026-10-29','Bản đề xuất; chưa có backend'],['Tổng API',len(api_rows),'Một hàng = một method + path'],['Tổng luồng',len(flows),'Gồm các luồng không phải HTTP'],['Tổng bảng SQL',len(data['tables']),'Tạo từ schema hiện tại'],['Hoàn thành',('formula',f'COUNTIF(API_Checklist!P2:P{last},"Hoàn thành")',0),'Trạng thái nhập tay'],['Đang làm',('formula',f'COUNTIF(API_Checklist!P2:P{last},"Đang làm")',0),''],['Bị chặn',('formula',f'COUNTIF(API_Checklist!P2:P{last},"Bị chặn")',0),''],['Chưa làm',('formula',f'COUNTIF(API_Checklist!P2:P{last},"Chưa làm")',len(api_rows)),''],['Chờ review',('formula',f'COUNTIF(API_Checklist!P2:P{last},"Chờ review")',0),''],['Tiến độ kỹ thuật TB',('formula',f'AVERAGE(API_Checklist!Y2:Y{last})',0),'Đếm 8 bước / endpoint'],['Hoàn thành nhưng thiếu bước',('formula',f'COUNTIFS(API_Checklist!P2:P{last},"Hoàn thành",API_Checklist!Y2:Y{last},"<1")',0),'Cần review lại trước nghiệm thu'],['Theo nhóm','Số API','Đã hoàn thành']]
for _,name,*_ in data['groups']:
    dashboard.append([name,('formula',f'COUNTIF(API_Checklist!B2:B{last},A{len(dashboard)+2})',sum(groups[e['group']]==name for e in data['endpoints'])),('formula',f'COUNTIFS(API_Checklist!B2:B{last},A{len(dashboard)+2},API_Checklist!P2:P{last},"Hoàn thành")',0)])
summary=Sheet('Tong_quan',['Chỉ số / nhóm','Giá trị','Diễn giải / đã xong'],dashboard,{1:45,2:28,3:72},filters=False)
summary.styles[(11,2)]=3
flow_rows=[[f['id'],groups[f['group']],f['title'],', '.join(f['roles']),f['path'],'\n'.join(f['endpointIds']) or 'Không có HTTP endpoint',', '.join(f['jobIds']),'\n'.join(f['states']),'\n'.join(f['limits']),', '.join(t[0] for t in f['data'])] for f in data['flows']]
rules=[[f['id'],f['title'],layer,rule] for f in data['flows'] for layer,rule in f['rules']]
dto=[[e['id'],e['method']+' '+e['path'],f['name'],f['type'],'Có' if f['required'] else 'Không',f['rule'],json.dumps(f.get('example',''),ensure_ascii=False)] for e in data['endpoints'] for f in e['inputFields']]
dictionary=[[t['name'],c['name'],c['definition'],f'database/schema.sql:{t["line"]}',', '.join(f['id'] for f in data['flows'] if any(x[0]==t['name'] for x in f['data']))] for t in data['tables'] for c in t['columns']]
decision_rows=[[d['id'],d['title'],d['priority'],d['status'],d['detail'],d['owner'],'Chưa chốt','',''] for d in data['decisions']]
decisions_sheet=Sheet('Quyet_dinh',['ID','Vấn đề','Ưu tiên','Tình trạng thiết kế','Nội dung cần chốt','Vai trò phụ trách','Theo dõi','Quyết định / ngày','Người chốt'],decision_rows,{2:42,4:28,5:100,6:32})
decisions_sheet.dropdown(f'G2:G{len(decision_rows)+1}',['Chưa chốt','Đang trao đổi','Đã chốt','Hoãn'])
job_rows=[[j['id'],j['title'],j['flow'],j['schedule'],j['adapter'],j['logic'],j['acceptance'],'','Chưa làm',''] for j in data['jobs']]
jobs_sheet=Sheet('Tac_vu_nen',['ID','Công việc','Luồng','Lịch chạy đề xuất','Adapter','Nghiệp vụ','Nghiệm thu','Owner','Trạng thái','Bằng chứng'],job_rows,{2:42,4:42,5:45,6:95,7:75})
jobs_sheet.dropdown(f'I2:I{len(job_rows)+1}',['Chưa làm','Đang làm','Bị chặn','Hoàn thành'])
qa_rows=[[q['id'],q['title'],q['flow'],q['scenario'],'Chưa chạy','',''] for q in data['qa']]
qa_sheet=Sheet('Kiem_thu',['ID','Ca kiểm thử','Luồng','Kịch bản / kỳ vọng','Kết quả','Người kiểm thử','Bằng chứng / lỗi'],qa_rows,{2:42,4:115,7:55})
qa_sheet.dropdown(f'E2:E{len(qa_rows)+1}',['Chưa chạy','Pass','Fail','Bị chặn'])
sheets=[Sheet('Huong_dan',['Mục','Hướng dẫn'],guide_rows,{1:26,2:135},filters=False),summary,api,Sheet('Luong_Nghiep_vu',['ID luồng','Nhóm','Tên luồng','Vai trò','Điểm vào wireframe','API liên quan','Job / vận hành','Trạng thái','Giới hạn','Bảng dữ liệu'],flow_rows,{3:55,5:75,6:35,8:85,9:100,10:55}),Sheet('Rang_buoc',['ID luồng','Tên luồng','Lớp bảo vệ','Ràng buộc từ nguồn'],rules,{2:55,4:140}),Sheet('DTO_Fields',['API','Method / path','Field','Type','Bắt buộc','Ràng buộc','Ví dụ'],dto,{2:65,3:32,6:100,7:65}),Sheet('Du_lieu',['Bảng','Cột','Định nghĩa SQL hiện tại','Nguồn','Luồng tham chiếu'],dictionary,{1:36,2:40,3:120,4:36,5:80}),decisions_sheet,jobs_sheet,qa_sheet]

styles='''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="'''+NS+'''"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="3"><font><sz val="11"/><color rgb="FF213338"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><u/><sz val="11"/><color rgb="FF087D72"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7F4F1"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"><alignment vertical="top"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="2"><dxf><fill><patternFill patternType="solid"><fgColor rgb="FFC6EFCE"/><bgColor indexed="64"/></patternFill></fill></dxf><dxf><fill><patternFill patternType="solid"><fgColor rgb="FFFFC7CE"/><bgColor indexed="64"/></patternFill></fill></dxf></dxfs></styleSheet>'''
# White header text needs a dark fill distinct from banded body rows.
styles=styles.replace('fills count="3"','fills count="4"').replace('</fills>','<fill><patternFill patternType="solid"><fgColor rgb="FF193536"/><bgColor indexed="64"/></patternFill></fill></fills>').replace('fontId="1" fillId="2"','fontId="1" fillId="3"')

def build():
    members={
        '[Content_Types].xml': '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1))+'</Types>',
        '_rels/.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="'+REL+'/officeDocument" Target="xl/workbook.xml"/></Relationships>',
        'xl/workbook.xml': f'<workbook xmlns="{NS}" xmlns:r="{REL}"><bookViews><workbookView activeTab="1"/></bookViews><sheets>'+''.join(f'<sheet name="{s.name}" sheetId="{i}" r:id="rId{i}"/>' for i,s in enumerate(sheets,1))+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
        'xl/_rels/workbook.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1))+f'<Relationship Id="rId{len(sheets)+1}" Type="{REL}/styles" Target="styles.xml"/></Relationships>',
        'xl/styles.xml':styles,
    }
    for i,s in enumerate(sheets,1):
        members[f'xl/worksheets/sheet{i}.xml']=s.xml()
        if s.links:
            members[f'xl/worksheets/_rels/sheet{i}.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{j}" Type="{REL}/hyperlink" Target="{text(target)}" TargetMode="External"/>' for j,(_,target) in enumerate(s.links,1))+'</Relationships>'
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer,'w',zipfile.ZIP_DEFLATED) as z:
        for name,body in members.items():
            # Stable timestamps make rebuilds byte-for-byte reproducible.
            entry=zipfile.ZipInfo(name,(2026,10,29,0,0,0)); entry.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(entry,body.encode('utf-8'))
    return buffer.getvalue()

def verify():
    assert TARGET.exists(), 'Checklist file missing'
    with zipfile.ZipFile(TARGET) as z:
        assert z.testzip() is None
        for name in z.namelist(): ET.fromstring(z.read(name))
        workbook=ET.fromstring(z.read('xl/workbook.xml'))
        assert len(workbook.find(f'{{{NS}}}sheets'))==10
        api_xml=ET.fromstring(z.read('xl/worksheets/sheet3.xml'))
        rows=api_xml.find(f'{{{NS}}}sheetData')
        assert len(rows)==len(data['endpoints'])+1
        values=[row[0].find(f'{{{NS}}}is/{{{NS}}}t').text for row in list(rows)[1:]]
        assert values==[e['id'] for e in data['endpoints']]
        assert len(api_xml.findall(f'.//{{{NS}}}f'))==len(data['endpoints'])
        assert api_xml.find(f'{{{NS}}}dataValidations') is not None
        assert api_xml.find(f'{{{NS}}}autoFilter') is not None
        assert len(dictionary)>500 and len(flow_rows)==47
        assert len(list(rows)[1])==len(headers), 'Column mismatch'
    print(f'Excel verified: {len(sheets)} sheets, {len(api_rows)} endpoint rows, {len(dictionary)} SQL columns')

if '--check' in sys.argv:
    assert TARGET.exists() and TARGET.read_bytes() == build(), 'Workbook chưa đồng bộ; chạy npm run api:build. Theo dõi tiến độ trên một bản sao riêng.'
else:
    TARGET.write_bytes(build())
verify()
