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
import {Button} from '../../src/components/arc/button/button';
import {Select} from '../../src/components/arc/select/select';
import {HomeMetrics} from '../../src/HomeMetrics';
import {ProviderLogo} from '../../src/Dashboard';
import {providerTheme} from '../../src/providerTheme';
import {isQuotaMetric} from '../../src/Metrics';
import SegmentedControl from './arc/segmented-control/segmented-control';
import {allStudies,families} from './catalog';
import {initialSimulation,makeAccounts,now,scenarios,type Scenario,type StudyProps,type Variant} from './data';
import {InstrumentStudies} from './InstrumentStudies';
import {CellStudies} from './CellStudies';
import {CycleStudies} from './CycleStudies';
import {RailStudies} from './RailStudies';
import {EditorialStudies} from './EditorialStudies';
import {MetricDetail} from './MetricDetail';
import {Catalog,LabTools,Variants,initialParameters} from './LabTools';
import {Picker} from './Picker';
import './studies.css';
import './lab.css';

// This is a client-only, isolated Vite entry. No production entry imports it.
const query=new URLSearchParams(location.search);
const choice=(key:string,max:number)=>{const n=Number(query.get(key));return Number.isInteger(n)&&n>=1&&n<=max?n-1:0;};
const option=(key:string,options:readonly string[],fallback:string)=>options.includes(query.get(key)??'')?query.get(key)!:fallback;
const baselineStyles=[{value:'bars',label:'现有 · 横条'},{value:'gauges',label:'现有 · 半环仪表'},{value:'ticks',label:'现有 · 刻度环'},{value:'cells',label:'现有 · 方格'},{value:'ruler',label:'现有 · 配额标尺'},{value:'vessel',label:'现有 · 电池'},{value:'numbers',label:'现有 · 数字'}];
const components=[InstrumentStudies,CellStudies,CycleStudies,RailStudies,EditorialStudies];

function App() {
 const [family,setFamily]=useState(choice('v',5)),[variant,setVariant]=useState(choice('s',3)),[baseline,setBaseline]=useState(query.get('baseline')==='1');
 const [baselineStyle,setBaselineStyle]=useState(option('current',baselineStyles.map(s=>s.value),'bars'));
 const [scenario,setScenario]=useState<Scenario>(option('scenario',scenarios.map(s=>s.value),'normal') as Scenario);
 const [width,setWidth]=useState(option('width',['390','460','560'],'390')),[dark,setDark]=useState(query.get('theme')!=='light');
 const [remaining,setRemaining]=useState(query.get('mode')==='remaining'),[monochrome,setMonochrome]=useState(query.get('ink')==='mono');
 const [simulation,setSimulation]=useState(initialSimulation),[seen,setSeen]=useState<string[]>([]),[actualWidth,setActualWidth]=useState(Number(width));
 const [selected,setSelected]=useState<{account:string;metric:string}|null>(null);
 const stage=useRef<HTMLDivElement>(null),scroll=useRef<HTMLDivElement>(null),parameters=useRef({...initialParameters});
 const trigger=useRef<HTMLElement|null>(null);
 const study=families[family].variants[variant],index=family*3+variant,Design=components[family];
 const accounts=useMemo(()=>makeAccounts(scenario,remaining,simulation),[scenario,remaining,simulation]);
 const quotaCount=accounts.flatMap(a=>a.metrics).filter(isQuotaMetric).length;
 const choose=useCallback((f:number,v=0)=>{setFamily(f);setVariant(v);setBaseline(false);setSelected(null);},[]);
 const changeScenario=(value:Scenario)=>{setScenario(value);setSelected(null);};
 const closeDetail=()=>{setSelected(null);requestAnimationFrame(()=>{
  if(trigger.current?.isConnected){trigger.current.focus({preventScroll:true});trigger.current.scrollIntoView({block:'nearest',inline:'nearest'});}
 });};
 const selectMetric=(account:string,metric:string)=>{
  if(selected?.account===account&&selected.metric===metric){closeDetail();return;}
  trigger.current=document.activeElement as HTMLElement;setSelected({account,metric});
 };
 const loadExample=()=>{changeScenario('normal');requestAnimationFrame(()=>scroll.current?.focus());};
 useEffect(()=>{
  const url=new URL(location.href);
  for(const [key,value] of Object.entries({v:String(family+1),s:String(variant+1),scenario,width,theme:dark?'dark':'light',mode:remaining?'remaining':'used',ink:monochrome?'mono':'provider',current:baselineStyle}))url.searchParams.set(key,value);
  if(baseline)url.searchParams.set('baseline','1');else url.searchParams.delete('baseline');
  history.replaceState(null,'',url);
 },[family,variant,baseline,scenario,width,dark,remaining,monochrome,baselineStyle]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 useEffect(()=>{if(!baseline)setSeen(previous=>previous.includes(study.id)?previous:[...previous,study.id]);},[study.id,baseline]);
 useEffect(()=>{scroll.current?.scrollTo({top:0});},[study.id,baseline,scenario]);
 useEffect(()=>{
  if(!selected)return;
  const detail=scroll.current?.querySelector<HTMLElement>('.hu-metric-detail');
  detail?.scrollIntoView({block:'nearest'});detail?.focus({preventScroll:true});
 },[selected]);
 useEffect(()=>{
  const node=stage.current;if(!node)return;
  const observer=new ResizeObserver(entries=>setActualWidth(Math.round(entries[0].borderBoxSize[0].inlineSize)));
  observer.observe(node);return()=>observer.disconnect();
 },[]);
 const pending=scenario==='loading',failed=scenario==='error',empty=scenario==='empty';
 const move=(delta:number)=>{const next=(index+delta+15)%15;choose(Math.floor(next/3),next%3);};
 return <MotionConfig reducedMotion="user"><a className="hu-skip" href="#home-study-stage">跳到用量预览</a><main className="hu-lab">
  <header className="hu-lab-header"><div className="hu-brand"><img src="/capsule.png" alt=""/><span>TokenPlan <small>设计实验室</small></span></div>
   <a href="../total-studies/">查看保留的总量统计方案 <ArrowRight size={14}/></a>
  </header>
  <div className="hu-intro"><div><h1>主页用量，换一种读法</h1><p>15 个新样式，5 个方向。探索每个账号的额度、余量与重置，不是历史总量。</p></div>
   <Button variant="secondary" size="sm" aria-pressed={baseline} onClick={()=>{setBaseline(!baseline);setSelected(null);}}><Layers3 size={15}/>{baseline?'返回新样式':'对照现有样式'}</Button>
  </div>
  <div className="hu-workbench">
   <aside className="hu-directions" aria-label="设计方向与取舍">
    <h2>{families[family].title}</h2><p>{families[family].description}</p>
    <Variants family={family} variant={variant} baseline={baseline} onChoose={choose}/>
    <div className="hu-reading"><h3>{baseline?'现有实现原样呈现':'怎么试'}</h3><p>{baseline?'直接使用当前 HomeMetrics 的真实组件，不把新设计的数字格式或交互偷偷加进对照。':study.try}</p>
     <h3>需要取舍</h3><p>{baseline?'可以切换七种现有样式。注意比较的是用量组件，而不是整个原生窗口。':study.tradeoff}</p>
     <h3>从参考图借了什么</h3><p>{study.reference}</p>
    </div>
    <div className="hu-progress"><span>本次已打开 {seen.length} / 15</span><div aria-hidden="true">{allStudies.map(s=><i key={s.id} data-seen={seen.includes(s.id)}/>)}</div></div>
   </aside>
   <figure id="home-study-stage" className="hu-stage" style={{'--stage-width':`${width}px`} as CSSProperties} tabIndex={-1}>
    <figcaption><span><b>{baseline?'对照':study.id}</b> {baseline?'现有主页样式':study.name}</span><small>实宽 {actualWidth}px</small></figcaption>
    <div ref={stage} className="hu-window" data-study={baseline?'baseline':study.id} data-scenario={scenario} data-remaining={remaining} data-monochrome={!baseline&&monochrome}>
     <header className="hu-window-header"><span><img src="/capsule.png" alt=""/>主页用量</span><span className="hu-sample"><FlaskConical size={13}/>模拟数据</span></header>
     <div className="hu-mode"><SegmentedControl label="额度显示方式" value={remaining?'remaining':'used'} options={[{value:'used',label:'已用额度'},{value:'remaining',label:'剩余额度'}]} onValueChange={v=>setRemaining(v==='remaining')}/><small>{accounts.length} 个账号</small></div>
     {baseline&&<div className="hu-baseline-controls"><Select label="现有用量样式" value={baselineStyle} options={baselineStyles} onValueChange={setBaselineStyle}/></div>}
     <div ref={scroll} className="hu-scroll" tabIndex={0} role="region" aria-label="主页用量，可滚动" aria-busy={pending}>
      {pending||failed||empty?<div className="hu-state">
       {pending?<><div className="hu-skeleton" aria-hidden="true"><i/><i/><div><b/><b/></div><i/><i/></div><h3 role="status">正在模拟读取额度</h3><p>等待不等于零；取得读数后才展示额度。</p></>:failed?<><span className="hu-state-symbol" aria-hidden="true">!</span><h3 role="alert">未能读取示例额度</h3><p>这是错误状态演示，不是你的账号故障。</p></>:<><span className="hu-state-symbol" aria-hidden="true">○</span><h3>还没有账号</h3><p>没有账号不等于额度为零，可以载入示例继续体验。</p></>}
       <Button variant="secondary" onClick={loadExample}><RotateCcw size={14}/>{pending?'完成模拟读取':failed?'重新载入示例':'载入示例账号'}</Button>
      </div>:<div className="hu-accounts" key={`${baseline?'baseline':study.id}`}>
       {accounts.map(account=>{
        const selection=selected?.account===account.id?selected.metric:null;
        const metric=account.metrics.find(m=>m.id===selection);
        const props:StudyProps={metrics:account.metrics,variant:variant as Variant,remaining,now,missing:'暂无读数',selected:selection,onSelect:id=>selectMetric(account.id,id)};
        return <section key={account.id} className="hu-account" data-account={account.id} data-provider={account.family} style={providerTheme(account.family)} aria-label={`${account.name} ${account.email}`}>
         <header className="hu-identity"><ProviderLogo family={account.family}/><div><div><h3>{account.name}</h3><span>{account.plan}</span></div>{account.email&&<p>{account.email}</p>}</div></header>
         {account.warning&&<p className="hu-account-warning">{account.warning}</p>}
         {baseline?<div className="hu-baseline"><HomeMetrics metrics={account.metrics} style={baselineStyle} remaining={remaining} now={now} language="zh-Hans" missing="暂无读数"/></div>:<Design {...props}/>}
         {!baseline&&metric&&<MetricDetail metric={metric} remaining={remaining} now={now} missing="暂无读数" onClose={closeDetail}/>}
        </section>;
       })}
       <p className="hu-reading-rules">{quotaCount} 项额度各自独立，不相加、不平均。余额按金额显示，不虚构百分比。</p>
      </div>}
     </div>
     <footer className="hu-window-foot">固定示例 · 2026-10-28 08:00 UTC</footer>
    </div>
    <div className="hu-stage-nav"><Button variant="ghost" size="sm" aria-label="上一个用量样式" onClick={()=>move(-1)}><ArrowLeft size={16}/></Button><span>{baseline?'当前正式组件':`${index+1} / 15 · ${study.focus}`}</span><Button variant="ghost" size="sm" aria-label="下一个用量样式" onClick={()=>move(1)}><ArrowRight size={16}/></Button></div>
    <p className="hu-stage-foot">{actualWidth<Number(width)?`当前空间不足 ${width}px，按 ${actualWidth}px 实际宽度展示。`:'原尺寸展示，面板内可滚动；点击额度名称查看准确读数。'}</p>
   </figure>
   <LabTools id={study.id} scenario={scenario} onScenario={changeScenario} width={width} onWidth={setWidth} dark={dark} onDark={setDark} monochrome={monochrome} onMonochrome={setMonochrome} simulation={simulation} onSimulation={setSimulation} baseline={baseline} stage={stage} parameters={parameters} onChoose={choose}
    context={()=>`外观：${dark?'深色':'浅色'}；实宽 ${actualWidth}px；${remaining?'剩余':'已用'}模式；${monochrome?'单色':'服务色'}；场景 ${scenarios.find(s=>s.value===scenario)?.label}${baseline?'；当前为现有样式对照':''}`}/>
  </div>
  <Catalog onChoose={choose}/>
  <footer className="hu-lab-footer"><p>底部切换五个方向，侧边选择三种结构。快捷键 1–5、← → 切方向，输入和滑块操作不受干扰。</p><p>独立中文原型，所有账号与数字均为虚构。采用 Arc 控件及 TokenPlan 字体和服务颜色；不读取真实账号，不写入应用设置，不替换上一轮总量统计方案。</p><p>这是设计比较，不是已经接入产品的功能。确认方向后，再处理真实数据、五语言和原生窗口的正式验收。</p></footer>
 </main><Picker current={family} onChange={choose}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
