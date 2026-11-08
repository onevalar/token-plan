import {statisticsDesktop} from '../../tests/fixtures/statisticsDesktop';
import {textFor} from '../../src/copy';

/** One neutral fixture source for both real implementations. No service calls. */
export function scenario() {
 const query=new URLSearchParams(location.search),kind=query.get('scenario')??'complete';
 const language=query.get('language')??'en',theme=query.get('theme')??'light';
 const timestamp=Number(query.get('clock'))||Date.now(),NativeDate=Date;
 // Freeze the component's own date/range calculations as well as its records.
 // Both independently mounted implementations receive this same fixture clock.
 class FixtureDate extends NativeDate {
  constructor(...args:ConstructorParameters<typeof Date>){if(args.length)super(...args);else super(timestamp);}
  static now(){return timestamp;}
 }
 window.Date=FixtureDate as DateConstructor;
 const now=new Date(timestamp);
 const state=statisticsDesktop(now,(['complete','partial','unknown','zero'].includes(kind)?kind:'complete') as 'complete'|'partial'|'unknown'|'zero');
 if(kind==='empty')for(const account of state.accounts){account.history=[];account.metrics=[];account.observations=[];account.fetchedAt='';}
 document.documentElement.classList.toggle('dark',theme==='dark');
 document.documentElement.dataset.theme=theme;
 document.documentElement.lang=language;
 document.documentElement.style.colorScheme=theme;
 if(query.get('motion')==='reduce'){const style=document.createElement('style');style.textContent='*,*::before,*::after{animation-duration:0s!important;transition-duration:0s!important;scroll-behavior:auto!important}';document.head.append(style);}
 if(query.get('reset')==='yes')localStorage.clear();
 return {accounts:state.accounts,t:textFor(language),language,initialRange:query.get('range')??'30'};
}

export function bridge(side:'source'|'target') {
 const query=new URLSearchParams(location.search),run=query.get('run'),origin=new URL(document.referrer).origin;
 let sequence=0;
 const send=(kind:'ready'|'error'|'event',detail:string)=>parent.postMessage({protocol:'tokenplan-statistics-v1',run,side,sequence:++sequence,kind,detail},origin);
 window.addEventListener('error',event=>send('error',event.message));
 window.addEventListener('unhandledrejection',event=>send('error',String(event.reason)));
 for(const kind of ['click','input','change','keydown'])document.addEventListener(kind,event=>{
  const target=event.target;if(!(target instanceof Element))return;
  const name=target.getAttribute('aria-label')??target.textContent?.trim().slice(0,90)??target.tagName;
  const payload=event instanceof KeyboardEvent?event.key:target instanceof HTMLInputElement?target.value:'';
  requestAnimationFrame(()=>requestAnimationFrame(()=>send('event',`${kind}: ${name} ${payload}; focus: ${document.activeElement?.getAttribute('aria-label')??document.activeElement?.tagName}`)));
 },true);
 return ()=>send('ready',`${side==='source'?'React 19 / c588b28':'Svelte 5 runes'}: real HistoryPage mounted; synthetic local fixture`);
}
