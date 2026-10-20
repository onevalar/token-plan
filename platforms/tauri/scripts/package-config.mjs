import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {packageWindows} from './window-config.mjs';
// Explicit release metadata only; never derive a shipping version from a preview build.
const version=process.env.TOKENPLAN_VERSION??'0.0.0';
const production=process.env.TOKENPLAN_PRODUCTION==='true';
if(!/^\d+\.\d+\.\d+$/.test(version))throw Error('Invalid version');
const config={version,bundle:{active:true,createUpdaterArtifacts:true}};
if(production){
 if(version==='0.0.0')throw Error('Production version missing');
 config.bundle.macOS={bundleVersion:String(Math.floor(Date.now()/1000))};
 if(process.platform==='darwin'){
  if(!process.env.TOKENPLAN_ICLOUD_ENTITLEMENTS||!process.env.TOKENPLAN_ICLOUD_PROFILE)throw Error('Production iCloud signing configuration missing');
  config.bundle.macOS.infoPlist='production-info.plist';
  config.bundle.macOS.entitlements=process.env.TOKENPLAN_ICLOUD_ENTITLEMENTS;
  execFileSync('python3',['../../script/stage_tauri_mac_helper.py'],{stdio:'inherit'});
  config.bundle.externalBin=[];
  config.bundle.macOS.files={'embedded.provisionprofile':process.env.TOKENPLAN_ICLOUD_PROFILE,'Helpers/TokenPlan Bridge.app':'binaries/TokenPlan Bridge.app'};
 }
 config.productName='TokenPlan';config.identifier='com.onevalar.tokenplan';
 config.app={windows:packageWindows('TokenPlan')};
}
writeFileSync('src-tauri/tauri.package.json',JSON.stringify(config,null,2)+'\n');
