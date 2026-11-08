import {mockDesktop} from '../tests/mock';
import {largeDesktop} from '../tests/fixtures/largeDesktop';
import type {Page} from '@playwright/test';

// Development comparison only. Both real applications receive the same native
// boundary fixture; neither component implementation is mocked or replaced.
const parameters=new URLSearchParams(location.search);
const now=new Date('2026-11-07T04:00:00Z'),data=largeDesktop(now);
data.settings.autoRefresh=false;data.settings.autoUpdates=false;
data.settings.appearance=parameters.get('theme')==='dark'?'dark':'light';
const scenario=parameters.get('scenario')??'normal',side=parameters.get('side')??'',run=parameters.get('run')??'';
if(scenario==='empty')data.accounts=[];
if(scenario==='error')data.accounts[0].error='Authentication expired. Sign in again.';
if(scenario==='boundary'){
 const account=data.accounts[0];
 account.metrics[0].percent=.4;account.metrics[1].percent=112;
 data.accounts[1].metrics[0].hasData=false;
}
localStorage.setItem('tokenplan.homeUsageStyle',parameters.get('style')??'bars');
localStorage.removeItem('tokenplan.homeUsagePreferences');
const host=window as typeof window&{__panelFrame:unknown;__requests?:{method:string;value?:unknown}[]};
host.__panelFrame={platform:'macos',rounded:true,reduceTransparency:false};
// Keep reset times/calendar fixtures comparable without freezing animations.
const NativeDate=Date;
class ComparisonDate extends NativeDate {
 constructor(...args:ConstructorParameters<typeof Date>){if(args.length)super(...args);else super(now.getTime());}
 static now(){return now.getTime();}
}
window.Date=ComparisonDate as DateConstructor;
const adapter={addInitScript:async(fn:(arg:unknown)=>void,arg:unknown)=>fn(arg)} as unknown as Page;
await mockDesktop(adapter,parameters.get('language')??'zh-Hans',false,data);
const parentOrigin='http://127.0.0.1:1453';
const report=(type:string,payload:unknown)=>{if(parent!==window)parent.postMessage({protocol:1,side,run,type,payload},parentOrigin);};
window.addEventListener('error',event=>report('error',event.message));
window.addEventListener('unhandledrejection',event=>report('error',String(event.reason)));
let ready=false,seen=0;
const observer=new MutationObserver(()=>{
 if(!ready&&document.querySelector('.dashboard,.empty-state')){
  ready=true;observer.disconnect();report('ready',{title:document.querySelector('h1')?.textContent});
 }
});
observer.observe(document.documentElement,{subtree:true,childList:true});
const timer=setInterval(()=>{
 const requests=host.__requests??[];
 for(const request of requests.slice(seen))report('event',request.method==='key'?{...request,value:'[redacted]'}:request);
 seen=requests.length;
},100);
window.addEventListener('pagehide',()=>{clearInterval(timer);observer.disconnect();},{once:true});
