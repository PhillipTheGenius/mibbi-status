import fs from 'node:fs/promises';
export const targets=[
 {id:'website',label:'Public website',path:'/',expected:200},
 {id:'signin',label:'Sign-in page',path:'/login',expected:200},
 {id:'help',label:'Help centre',path:'/help',expected:200},
 {id:'security',label:'Security information',path:'/security',expected:200},
 {id:'project-guard',label:'Signed-out project access check',path:'/api/builder/projects',expected:401}
];
export async function probe(target,fetcher=fetch){
 const start=Date.now();let httpStatus=null;
 try{const response=await fetcher('https://mibbi.ai'+target.path,{redirect:'error',signal:AbortSignal.timeout(15000),headers:{'User-Agent':'Mibbi-Public-Status/1.0'}});httpStatus=response.status;await response.body?.cancel();return {id:target.id,label:target.label,ok:httpStatus===target.expected,httpStatus,durationMs:Date.now()-start};}
 catch{return {id:target.id,label:target.label,ok:false,httpStatus,durationMs:Date.now()-start};}
}
export async function run(){
 const results=await Promise.all(targets.map(async target=>{let result=await probe(target);if(!result.ok){await new Promise(r=>setTimeout(r,1500));result=await probe(target);}return result;}));
 const report={version:1,checkedAt:new Date().toISOString(),checks:results};
 let history=[];try{history=JSON.parse(await fs.readFile('history.json','utf8'));}catch{}
 history=Array.isArray(history)?history.filter(r=>r&&r.version===1).slice(-143):[];
 await fs.writeFile('status.json',JSON.stringify(report,null,2)+'\n');await fs.writeFile('history.json',JSON.stringify([...history,report],null,2)+'\n');
 console.log(JSON.stringify(report));if(results.some(r=>!r.ok))process.exitCode=1;
 return report;
}
if(process.argv[1]&&new URL(import.meta.url).pathname.replace(/^\//,'').toLowerCase().endsWith(process.argv[1].replaceAll('\\','/').replace(/^\//,'').toLowerCase()))await run();
