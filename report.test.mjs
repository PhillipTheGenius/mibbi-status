import test from 'node:test';
import assert from 'node:assert/strict';
import {checks,parseReport,parseHistory,state} from './report.mjs';
const now=Date.parse('2026-11-14T00:00:00Z');
const report=()=>({version:1,checkedAt:new Date(now).toISOString(),checks:checks.map(([id,label])=>({id,label,ok:true}))});
test('fresh, failed, stale and unavailable results stay distinct',()=>{
  assert.equal(state(parseReport(report(),now)),'ok');
  const failed=report();failed.checks[0].ok=false;
  assert.equal(state(parseReport(failed,now)),'issue');
  assert.equal(state(parseReport(failed,now),['help','security','project-guard']),'ok');
  assert.equal(state(parseReport(report(),now+26*60000)),'unknown');
  assert.equal(state(null),'unknown');
});
test('malformed, duplicate and future evidence cannot become passing results',()=>{
  for(const bad of [null,{}, {...report(),checks:[]},{...report(),checkedAt:'invalid'},{...report(),checkedAt:new Date(now+120000).toISOString()},{...report(),checks:report().checks.map(c=>({...c,ok:'true'}))}]) assert.equal(parseReport(bad,now),null);
  const duplicate=report();duplicate.checks[0]=duplicate.checks[1];assert.equal(parseReport(duplicate,now),null);
  const untrusted=report();untrusted.checks[0].label='<script>fixture</script>';assert.equal(parseReport(untrusted,now).checks[0].label,'Public website');
});
test('history validates, deduplicates and sorts actual records',()=>{
  const older={...report(),checkedAt:new Date(now-60000).toISOString()};
  assert.deepEqual(parseHistory([older,report(),{},report()],now).map(r=>r.checkedAt),[report().checkedAt,older.checkedAt]);
  assert.deepEqual(parseHistory(null,now),[]);
});
