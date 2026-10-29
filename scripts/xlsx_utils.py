"""Small OOXML writer used by the team-plan checklist (Python standard library)."""
import io
import zipfile
from xml.sax.saxutils import escape

NS='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
REL='http://schemas.openxmlformats.org/officeDocument/2006/relationships'

def xml(value):
    return escape(str(value), {'"':'&quot;'})

def col(value):
    result=''
    while value:
        value,remainder=divmod(value-1,26)
        result=chr(65+remainder)+result
    return result

def cell(ref,value,style=0):
    if isinstance(value,tuple) and value[0]=='formula':
        cached=value[2]
        type_attribute=' t="str"' if isinstance(cached,str) else ''
        return f'<c r="{ref}" s="{style}"{type_attribute}><f>{xml(value[1])}</f><v>{xml(cached)}</v></c>'
    if isinstance(value,(int,float)):
        return f'<c r="{ref}" s="{style}"><v>{value}</v></c>'
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t xml:space="preserve">{xml(value)}</t></is></c>'

class Sheet:
    def __init__(self,name,headers=None,rows=None,widths=None,freeze='A2',filters=True):
        self.name=name;self.headers=headers or [];self.rows=rows or [];self.widths=widths or {}
        self.freeze=freeze;self.filters=filters;self.styles={};self.links=[];self.validations=[];self.conditionals=[]

    def dropdown(self,range_,values):
        values=xml(','.join(values))
        self.validations.append(f'<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Giá trị không hợp lệ" error="Chọn từ danh sách." sqref="{range_}"><formula1>"{values}"</formula1></dataValidation>')

    def serialize(self):
        if not self.headers:
            return f'<worksheet xmlns="{NS}"><dimension ref="A1"/><sheetData/></worksheet>'
        end=f'{col(len(self.headers))}{len(self.rows)+1}'
        letters=''.join(c for c in self.freeze if c.isalpha());ysplit=int(''.join(c for c in self.freeze if c.isdigit()))-1
        xsplit=0
        for c in letters:xsplit=xsplit*26+ord(c)-64
        xsplit-=1
        pane=f'<pane xSplit="{xsplit}" ySplit="{ysplit}" topLeftCell="{self.freeze}" activePane="bottomRight" state="frozen"/>'
        columns=''.join(f'<col min="{i}" max="{i}" width="{self.widths.get(i,24)}" customWidth="1"/>' for i in range(1,len(self.headers)+1))
        data='<row r="1" ht="38" customHeight="1">'+''.join(cell(f'{col(i)}1',v,1) for i,v in enumerate(self.headers,1))+'</row>'
        for r,row in enumerate(self.rows,2):
            data+=f'<row r="{r}" ht="72" customHeight="1">'+''.join(cell(f'{col(c)}{r}',v,self.styles.get((r,c),2 if r%2==0 else 0)) for c,v in enumerate(row,1))+'</row>'
        validations=f'<dataValidations count="{len(self.validations)}">'+''.join(self.validations)+'</dataValidations>' if self.validations else ''
        links='<hyperlinks>'+''.join(f'<hyperlink ref="{ref}" r:id="rId{i}"/>' for i,(ref,_) in enumerate(self.links,1))+'</hyperlinks>' if self.links else ''
        autofilter=f'<autoFilter ref="A1:{end}"/>' if self.filters else ''
        return f'<worksheet xmlns="{NS}" xmlns:r="{REL}"><dimension ref="A1:{end}"/><sheetViews><sheetView workbookViewId="0">{pane}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="20"/><cols>{columns}</cols><sheetData>{data}</sheetData>{autofilter}{"".join(self.conditionals)}{validations}{links}<pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" paperSize="9"/></worksheet>'

STYLES=f'''<styleSheet xmlns="{NS}"><numFmts count="1"><numFmt numFmtId="164" formatCode="yyyy-mm-dd"/></numFmts><fonts count="3"><font><sz val="11"/><name val="Calibri"/><color rgb="FF213338"/></font><font><b/><sz val="11"/><name val="Calibri"/><color rgb="FFFFFFFF"/></font><font><u/><sz val="11"/><name val="Calibri"/><color rgb="FF087D72"/></font></fonts><fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF0F5F3"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF193536"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE2F3EA"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8F0FC"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF0DA"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="1" fillId="3" borderId="0" xfId="0"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="2" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="10" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0"><alignment vertical="top"/></xf><xf numFmtId="0" fontId="0" fillId="4" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="5" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="6" borderId="0" xfId="0"><alignment vertical="top" wrapText="1"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles><dxfs count="0"/></styleSheet>'''

def workbook(sheets,active_tab=1):
    members={
      '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'+''.join(f'<Override PartName="/xl/worksheets/sheet{i}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' for i in range(1,len(sheets)+1))+'</Types>',
      '_rels/.rels':f'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>',
      'xl/workbook.xml':f'<workbook xmlns="{NS}" xmlns:r="{REL}"><bookViews><workbookView activeTab="{active_tab}"/></bookViews><sheets>'+''.join(f'<sheet name="{xml(s.name)}" sheetId="{i}" r:id="rId{i}"/>' for i,s in enumerate(sheets,1))+'</sheets><calcPr calcId="191029" fullCalcOnLoad="1" forceFullCalc="1"/></workbook>',
      'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>' for i in range(1,len(sheets)+1))+f'<Relationship Id="rId{len(sheets)+1}" Type="{REL}/styles" Target="styles.xml"/></Relationships>',
      'xl/styles.xml':STYLES
    }
    for i,sheet in enumerate(sheets,1):
        members[f'xl/worksheets/sheet{i}.xml']=sheet.serialize()
        if sheet.links:
            members[f'xl/worksheets/_rels/sheet{i}.xml.rels']='<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+''.join(f'<Relationship Id="rId{n}" Type="{REL}/hyperlink" Target="{xml(target)}" TargetMode="External"/>' for n,(_,target) in enumerate(sheet.links,1))+'</Relationships>'
    output=io.BytesIO()
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for name,content in members.items():
            info=zipfile.ZipInfo(name,(2026,10,29,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(info,content.encode('utf-8'))
    return output.getvalue()
