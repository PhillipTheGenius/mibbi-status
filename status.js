import {checks,parseReport,parseHistory,state} from './report.mjs?v=20261114';
const worker='https://mibbi-public-status.sweet-violet-790f.workers.dev/';
const github='https://raw.githubusercontent.com/PhillipTheGenius/mibbi-status/main/';
const date=value=>new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(value))+' UTC';
const label=value=>value==='ok'?'Checks passing':value==='issue'?'Needs attention':'Awaiting update';
function indicator(element,value){element.dataset.state=value;element.textContent=value==='ok'?'✓':value==='issue'?'!':'–';}
function render(report){
  const result=state(report);
  document.querySelector('#banner').dataset.state=result;
  indicator(document.querySelector('#summary .indicator'),result);
  document.querySelector('#summary-text').textContent=!report?'Current status unavailable':report.stale?'Waiting for a fresh check':result==='ok'?'Public checks are passing':'A public check needs attention';
  document.querySelector('#description').textContent=!report?'We could not retrieve the latest result. Try refreshing or contact Mibbi.':report.stale?'The latest results are out of date. They do not confirm the current status.':result==='ok'?'The monitored public pages and access check passed their latest check.':'One or more checks did not pass. Expand the services below for details.';
  const checked=document.querySelector('#checked');checked.replaceChildren();
  if(report){checked.append('Last checked ');const time=document.createElement('time');time.dateTime=report.checkedAt;time.textContent=date(report.checkedAt);checked.append(time);}else checked.textContent='No current result';
  for(const group of document.querySelectorAll('[data-group]')){
    const ids=group.dataset.group.split(','),value=state(report,ids);
    indicator(group.querySelector('.indicator'),value);group.querySelector('.outcome').textContent=label(value);
    const list=group.querySelector('ul');list.replaceChildren();
    for(const [id,name] of checks.filter(([id])=>ids.includes(id))){
      const li=document.createElement('li'),text=document.createElement('span'),outcome=document.createElement('span');
      const check=report?.checks.find(check=>check.id===id),status=!check||report.stale?'unknown':check.ok?'ok':'issue';
      text.textContent=name;outcome.textContent=label(status);outcome.dataset.state=status;li.append(text,outcome);list.append(li);
    }
  }
}
async function read(base,file){
  try{
    const response=await fetch(base+file,{cache:'no-store',signal:AbortSignal.timeout(6000)});
    return response.ok?await response.json():null;
  }catch{return null;}
}
async function latest(){
  const scheduled=parseReport(await read(worker,'status.json'));
  if(scheduled&&!scheduled.stale)return {report:scheduled,source:worker};
  const fallback=parseReport(await read(github,'status.json'));
  if(fallback&&(!scheduled||Date.parse(fallback.checkedAt)>Date.parse(scheduled.checkedAt)))return {report:fallback,source:github};
  return {report:scheduled,source:worker};
}
async function load(){
  const button=document.querySelector('#refresh');if(button.disabled)return;button.disabled=true;
  try{
    const {report,source}=await latest();
    render(report);
    let history=parseHistory(await read(source,'history.json'));
    if(!history.length&&source===worker)history=parseHistory(await read(github,'history.json'));
    const list=document.querySelector('#history-list');list.replaceChildren();
    document.querySelector('#history-error').textContent=history.length?'':'Recent history is unavailable.';
    for(const item of history){const li=document.createElement('li'),time=document.createElement('time'),outcome=document.createElement('span');time.dateTime=item.checkedAt;time.textContent=date(item.checkedAt);const passed=item.checks.every(check=>check.ok);outcome.dataset.state=passed?'ok':'issue';outcome.textContent=passed?'All listed checks passed':'A check needed attention';li.append(time,outcome);list.append(li);}
  }catch{document.querySelector('#history-list').replaceChildren();document.querySelector('#history-error').textContent='Recent history is unavailable.';}
  finally{button.disabled=false;}
}
render(null);document.querySelector('#summary-text').textContent='Loading the latest check…';document.querySelector('#description').textContent='Retrieving the latest recorded result.';document.querySelector('#refresh').addEventListener('click',load);
setInterval(()=>{if(!document.hidden)void load();},60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)void load();});
await load();
