const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const crypto=require('node:crypto');
const root=path.resolve(__dirname,'..');
const C=JSON.parse(fs.readFileSync(path.join(root,'docs/api-catalog.json'),'utf8'));
const sql=fs.readFileSync(path.join(root,'database/schema.sql'),'utf8');

test('API catalogue traces every current workflow and table without invented procedures',()=>{
  const sandbox=vm.createContext({document:{addEventListener(){}}});
  vm.runInContext(fs.readFileSync(path.join(root,'business-guide.js'),'utf8'),sandbox);
  const original=JSON.parse(vm.runInContext('JSON.stringify(BUSINESS_FLOWS)',sandbox));
  assert.deepEqual(C.flows.map(f=>f.id),original.map(f=>f.id));
  assert.deepEqual(C.tables.map(t=>t.name).sort(),[...sql.matchAll(/CREATE TABLE\s+`?(\w+)`?/g)].map(m=>m[1]).sort());
  for(const flow of C.flows){
    assert.ok(flow.endpointIds.length||flow.jobIds.length,flow.id);
    for(const id of flow.endpointIds)assert.ok(C.endpoints.find(e=>e.id===id)?.flowIds.includes(flow.id),id);
  }
  const keys=new Set();
  for(const e of C.endpoints){
    assert.ok(!keys.has(e.method+' '+e.path));keys.add(e.method+' '+e.path);
    assert.ok(e.access&&e.logic&&e.output&&e.tests.length>=4,e.id);
    if(e.adapter.startsWith('sp_'))assert.match(sql,new RegExp('CREATE PROCEDURE '+e.adapter+'\\s*\\('));
    for(const name of e.tables)assert.ok(C.tables.some(t=>t.name===name),name);
    if(e.decision)assert.ok(C.decisions.some(d=>d.id===e.decision));
    assert.ok(!e.inputFields.some(f=>['actorId','landlordId','paidById'].includes(f.name)));
  }
});
test('Browser catalogue and JSON are identical and source hashes are current',()=>{
  const browser=vm.createContext({window:{}});
  vm.runInContext(fs.readFileSync(path.join(root,'api-catalog.js'),'utf8'),browser);
  assert.deepEqual(JSON.parse(JSON.stringify(browser.window.TRODAY_API_CATALOG)),C);
  for(const [file,hash]of Object.entries(C.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash,file);
});
test('SQL dictionary incorporates added house columns and keeps exact DDL constraints',()=>{
  const house=C.tables.find(t=>t.name==='rental_houses');
  for(const name of ['name','row_version','verification_version','creation_key'])assert.ok(house.columns.some(c=>c.name===name),name);
  assert.ok(house.ddl.includes('uq_houses_creation'));
  const catalogue=C.tables.find(t=>t.name==='rental_services');
  assert.ok(!catalogue.columns.some(c=>c.name==='active'||c.name==='code'));
  assert.ok(C.decisions.find(d=>d.id==='D10').detail.includes('expected revision'));
});
test('Every download and local script is present and XLSX has a ZIP signature',()=>{
  const html=fs.readFileSync(path.join(root,'api-guide.html'),'utf8');
  for(const match of html.matchAll(/(?:href|src)="([^"?#]+)(?:[^\"]*)"/g)){
    if(/^(https?:|#)/.test(match[1]))continue;
    assert.ok(fs.existsSync(path.join(root,match[1])),match[1]);
  }
  const xlsx=fs.readFileSync(path.join(root,'docs/api-development-checklist.xlsx'));
  assert.equal(xlsx.subarray(0,4).toString('hex'),'504b0304');
  assert.ok(xlsx.length>25000);
});
