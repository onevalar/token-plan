import {writeFileSync} from 'node:fs';
// Explicit release metadata only; never derive a shipping version from a preview build.
const version=process.env.TOKENPLAN_VERSION??'0.0.0';
const production=process.env.TOKENPLAN_PRODUCTION==='true';
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid version');
const config={version,bundle:{active:true,createUpdaterArtifacts:true}};
if(production){
 if(version==='0.0.0')throw Error('Production version missing');
 config.bundle.macOS={bundleVersion:String(Math.floor(Date.now()/1000))};
 config.productName='TokenPlan';config.identifier='com.onevalar.tokenplan';
 config.app={windows:[{label:'main',title:'TokenPlan',width:480,height:680,minWidth:390,minHeight:400}]};
}
writeFileSync('src-tauri/tauri.package.json',JSON.stringify(config,null,2)+'\n');
