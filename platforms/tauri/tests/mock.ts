import type {Page} from '@playwright/test';
import fixture from './fixtures/desktop.json' with {type:'json'};
export async function mockDesktop(page:Page,language='zh-Hans',cloud=false,data:unknown=fixture) {
 await page.addInitScript(({data,language,cloud})=>{
  // One-time tips are off unless a test opts in with window.__tips, so the other tests keep a stable Home.
  if(!(window as any).__tips){try{localStorage.setItem('tokenplan.tip.welcome','1');localStorage.setItem('tokenplan.tip.alerts','1');}catch{/* storage unavailable */}}
  const state:any=structuredClone(data);state.sync={available:cloud,enabled:false,syncing:false,error:"",devices:[]};state.settings.language=language;
  (window as any).__fetchTick=0;let sequence=0;const callbacks=new Map();const events=new Map<string,Set<number>>();
  (window as any).__emitTauriEvent=(event:string,payload:unknown)=>events.get(event)?.forEach(id=>callbacks.get(id)?.({event,id,payload}));
  Object.defineProperty(window,'__TAURI_EVENT_PLUGIN_INTERNALS__',{value:{unregisterListener:()=>{}}});
  Object.defineProperty(window,'__TAURI_INTERNALS__',{value:{
   transformCallback:(fn:unknown)=>{callbacks.set(++sequence,fn);return sequence;},
   unregisterCallback:(id:number)=>callbacks.delete(id),
   invoke:async(command:string,args:any)=>{
    if(command==='panel_content_height'){((window as any).__panelHeights??=[]).push(args.height);return;}
    if(command==='account_login'){((window as any).__loginProviders??=[]).push(args.provider);return {command:'env CLAUDE_CONFIG_DIR=/isolated claude auth login',directory:'/isolated',opened:true};}
    if(command==='account_directory'){((window as any).__directories??=[]).push(args);if(args.directory==='invalid')throw 'invalid_directory';return;}
    if(command==='open_link'){((window as any).__openedLinks??=[]).push(args.url);return;}
    if(command==='hide'){(window as any).__panelHides=((window as any).__panelHides??0)+1;return;}
    if(command==='shortcut_capture'){(window as any).__shortcutPaused=args.paused;return;}
    if(command==='plugin:app|version')return '0.0.0';
    if(command==='panel_frame')return (window as any).__panelFrame??{platform:'macos',rounded:true};
    if(command==='plugin:event|listen'){if(!events.has(args.event))events.set(args.event,new Set());events.get(args.event)!.add(args.handler);return args.handler;}
    if(command==='plugin:event|unlisten'){events.get(args.event)?.delete(args.eventId);return;}
    if(command.startsWith('plugin:event|'))return ++sequence;
    if(command==='plugin:updater|check')return {rid:8,version:'9.9.9',currentVersion:'0.0.0',body:'Fixture update',rawJson:{}};
    if(command==='plugin:updater|download_and_install')throw 'fixture_signature_error';
    if(command==='plugin:resources|close')return;
    if(command!=='desktop_request')return;
    ((window as any).__requests??=[]).push(structuredClone(args.request));
    if(args.request.method==='refresh'){
     await (window as any).__beforeRefresh?.(state,args.request);
     // A real helper fetches on every refresh, so each target account's fetch time advances; __skipFetch simulates a helper that silently skipped.
     if(!(window as any).__skipFetch)for(const a of state.accounts)if(a.enabled&&(!args.request.accountId||a.id===args.request.accountId))a.fetchedAt=new Date(Date.now()+(++(window as any).__fetchTick)*1000).toISOString();
    }
    if((window as any).__failNextRequest){(window as any).__failNextRequest=false;throw 'request_failed';}
    const r=args.request,a=state.accounts.find((a:any)=>a.id===r.accountId);
    if(r.method==='notificationPermission')return structuredClone(state);
    if(r.method==='enabled'&&a){a.added=a.added||a.enabled||r.value;a.enabled=r.value;}
    if(r.method==='tray'&&a)a.tray=r.value;
    if(r.method==='note'&&a)a.note=r.value;
    if(r.method==='remove')state.accounts=state.accounts.filter((a:any)=>a.id!==r.accountId);
    if(r.method==='metric'&&a)Object.assign(a.metrics.find((m:any)=>m.id===r.metricId)!,r.value);
    if(r.method==='settings'){
     // Helpers return percentages in the selected display mode, not always used percentages.
     if(typeof r.value.showRemaining==='boolean'&&r.value.showRemaining!==Boolean(state.settings.showRemaining)){
      for(const account of state.accounts)for(const metric of account.metrics)if(metric.percent!=null)metric.percent=100-metric.percent;
     }
     Object.assign(state.settings,r.value);
    }
    if(r.method==='move'&&a){const i=state.accounts.indexOf(a);[state.accounts[i],state.accounts[i+r.value]]=[state.accounts[i+r.value],a];}
    return structuredClone(state);
   }
  }});
 },{data,language,cloud});
}
