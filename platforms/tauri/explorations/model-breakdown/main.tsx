import {createRoot} from 'react-dom/client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import {MotionConfig} from 'motion/react';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '../../src/components/arc/foundation.css';
import '../../src/style.css';
import '../../src/preview/preview.css';
import {Button} from '../../src/components/arc/button/button';
import {Switch} from '../../src/components/arc/switch/switch';
import {Select} from '../../src/components/arc/select/select';
import {composition,exact,fixtureFor,scenarioOptions} from './data';
import {Picker,names} from './Picker';
import {Classic} from './Classic';
import {Ranking} from './Ranking';
import {Composition} from './Composition';
import '../usage-candidates/prototype.css';
import '../detail-benefits/benefits.css';
import './models.css';

const variants=[Classic,Ranking,Composition];
const notes=[
 ['先逐项核对','正式模型列表原样保留；模型名、tokens、可空费用和变体仍在同一行组。','紧凑而熟悉，模型大小的差异需要读数比较。'],
 ['一眼找到主要模型','把同一来源的模型按已记录 tokens 排名。共用零起点刻度，数值始终可见。','比较大小更直接；每行更高，需要多滚动。'],
 ['看清一份记录的构成','只有总数可确认时画构成环，缺少的模型部分明确叫未归类记录。','适合少量模型；超过六个部分或总数不可信时退回列表。'],
];
function remember(key:string,value:string) {
 const url=new URL(location.href);url.searchParams.set(key,value);history.replaceState(null,'',url);
}
function App() {
 const [variant,setVariant]=useState(0),[dark,setDark]=useState(false),[scenario,setScenario]=useState('normal');
 const [width,setWidth]=useState('390'),[scope,setScope]=useState<'account'|'device'>('account'),[ready,setReady]=useState(false);
 const select=useCallback((value:number)=>{setVariant(value);remember('v',String(value+1));},[]);
 const changeScenario=(value:string)=>{setScenario(value);remember('scenario',value);};
 useEffect(()=>{
  const params=new URLSearchParams(location.search),v=Number(params.get('v'));
  setVariant(Number.isInteger(v)&&v>=1&&v<=3?v-1:0);
  const s=params.get('scenario');if(scenarioOptions.some(o=>o.value===s))setScenario(s!);
  const w=params.get('width');if(w&&['360','390','480'].includes(w))setWidth(w);
  setScope(params.get('scope')==='device'?'device':'account');setDark(params.get('theme')==='dark');setReady(true);
 },[]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 if(!ready)return null;
 const fixture=fixtureFor(scenario,scope),info=composition(fixture),Variant=variants[variant];
 return <MotionConfig reducedMotion="user"><main className="lab-page mb-page">
  <header className="lab-header"><h1>模型明细，独立比较三种表达</h1><p>只改变模型记录这一块。其他详情区域仍可各选各的，所有方案保留，尚未选定。</p><p className="detail-rounds"><a href="../detail-benefits/">余额与权益探索</a><a href="../usage-candidates/">用量候选方案</a></p></header>
  <div className="lab-layout">
   <aside className="lab-controls" aria-label="比较工具">
    <section><h2>{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="lab-fields">
     <Select id="mb-scenario" label="检验场景" value={scenario} options={scenarioOptions} onValueChange={changeScenario}/>
     <Select id="mb-width" label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={value=>{setWidth(value);remember('width',value);}}/>
     <Select id="mb-scope" label="单一记录来源" value={scope} options={[{value:'account',label:'单一账号记录'},{value:'device',label:'本机设备记录'}]} onValueChange={value=>{setScope(value as 'account'|'device');remember('scope',value);}}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={value=>{setDark(value);remember('theme',value?'dark':'light');}}/>
    </div>
    <section className="lab-rules"><h2>同一范围，才有可比的构成</h2><ul><li>不跨日期、账号或设备相加。</li><li>tokens 只与 tokens 比较，费用未知保持未知。</li><li>份额分母明确，不靠隐藏图例改变总数。</li></ul></section>
    <p className="mb-fixture-note">合成场景：{fixture.coverage.note}</p>
    <p className="key-hint">按 1–3 或 ← → 切换。网址记住预览方案，不写入正式设置。</p>
   </aside>
   <figure className="preview-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>模型明细 · {width}px</small></figcaption>
    <div className="preview-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario}>
     <header className="sample-header"><h2>Claude</h2><span>合成详情</span></header>
     <div className="sample-scroll detail-sample" key={`${variant}-${scenario}-${scope}`} tabIndex={0} role="region" aria-label="模型详情预览，可滚动">
      <div className="mb-scope"><span>{scope==='account'?fixture.row.account:'本机 · Claude 设备记录'}</span><span>{scope==='account'?'仅此账号':'未按账号再次累加'}</span></div>
      <section className="mb-period"><h2>2026-10-21 · 单日模型记录</h2><p>仅含这一天、这一来源，不混入其他周期额度。</p>
       {fixture.state==='ready'&&<dl><div><dt>{fixture.coverage.totalTrusted?'该期已记录':'该期报数（未核实）'}</dt><dd>{exact(fixture.row.tokens)} <small>tokens</small></dd></div><div><dt>模型合计</dt><dd>{exact(info.sum)} <small>tokens</small></dd></div></dl>}
      </section>
      <section className="mb-models" aria-labelledby="mb-heading" aria-busy={fixture.state==='loading'}>
       <h2 id="mb-heading">模型明细 <span>{fixture.state==='ready'?`${fixture.row.models.length} 个模型`:'合成状态'}</span></h2>
       {fixture.state==='ready'?<>
        {fixture.partial&&<p className="mb-notice">来源只覆盖部分使用。以下不是完整账号用量或总账单。</p>}
        {variant===0&&(info.reason||info.remainder>0)&&<p className="mb-notice">{info.reason||`未归类记录：${exact(info.remainder)} tokens。未包含在下方已知模型中。`}</p>}
        <Variant fixture={fixture}/>
       </>:<div className="mb-state">
        <p role={fixture.state==='error'?'alert':'status'}>{fixture.state==='loading'?'正在读取模型记录，未知值不会显示为 0。':fixture.state==='error'?'模型记录读取失败。可重新载入本地示例，不代表零用量。':'这一天没有模型记录。不推断这一天用量为零。'}</p>
        {fixture.state==='loading'&&<div className="mb-skeleton" aria-hidden="true"><span/><span/><span/></div>}
        <Button variant="secondary" size="sm" onClick={()=>changeScenario('normal')}>{fixture.state==='error'?'重新载入合成示例':'载入合成示例'}</Button>
       </div>}
      </section>
     </div>
    </div>
    <p className="preview-foot">固定合成日期 · 704px 高 · 只比较模型明细</p>
   </figure>
  </div>
  <footer className="lab-footer"><p>比较控件使用现有 Arc Select、Switch、Button；图形有限适配免费 Bar Chart 刻度与 Donut Chart 几何。没有 tooltip、隐藏图例重算或 Pro 组件。</p><p>coverage 是本地合成证据，不是当前后端字段。本页未接真实服务、未接正式设置，最终选择权仍在你。</p></footer>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
