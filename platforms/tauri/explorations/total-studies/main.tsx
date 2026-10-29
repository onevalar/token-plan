import {createRoot} from 'react-dom/client';
import {useCallback,useEffect,useMemo,useRef,useState,type CSSProperties} from 'react';
import {MotionConfig} from 'motion/react';
import {ArrowLeft,ArrowRight,FlaskConical,Layers3,RotateCcw} from 'lucide-react';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '../../src/components/arc/foundation.css';
import '../../src/style.css';
import '../../src/preview/preview.css';
import {Button} from '../../src/components/arc/button/button';
import {Select} from '../../src/components/arc/select/select';
import {HistorySummary} from '../../src/preview/HistoryPage';
import {providerTheme} from '../../src/providerTheme';
import {copy} from '../../src/copy';
import {dateKey} from '../../src/historyModel';
import SegmentedControl from './arc/segmented-control/segmented-control';
import {allStudies,families} from './catalog';
import {makeAccounts,buildView,providers,scenarios,exact,money,type Measure,type Range,type StudyProps} from './data';
import {Coverage,ExactRecords,SourceDetail} from './Shared';
import {OverviewStudies} from './OverviewStudies';
import {CompositionStudies} from './CompositionStudies';
import {TimeStudies} from './TimeStudies';
import {CompareStudies} from './CompareStudies';
import {BudgetStudies} from './BudgetStudies';
import {Variants,LabTools,Catalog} from './LabTools';
import {Picker} from './Picker';
import './studies.css';
import './lab.css';

const query=new URLSearchParams(location.search);
const choice=(key:string,max:number)=>{
 const value=Number(query.get(key));return Number.isInteger(value)&&value>=1&&value<=max?value-1:0;
};
const inOptions=(key:string,options:string[],fallback:string)=>options.includes(query.get(key)??'')?query.get(key)!:fallback;
const ranges=[{value:'1',label:'今天'},{value:'yesterday',label:'昨天'},{value:'7',label:'近 7 天'},{value:'30',label:'近 30 天'}];

function App() {
 const [family,setFamily]=useState(choice('v',5)),[variant,setVariant]=useState(choice('s',3)),[baseline,setBaseline]=useState(query.get('baseline')==='1');
 const [scenario,setScenario]=useState(inOptions('scenario',scenarios.map(s=>s.value),'normal'));
 const [width,setWidth]=useState(inOptions('width',['390','560','760'],'390')),[dark,setDark]=useState(query.get('theme')!=='light');
 const [range,setRange]=useState<Range>(inOptions('range',ranges.map(r=>r.value),'30') as Range),[measure,setMeasure]=useState<Measure>(query.get('measure')==='cost'?'cost':'tokens');
 const [scope,setScope]=useState('all'),[selected,setSelected]=useState<string|null>(null),[day,setDay]=useState<string|null>(null),[budget,setBudget]=useState(200);
 const [localDay,setLocalDay]=useState(()=>dateKey(new Date())),[seen,setSeen]=useState<string[]>([]),[actualWidth,setActualWidth]=useState(Number(width));
 const stage=useRef<HTMLElement>(null),scroll=useRef<HTMLDivElement>(null),parameters=useRef({padding:24,radius:22});
 const detailTrigger=useRef<HTMLElement|SVGElement|null>(null);
 const now=useMemo(()=>new Date(`${localDay}T12:00:00`),[localDay]);
 const accounts=useMemo(()=>makeAccounts(scenario,now),[scenario,now]);
 const view=useMemo(()=>buildView(accounts,range,scope,now),[accounts,range,scope,now]);
 const effectiveMeasure=family===4?'cost':measure;
 const study=families[family].variants[variant],index=family*3+variant;
 const select=useCallback((f:number,v=0)=>{setFamily(f);setVariant(v);setBaseline(false);setSelected(null);setDay(null);},[]);
 const changeRange=(value:string)=>{setRange(value as Range);setDay(null);setSelected(null);};
 const changeScenario=(value:string)=>{setScenario(value);setScope('all');setSelected(null);setDay(null);};
 const loadExample=()=>{changeScenario('normal');requestAnimationFrame(()=>scroll.current?.focus());};
 const selectSource=(value:string|null)=>{
  if(value)detailTrigger.current=document.activeElement as HTMLElement|SVGElement;
  setSelected(value);
 };
 const closeSource=()=>{setSelected(null);requestAnimationFrame(()=>detailTrigger.current?.isConnected&&detailTrigger.current.focus());};
 useEffect(()=>{
  const url=new URL(location.href);url.searchParams.set('v',String(family+1));url.searchParams.set('s',String(variant+1));
  if(baseline)url.searchParams.set('baseline','1');else url.searchParams.delete('baseline');
  for(const [key,value] of Object.entries({scenario,width,theme:dark?'dark':'light',range,measure}))url.searchParams.set(key,value);
  history.replaceState(null,'',url);
 },[family,variant,baseline,scenario,width,dark,range,measure]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 useEffect(()=>{if(!baseline)setSeen(previous=>previous.includes(study.id)?previous:[...previous,study.id]);},[study.id,baseline]);
 useEffect(()=>{scroll.current?.scrollTo({top:0});},[study.id,baseline]);
 useEffect(()=>{
  if(!selected)return;
  const detail=scroll.current?.querySelector<HTMLElement>('.tp-source-detail');
  detail?.scrollIntoView({block:'nearest'});detail?.focus({preventScroll:true});
 },[selected]);
 useEffect(()=>{
  const timer=window.setInterval(()=>setLocalDay(dateKey(new Date())),30000);return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{
  const node=stage.current?.querySelector('.tp-window');if(!node)return;
  const observer=new ResizeObserver(entries=>setActualWidth(Math.round(entries[0].borderBoxSize[0].inlineSize)));observer.observe(node);return()=>observer.disconnect();
 },[]);
 const colors=Object.fromEntries(providers.map(p=>[`--tp-${p.key}`,(providerTheme(p.key) as Record<string,string>)[dark?'--provider-dark':'--provider-light']])) as CSSProperties;
 const props:StudyProps={view,variant,measure:effectiveMeasure,selected,onSelect:selectSource,day,onDay:setDay,budget,onBudget:setBudget};
 const content=family===0?<OverviewStudies {...props}/>:family===1?<CompositionStudies {...props}/>:family===2?<TimeStudies {...props}/>:family===3?<CompareStudies {...props}/>:<BudgetStudies {...props}/>;
 const pending=scenario==='loading',failed=scenario==='error',empty=view.total.records===0;
 const previous=()=>{const next=(index+14)%15;select(Math.floor(next/3),next%3);};
 const next=()=>{const next=(index+1)%15;select(Math.floor(next/3),next%3);};
 return <MotionConfig reducedMotion="user"><a className="ts-skip" href="#study-stage">跳到交互方案</a><main className="ts-lab">
  <header className="ts-header">
   <div className="ts-brand"><img src="/capsule.png" alt=""/><span>TokenPlan <span>设计实验室</span></span></div>
   <span className="ts-isolated"><FlaskConical size={14}/>独立原型 · 尚未选定</span>
  </header>
  <div className="ts-intro"><div><h1>总量统计，15 种读法</h1><p>从你的 9 张参考图出发。比较结构，也比较真实操作后的感受。</p></div><Button variant="secondary" size="sm" aria-pressed={baseline} onClick={()=>{setBaseline(!baseline);if(!baseline&&range==='7')setRange('30');}}><Layers3 size={15}/>{baseline?'返回探索方案':'对照现有界面'}</Button></div>
  <div className="ts-workbench" data-wide={width==='760'}>
   <aside className="ts-directions" aria-label="方案说明"><div className="ts-family-heading"><span>路线 {family+1} / 5</span><span>{families[family].name}</span></div>
    <h2>{families[family].title}</h2><p>{families[family].description}</p>
    <Variants family={family} variant={variant} onChange={select} baseline={baseline}/>
    <div className="ts-reading"><h3>怎么试</h3><p>{baseline?'这是当前应用的 HistorySummary 原样显示；它只支持今天、昨天和近 30 天。':study.try}</p><h3>需要取舍</h3><p>{baseline?'保留现有版本的全部表现，不把探索中的改进混入基线。':study.tradeoff}</p><h3>从参考图借了什么</h3><p>{study.reference}</p></div>
    <div className="ts-progress"><span>本次已打开 {seen.length} / 15</span><div aria-hidden="true">{allStudies.map(s=><i key={s.id} data-seen={seen.includes(s.id)}/>)}</div></div>
   </aside>
   <figure id="study-stage" ref={stage} className="ts-stage" style={{'--stage-width':`${width}px`,...colors} as CSSProperties}>
    <figcaption><span><b>{baseline?'基线':study.id}</b> {baseline?'现有汇总':study.name}</span><small>实宽 {actualWidth}px · 原尺寸</small></figcaption>
    <div className="tp-window" data-study={baseline?'baseline':study.id} data-scenario={scenario} data-measure={effectiveMeasure}>
     <header className="tp-window-header"><span><img src="/capsule.png" alt=""/>用量统计</span><span className="tp-sample-tag">模拟数据</span></header>
     <div ref={scroll} className="tp-scroll" tabIndex={0} role="region" aria-label="方案内容，可滚动">
      <div className="tp-study" aria-busy={pending}>
       {!baseline&&<div className="tp-filters"><div className="tp-filter-row">
        {family===4?<span className="tp-cost-only">费用 · USD</span>:<SegmentedControl label="统计指标" options={[{value:'tokens',label:'Tokens'},{value:'cost',label:'费用'}]} value={measure} onValueChange={value=>setMeasure(value as Measure)}/>}
        <div className="tp-filter-range"><Select label="时间范围" value={range} options={ranges} onValueChange={changeRange}/></div>
       </div><div className="tp-filter-scope"><Select label="记录来源" value={scope} onValueChange={value=>{setScope(value);setSelected(null);setDay(null);}} options={[{value:'all',label:`全部服务 · ${accounts.length} 个账号`},...providers.filter(p=>accounts.some(a=>a.family===p.key)).map(p=>({value:p.key,label:p.name}))]}/></div>
       <div className="tp-period"><span>{view.bounds.start}</span><span>至</span><span>{view.bounds.end}</span></div></div>}
       {pending||failed?<div className="tp-state">
        {pending?<><div className="tp-skeleton" aria-hidden="true"><i/><i/><i/><div>{[1,2,3,4,5].map(i=><b key={i}/>)}</div></div><h3 role="status">正在模拟读取历史</h3><p>读取完成前不展示总量，也不把等待当作零。</p></>:<><div className="tp-state-mark" aria-hidden="true">!</div><h3 role="alert">未能读取示例记录</h3><p>这是失败状态演示，不是你的账号出了问题。重新载入即可继续比较。</p></>}
        <Button variant="secondary" onClick={loadExample}><RotateCcw size={14}/>{pending?'完成模拟读取':'重新载入示例'}</Button>
       </div>:baseline?<div className="tp-baseline mac-preview"><HistorySummary accounts={scope==='all'?accounts:accounts.filter(a=>a.family===scope)} t={copy['zh-Hans']} language="zh-Hans" range={range==='7'?'30':range} onRange={changeRange}/></div>:empty?<div className="tp-state"><div className="tp-state-mark" aria-hidden="true">—</div><h3>还没有可汇总的记录</h3><p>没有记录不等于零用量。载入一份虚构示例，继续体验当前方案。</p><Button variant="secondary" onClick={loadExample}>载入示例</Button></div>:<>
        <div key={study.id} className="tp-design">{content}</div>
        <SourceDetail view={view} selected={selected} measure={effectiveMeasure} onClose={closeSource}/>
        <Coverage view={view}/><ExactRecords view={view}/>
        <details className="tp-account-records"><summary>记录来自 {view.sourceCount} 个独立来源 <span>{view.accountCount} 个账号</span></summary>
         <div className="tp-account-list">{accounts.filter(a=>scope==='all'||a.family===scope).map(account=><div key={account.id}><span>{account.name}<small>{account.email}</small></span><span>{account.historyScope==='device'?'共享设备记录':'账号记录'}</span></div>)}</div>
         <p className="tp-caption">共享设备记录按服务去重，不随账号数量重复累加。</p>
        </details>
       </>}
      </div>
     </div>
     <footer className="tp-window-foot">面板内可滚动 · 本地记录，不代表完整账单</footer>
    </div>
    <div className="ts-stage-nav"><Button size="sm" variant="ghost" aria-label="上一个方案" onClick={previous}><ArrowLeft size={15}/></Button><span>{baseline?'当前正式实现':`${index+1} / 15 · ${study.focus}`}</span><Button size="sm" variant="ghost" aria-label="下一个方案" onClick={next}><ArrowRight size={15}/></Button></div>
    <p className="ts-stage-foot">{actualWidth<Number(width)?`可用空间不足 ${width}px，已按实际容器收窄。`:width==='390'?'紧凑面板：优先检验每日使用的真实尺寸。':'宽面板仅供探索，不意味着正式窗口将被加宽。'}</p>
   </figure>
   <LabTools id={study.id} scenario={scenario} onScenario={changeScenario} width={width} onWidth={setWidth} dark={dark} onDark={setDark} stage={stage} parameters={parameters} onChoose={select} context={()=>`外观：${dark?'深色':'浅色'}；面板 ${actualWidth}px；场景 ${scenarios.find(s=>s.value===scenario)?.label}；范围 ${range}；来源 ${scope==='all'?'全部服务':providers.find(p=>p.key===scope)?.name}；指标 ${effectiveMeasure}；已记录 Tokens ${exact(view.total.tokens)}；已知费用 ${money(view.total.cost)}；预算参考 ${money(budget)}`}/>
  </div>
  <Catalog onChoose={select}/>
  <footer className="ts-footer"><p>底部切换五条路线，左侧选择三种结构。也可按 1–5、← → 切换路线。</p><p>示例日期以本地 {localDay} 为今天。数据虚构，选择只留在此实验室；真实应用、账号和设置不受影响。</p><p>沿用 TokenPlan 字体与服务颜色，使用 Arc 控件、仪表、百格图及滑动标尺。所有方向保留精确读数与缺失说明。</p></footer>
 </main><Picker current={family} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
