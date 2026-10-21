import type {Page} from '@playwright/test';
import fixture from './fixtures/desktop.json' with {type:'json'};
export async function mockDesktop(page:Page,language='zh-Hans',cloud=false,data:unknown=fixture) {
 await page.addInitScript(({data,language,cloud})=>{
  const state:any=structuredClone(data);state.sync={available:cloud,enabled:false,syncing:false,error:"",devices:[]};state.settings.language=language;
  let sequence=0;const callbacks=new Map();
  Object.defineProperty(window,'__TAURI_EVENT_PLUGIN_INTERNALS__',{value:{unregisterListener:()=>{}}});
  Object.defineProperty(window,'__TAURI_INTERNALS__',{value:{
   transformCallback:(fn:unknown)=>{callbacks.set(++sequence,fn);return sequence;},
   unregisterCallback:(id:number)=>callbacks.delete(id),
   invoke:async(command:string,args:any)=>{
    if(command==='hide'){(window as any).__panelHides=((window as any).__panelHides??0)+1;return;}
    if(command==='shortcut_capture'){(window as any).__shortcutPaused=args.paused;return;}
    if(command==='plugin:app|version')return '0.0.0';
    if(command==='panel_frame')return (window as any).__panelFrame??{platform:'macos',rounded:true};
    if(command.startsWith('plugin:event|'))return ++sequence;
    if(command==='plugin:updater|check')return {rid:8,version:'9.9.9',currentVersion:'0.0.0',body:'Fixture update',rawJson:{}};
    if(command==='plugin:updater|download_and_install')throw 'fixture_signature_error';
    if(command==='plugin:resources|close')return;
    if(command!=='desktop_request')return;
    const r=args.request,a=state.accounts.find((a:any)=>a.id===r.accountId);
    if(r.method==='notificationPermission')return structuredClone(state);
    if(r.method==='enabled'&&a)a.enabled=r.value;
    if(r.method==='tray'&&a)a.tray=r.value;
    if(r.method==='note'&&a)a.note=r.value;
    if(r.method==='remove')state.accounts=state.accounts.filter((a:any)=>a.id!==r.accountId);
    if(r.method==='metric'&&a)Object.assign(a.metrics.find((m:any)=>m.id===r.metricId)!,r.value);
    if(r.method==='settings'){Object.assign(state.settings,r.value);if(r.value.iCloudEnabled!=null)state.sync.enabled=r.value.iCloudEnabled;}
    if(r.method==='move'&&a){const i=state.accounts.indexOf(a);[state.accounts[i],state.accounts[i+r.value]]=[state.accounts[i+r.value],a];}
    return structuredClone(state);
   }
  }});
 },{data,language,cloud});
}
