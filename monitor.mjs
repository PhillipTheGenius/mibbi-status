import fs from 'node:fs/promises';
import { collectReport } from './status-worker.mjs';
export { targets, probe } from './status-worker.mjs';
export async function run(){
 const report=await collectReport();
 let history=[];try{history=JSON.parse(await fs.readFile('history.json','utf8'));}catch{}
 history=Array.isArray(history)?history.filter(r=>r&&r.version===1).slice(-143):[];
 await fs.writeFile('status.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile('history.json',JSON.stringify([...history,report],null,2)+'\n');
 console.log(JSON.stringify(report));if(report.checks.some(r=>!r.ok))process.exitCode=1;
 return report;
}
if(process.argv[1]&&new URL(import.meta.url).pathname.replace(/^\//,'').toLowerCase().endsWith(process.argv[1].replaceAll('\\','/').replace(/^\//,'').toLowerCase()))await run();
