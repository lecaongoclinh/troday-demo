const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
const P=JSON.parse(fs.readFileSync(path.join(root,'docs/work-plan.json'),'utf8'));
const C=JSON.parse(fs.readFileSync(path.join(root,'docs/api-catalog.json'),'utf8'));
const tasks=new Map(P.tasks.map(t=>[t.id,t]));

test('Every real endpoint has exactly one accountable task and owner',()=>{
  const assigned=P.tasks.flatMap(t=>t.apiIds.map(id=>({id,owner:t.owner,taskId:t.id})));
  assert.equal(assigned.length,C.endpoints.length);
  assert.equal(new Set(assigned.map(a=>a.id)).size,C.endpoints.length);
  assert.deepEqual(assigned.map(a=>a.id).sort(),C.endpoints.map(e=>e.id).sort());
  for(const a of P.assignments){
    const original=C.endpoints.find(e=>e.id===a.id);
    assert.equal(a.method,original.method);assert.equal(a.path,C.basePath+original.path);
    assert.equal(tasks.get(a.taskId).owner,a.owner);assert.ok(tasks.get(a.taskId).apiIds.includes(a.id));
  }
  assert.deepEqual(P.people.map(p=>p.apiCount),[61,73,42]);
  assert.equal(P.assignments.find(a=>a.id==='API-027').owner,'C');
  assert.equal(P.assignments.find(a=>a.id==='API-048').owner,'C');
  assert.equal(P.assignments.find(a=>a.id==='API-091').owner,'B');
});
test('Dependencies include cross-module acceptance, stay acyclic and precede the target phase',()=>{
  const visiting=new Set(),done=new Set();
  function walk(id){assert.ok(!visiting.has(id),'cycle at '+id);if(done.has(id))return;visiting.add(id);const t=tasks.get(id);assert.ok(t,id);for(const dep of t.blockers){assert.ok(Number(tasks.get(dep).phase.slice(1))<=Number(t.phase.slice(1)),id+' precedes '+dep);walk(dep);}visiting.delete(id);done.add(id);}
  P.tasks.forEach(t=>walk(t.id));assert.equal(done.size,52);
  assert.deepEqual(P.tasks.filter(t=>!t.blockers.length).map(t=>t.id).sort(),['BE-A01']);
  assert.ok(tasks.get('BE-B08').blockers.includes('BE-A08'));
  assert.ok(tasks.get('BE-C05').blockers.includes('BE-B09'));
  assert.ok(tasks.get('BE-A10').dependsOn.includes('BE-C07'));
});

test('One serial queue covers every task, with each prerequisite and provider strictly earlier',()=>{
  assert.equal(P.mode,'sequential');assert.equal(P.sequencePolicy.maxActiveTasks,1);
  assert.deepEqual(P.executionOrder,P.tasks.map(t=>t.id));
  assert.deepEqual(P.executionOrder.slice(0,4),['BE-A01','BE-B01','BE-C01','BE-A02']);
  for(const [i,t]of P.tasks.entries()){
    assert.equal(t.order,i+1);assert.equal(t.previousTaskId,i?P.tasks[i-1].id:null);
    assert.equal(t.nextTaskId,P.tasks[i+1]?.id||null);assert.equal(t.integrationWith.length,0);
    if(i)assert.ok(t.blockers.includes(P.tasks[i-1].id));
    for(const id of t.blockers)assert.ok(tasks.get(id).order<t.order,t.id+' waits for future task '+id);
    for(const id of t.requiredInterfaces){const provider=P.interfaces.find(x=>x.id===id);assert.ok(provider.order<t.order,t.id+' uses future provider '+id);}
  }
  for(const p of P.phases){const own=P.tasks.filter(t=>t.phase===p.id);assert.equal(p.firstOrder,own[0].order);assert.equal(p.lastOrder,own.at(-1).order);assert.equal(p.lastOrder-p.firstOrder+1,own.length);assert.deepEqual(P.gates.find(g=>g.phase===p.id).taskIds,own.map(t=>t.id));}
  assert.ok(tasks.get('BE-A04').order<tasks.get('BE-C03').order); // Audit exists before template.
  assert.ok(tasks.get('BE-B13').order<tasks.get('BE-A11').order); // Connection before share.
  assert.ok(tasks.get('BE-C07').order<tasks.get('BE-A10').order); // Move-in before invoice.
  assert.ok(tasks.get('BE-A13').order<tasks.get('BE-C11').order); // Payment before handover test.
});
test('File owners and integration providers are consistent; effort accounts for foundational and transactional work',()=>{
  const paths=new Map();
  for(const m of P.modules){for(const file of m.paths){if(paths.has(file))assert.equal(paths.get(file),m.owner,file);paths.set(file,m.owner);}}
  for(const t of P.tasks){for(const id of t.modules)assert.equal(P.modules.find(m=>m.id===id).owner,t.owner);assert.notEqual(t.owner,t.reviewer);assert.ok(t.deliverables.length>=3&&t.acceptance.length>=2);}
  assert.equal(paths.get('database/schema.sql'),'A');assert.equal(paths.get('database/source/viewing-proposals.sql'),'B');assert.equal(paths.get('database/source/workflows.sql'),'C');
  for(const i of P.interfaces)assert.equal(tasks.get(i.taskId).owner,i.owner);
  for(const p of P.people)assert.equal(p.points,P.tasks.filter(t=>t.owner===p.id).reduce((n,t)=>n+t.points,0));
  assert.ok(Math.max(...P.people.map(p=>p.points))/Math.min(...P.people.map(p=>p.points))<1.1);
});
test('Java Spring Boot plan defines feature ownership and safe transaction boundaries without claiming implementation',()=>{
  const a=P.architecture;
  assert.equal(a.language,'Java 21 LTS');assert.equal(a.framework,'Spring Boot');assert.equal(a.buildTool,'Maven Wrapper');assert.equal(a.basePackage,'com.troday');
  assert.match(a.status,/chưa có ứng dụng Java/);assert.match(a.versionPolicy,/BE-A01/);
  assert.match(a.tree,/TrodayApplication\.java/);assert.match(a.featureTree,/@RestController/);
  const shared=P.modules.find(m=>m.id==='platform');
  for(const file of ['backend/pom.xml','backend/mvnw.cmd','backend/src/main/java/com/troday/TrodayApplication.java'])assert.ok(shared.paths.includes(file));
  for(const m of P.modules)for(const file of m.paths){assert.doesNotMatch(file,/backend\/(src\/modules|tests\/)/);if(file.includes('/java/'))assert.ok(file.startsWith('backend/src/main/java/com/troday/')||file.startsWith('backend/src/test/java/com/troday/'));}
  assert.match(JSON.stringify(tasks.get('BE-A02')),/Propagation\.NEVER/);assert.match(JSON.stringify(tasks.get('BE-C08')),/@Transactional/);
  assert.match(a.conventions.find(x=>x.title==='Giao dịch do procedure quản lý').body,/không self-invocation/);
  assert.ok(a.references.every(x=>x.url.startsWith('https://docs.spring.io/')));
  assert.ok(P.sequencePolicy.compatibleBlueprintHashes.includes('07c6e1d0157545fa9b3588432b1f460f53bfcaee6168931c948b947b4a319902'));
  const index=fs.readFileSync(path.join(root,'index.html'),'utf8');
  assert.match(index,/class="button api-guide-link"[^>]*>[\s\S]*?<\/a>\s*<a class="button work-plan-link" href="work-plan.html"/);
});

test('All workflows, decisions, jobs and risk scenarios remain traceable',()=>{
  assert.deepEqual(P.coverageFlows.map(f=>f.id),C.flows.map(f=>f.id));
  for(const f of P.coverageFlows)assert.ok(f.taskIds.length,f.id);
  assert.deepEqual(P.jobs.map(j=>j.id),C.jobs.map(j=>j.id));
  for(const job of P.jobs){assert.ok(tasks.get(job.taskId).jobs.includes(job.id));assert.equal(tasks.get(job.taskId).owner,job.owner);}
  assert.deepEqual(P.decisions.map(d=>d.id),C.decisions.map(d=>d.id));
  for(const d of P.decisions)assert.equal(tasks.get(d.taskId).owner,d.owner);
  for(const q of C.qa)assert.ok(P.qa.find(t=>t.id===q.id)?.taskIds.length,q.id);
  for(const g of P.gates)for(const id of g.taskIds)assert.ok(tasks.has(id));
});
test('Browser/JSON data and source hashes match; static entry points are complete and FE/AI panels are blank',()=>{
  const browser=vm.createContext({window:{}});vm.runInContext(fs.readFileSync(path.join(root,'work-plan-data.js'),'utf8'),browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.window.TRODAY_WORK_PLAN)),P);
  for(const [file,hash] of Object.entries(P.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,file);
  const html=fs.readFileSync(path.join(root,'work-plan.html'),'utf8');
  for(const tab of ['fe','ai'])assert.match(html,new RegExp('<section id="panel-'+tab+'"[^>]*hidden><\\/section>'));
  for(const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:[^\"]*)"/g))if(!/^(https?:|#)/.test(match[1]))assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
});
test('Workbook has actual task/API rows, formulas, validations, working links and empty FE/AI sheets',()=>{
  const script=`import zipfile,xml.etree.ElementTree as E,json
from pathlib import Path
p=json.loads(Path('docs/work-plan.json').read_text(encoding='utf-8'));n={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with zipfile.ZipFile('docs/backend-team-checklist.xlsx') as z:
 assert z.testzip() is None
 w=E.fromstring(z.read('xl/workbook.xml')); assert len(w.find('m:sheets',n))==13
 s=E.fromstring(z.read('xl/worksheets/sheet3.xml'));rows=s.find('m:sheetData',n)
 assert len(rows)==len(p['tasks'])+1
 assert [r[0].find('m:is/m:t',n).text for r in list(rows)[1:]]==[t['id'] for t in p['tasks']]
 assert [int(r[2].find('m:v',n).text) for r in list(rows)[1:]]==list(range(1,53))
 assert [r[11].find('m:is/m:t',n).text for r in list(rows)[1:]]==[t['previousTaskId'] or 'Bắt đầu' for t in p['tasks']]
 assert s.find('m:dataValidations',n) is not None and s.find('m:autoFilter',n) is not None
 assert len(s.findall('m:sheetData/m:row/m:c/m:f',n))==3*len(p['tasks'])
 assert len(E.fromstring(z.read('xl/worksheets/sheet4.xml')).find('m:sheetData',n))==177
 architecture=E.fromstring(z.read('xl/worksheets/sheet11.xml'))
 assert 'Cau_truc_BE'==list(w.find('m:sheets',n))[10].get('name')
 assert 'TrodayApplication.java' in ''.join(architecture.itertext())
 assert 'Propagation.NEVER' in ''.join(architecture.itertext())
 for i in [12,13]: assert len(E.fromstring(z.read('xl/worksheets/sheet%d.xml'%i)).find('m:sheetData',n))==0
 assert b'work-plan.html#BE-A01' in z.read('xl/worksheets/_rels/sheet3.xml.rels')
print('Workbook coverage and blank tabs verified')`;
  const result=spawnSync('python',['-c',script],{cwd:root,encoding:'utf8',windowsHide:true});
  assert.equal(result.status,0,result.stderr||result.stdout);
});
