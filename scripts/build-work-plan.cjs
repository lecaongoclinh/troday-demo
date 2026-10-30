const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const blueprint=require('./work-plan-blueprint.cjs');
const root=path.resolve(__dirname,'..');
const cataloguePath=path.join(root,'docs/api-catalog.json');
const api=JSON.parse(fs.readFileSync(cataloguePath,'utf8'));
const clone=value=>JSON.parse(JSON.stringify(value));
const plan=clone(blueprint);
const {tasks,people,phases,modules,interfaces,gates}=plan;
const executionOrder=plan.executionOrder;
if(executionOrder.length!==tasks.length||new Set(executionOrder).size!==tasks.length)throw Error('Sequence must list each task once');
const ordinal=new Map(executionOrder.map((id,i)=>[id,i+1]));
for(const task of tasks){
  if(!ordinal.has(task.id))throw Error('Task absent from global sequence '+task.id);
  task.order=ordinal.get(task.id);
  task.previousTaskId=executionOrder[task.order-2]||null;
  task.nextTaskId=executionOrder[task.order]||null;
}
tasks.sort((a,b)=>a.order-b.order);
const byTask=new Map(tasks.map(t=>[t.id,t]));
const apiById=new Map(api.endpoints.map(e=>[e.id,e]));
const moduleById=new Map(modules.map(m=>[m.id,m]));
if(byTask.size!==tasks.length)throw Error('Duplicate task ID');
const assigned=new Map();
const visited=new Set(),visiting=new Set();
function visit(id){
  if(visiting.has(id))throw Error('Dependency cycle at '+id);
  if(visited.has(id))return;
  const task=byTask.get(id);if(!task)throw Error('Unknown task '+id);
  visiting.add(id);
  for(const dep of task.blockers)visit(dep);
  visiting.delete(id);visited.add(id);
}
for(const task of tasks){
  if(!people.some(p=>p.id===task.owner)||!phases.some(p=>p.id===task.phase))throw Error('Unknown owner/phase '+task.id);
  task.reviewer=people.find(p=>p.id===task.owner).reviewer;
  task.requiredInterfaces=plan.interfaceRequirements[task.id]||[];
  task.integrationWith ||= [];
  if(task.integrationWith.length)throw Error('Fold integration dependencies into explicit prerequisites '+task.id);
  task.decisions ||= [];
  task.jobs ||= [];
  task.qa ||= [];
  task.handoff ||= [];
  task.files=[...new Set(task.modules.flatMap(id=>{
    const module=moduleById.get(id);if(!module)throw Error('Unknown module '+id);
    if(module.owner!==task.owner)throw Error('Cross-owner edit '+task.id+' '+id);
    return module.paths;
  }))];
  task.blockers=[...new Set([...task.dependsOn,...(task.previousTaskId?[task.previousTaskId]:[])])];
  for(const dep of task.blockers){
    if(!byTask.has(dep)||dep===task.id)throw Error('Invalid dependency '+task.id+' '+dep);
    const provider=byTask.get(dep);
    if(Number(provider.phase.slice(1))>Number(task.phase.slice(1)))throw Error('Task precedes dependency '+task.id+' '+dep);
    if(provider.order>=task.order)throw Error('Dependency must finish earlier in the serial queue '+task.id+' '+dep);
  }
  for(const id of task.apiIds){
    if(!apiById.has(id))throw Error('Unknown API '+id);
    if(assigned.has(id))throw Error('API assigned twice '+id);
    assigned.set(id,task.id);
  }
  for(const id of task.decisions)if(!api.decisions.some(d=>d.id===id))throw Error('Unknown decision '+id);
  for(const id of task.jobs)if(!api.jobs.some(d=>d.id===id))throw Error('Unknown job '+id);
  for(const id of task.qa)if(!api.qa.some(d=>d.id===id))throw Error('Unknown QA '+id);
  if(!task.deliverables.length||task.acceptance.length<2||!task.points)throw Error('Incomplete task '+task.id);
}
for(const task of tasks)visit(task.id);
for(const endpoint of api.endpoints)if(!assigned.has(endpoint.id))throw Error('Unassigned endpoint '+endpoint.id);
for(const item of interfaces){if(byTask.get(item.taskId)?.owner!==item.owner)throw Error('Wrong interface owner '+item.id);item.order=byTask.get(item.taskId).order;}
for(const task of tasks)for(const id of task.requiredInterfaces){
  const provider=interfaces.find(i=>i.id===id);
  if(!provider||provider.order>=task.order)throw Error('Provider must be implemented before consumer '+task.id+' '+id);
}
for(const gate of gates)for(const id of gate.taskIds)if(!byTask.has(id))throw Error('Unknown gate task '+id);
for(const decision of plan.decisions){if(byTask.get(decision.taskId)?.owner!==decision.owner)throw Error('Wrong decision owner '+decision.id);}
if(plan.decisions.length!==api.decisions.length)throw Error('Decision coverage mismatch');
const jobs=api.jobs.map(j=>{
  const owners=tasks.filter(t=>t.jobs.includes(j.id));
  if(owners.length!==1)throw Error('Job needs one owner '+j.id);
  return {...j,owner:owners[0].owner,taskId:owners[0].id,order:owners[0].order};
});
const qa=api.qa.map(q=>{
  const linked=tasks.filter(t=>t.qa.includes(q.id));if(!linked.length)throw Error('Unassigned QA '+q.id);
  return {...q,taskIds:linked.map(t=>t.id),owners:[...new Set(linked.map(t=>t.owner))]};
});
const assignments=api.endpoints.map(e=>{
  const task=byTask.get(assigned.get(e.id));
  return {id:e.id,method:e.method,path:api.basePath+e.path,title:e.title,group:e.group,flowIds:e.flowIds,taskId:task.id,owner:task.owner,reviewer:task.reviewer,phase:task.phase,order:task.order,decision:e.decision||null};
});
for(const p of people){
  const own=tasks.filter(t=>t.owner===p.id);
  p.taskCount=own.length;p.points=own.reduce((a,t)=>a+t.points,0);p.apiCount=assignments.filter(e=>e.owner===p.id).length;
  own.sort((a,b)=>a.order-b.order).forEach((task,i)=>task.ownerOrder=i+1);
}
for(const phase of phases){
  phase.taskIds=tasks.filter(t=>t.phase===phase.id).map(t=>t.id);
  phase.points=tasks.filter(t=>t.phase===phase.id).reduce((a,t)=>a+t.points,0);
  phase.firstOrder=byTask.get(phase.taskIds[0]).order;
  phase.lastOrder=byTask.get(phase.taskIds.at(-1)).order;
  if(phase.lastOrder-phase.firstOrder+1!==phase.taskIds.length)throw Error('Phase must be contiguous '+phase.id);
  const gate=gates.find(g=>g.phase===phase.id);
  if(JSON.stringify(gate.taskIds)!==JSON.stringify(phase.taskIds))throw Error('Gate/phase sequence mismatch '+phase.id);
}
const chains=[];
const depths=new Map();
function depth(id){if(depths.has(id))return depths.get(id);const t=byTask.get(id);const result=t.blockers.length?1+Math.max(...t.blockers.map(depth)):1;depths.set(id,result);return result;}
for(const task of tasks)depth(task.id);
let tail=tasks.reduce((best,t)=>depth(t.id)>depth(best)?t.id:best,tasks[0].id);
while(tail){chains.unshift(tail);const t=byTask.get(tail);tail=t.blockers.length?t.blockers.reduce((best,id)=>depth(id)>depth(best)?id:best,t.blockers[0]):null;}
const checklist=['Thiết kế / contract','Code / SQL','Validate / phân quyền','Test module / DB','Test tích hợp','Tài liệu / bàn giao','Review / merge'];
const decisions=api.decisions.map(d=>({...d,...plan.decisions.find(x=>x.id===d.id),originalStatus:d.status}));
const coverageFlows=api.flows.map(f=>({id:f.id,title:f.title,taskIds:[...new Set(assignments.filter(e=>e.flowIds.includes(f.id)).map(e=>e.taskId).concat(jobs.filter(j=>j.flow===f.id).map(j=>j.taskId)))],apiCount:f.endpointIds.length}));
for(const f of coverageFlows)if(!f.taskIds.length)throw Error('Unmapped flow '+f.id);
const data={version:'2.0-sequential',mode:'sequential',date:'2026-10-29',backendLayout:'Java 21 · Spring Boot · Maven · MySQL; modular monolith theo package chức năng. Đây là kế hoạch, chưa có ứng dụng Java thật.',architecture:plan.architecture,assumptions:['Một hàng đợi chung 01–52, tối đa một task đang thực hiện. A/B/C giữ owner theo module và nhận bàn giao khi đến lượt.','SP là độ lớn tương đối, không phải số ngày hay lịch làm việc ba người; chưa đặt deadline.','Đường dẫn backend/** là cấu trúc dự kiến. Trang này lập kế hoạch/checklist, không triển khai backend hoặc sửa CSDL.','Task trước phải review/merge và bàn giao provider thật, commit main, SQL/test trước khi mở task tiếp theo. Giữ task ID để đối chiếu tiến độ cũ.'],sourceHashes:{'docs/api-catalog.json':crypto.createHash('sha256').update(fs.readFileSync(cataloguePath)).digest('hex'),'scripts/work-plan-blueprint.cjs':crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'work-plan-blueprint.cjs'))).digest('hex'),'scripts/spring-boot-plan.cjs':crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'spring-boot-plan.cjs'))).digest('hex')},executionOrder,sequencePolicy:plan.sequencePolicy,people,phases,modules,tasks,interfaces,gates,rules:plan.rules,decisions,jobs,qa,assignments,coverageFlows,groups:api.groups,checklist,statuses:['Chưa làm','Đang làm','Chờ review','Bị chặn','Hoàn thành'],dependencyChain:chains,counts:{tasks:tasks.length,apis:assignments.length,flows:coverageFlows.length,points:tasks.reduce((n,t)=>n+t.points,0),phases:phases.length}};
const json=JSON.stringify(data,null,2)+'\n';
const browser='// Generated by npm run plan:build. Edit scripts/work-plan-blueprint.cjs.\nwindow.TRODAY_WORK_PLAN = '+JSON.stringify(data).replace(/</g,'\\u003c')+';\n';
const outputs=[['docs/work-plan.json',json],['work-plan-data.js',browser]];
const check=process.argv.includes('--check');
for(const[file,body]of outputs){const target=path.join(root,file);if(check){if(!fs.existsSync(target)||fs.readFileSync(target,'utf8')!==body)throw Error(file+' chưa đồng bộ; chạy npm run plan:build');}else fs.writeFileSync(target,body);}
const xlsx=spawnSync('python',[path.join(__dirname,'build-work-plan-checklist.py'),...(check?['--check']:[])],{cwd:root,encoding:'utf8',windowsHide:true});
process.stdout.write(xlsx.stdout||'');if(xlsx.status!==0)throw Error(xlsx.stderr||'Workbook generation failed');
console.log(`${data.counts.tasks} tasks / ${data.counts.apis} APIs / ${data.counts.phases} phases / ${data.counts.points} SP`);
for(const p of people)console.log(`${p.id}: ${p.taskCount} tasks, ${p.apiCount} APIs, ${p.points} SP`);
