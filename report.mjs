export const checks = [['website','Public website'],['signin','Sign-in page'],['help','Help centre'],['security','Security information'],['project-guard','Signed-out project access check']];
export function parseReport(value, now=Date.now()) {
  if (!value || value.version!==1 || !Array.isArray(value.checks) || value.checks.length!==checks.length || typeof value.checkedAt!=='string') return null;
  const age=now-Date.parse(value.checkedAt);
  if (!Number.isFinite(age) || age < -60000) return null;
  const parsed=[];
  for (const [id,label] of checks) {
    const matches=value.checks.filter(item=>item && item.id===id);
    if(matches.length!==1 || typeof matches[0].ok!=='boolean') return null;
    parsed.push({id,label,ok:matches[0].ok});
  }
  return {checkedAt:value.checkedAt,stale:age>25*60000,checks:parsed};
}
export function state(report, ids=checks.map(([id])=>id)) {
  return !report || report.stale ? 'unknown' : report.checks.filter(check=>ids.includes(check.id)).every(check=>check.ok) ? 'ok' : 'issue';
}
export function parseHistory(value,now=Date.now()) {
  if(!Array.isArray(value)) return [];
  const unique=new Map();
  for(const item of value.slice(-144)) {const report=parseReport(item,now);if(report)unique.set(report.checkedAt,report);}
  return [...unique.values()].sort((a,b)=>Date.parse(b.checkedAt)-Date.parse(a.checkedAt)).slice(0,12);
}
