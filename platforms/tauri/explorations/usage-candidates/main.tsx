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
import {ProviderLogo} from '../../src/Dashboard';
import {providerTheme} from '../../src/providerTheme';
import {Classic} from './variants/Classic';
import {Compact} from './variants/Compact';
import {Ruler} from './variants/Ruler';
import {Concentric} from './variants/Concentric';
import {accountsFor,scenarios} from './data';
import {Picker,names} from './Picker';
import './prototype.css';

const variants=[Classic,Compact,Ruler,Concentric];
const notes=[
 ['横向比较最快','直接使用当前主页的横条组件，不重新模仿。作为基线，方便判断新样式是否真的更适合你。','占用空间最少；个性较弱，但多个账号一起看最直接。'],
 ['保留列表，小环点题','把每项额度的图形收成一个小环，周期、数字和重置时间仍然逐行排列。','比大仪表省空间；小环不适合精读细微差别，准确值仍看数字。'],
 ['看清距离上限还有多远','固定 0–100% 标尺，加入刻度与告警参考线。切换剩余模式时，参考线随语义移到 20%。','边界更明确；每项多一行刻度，信息也比普通横条更密。'],
 ['两个周期，放在一起看','外圈与内圈各对应一项额度，旁边直接写明周期、百分比和重置时间，中心不放总数。','更有辨识度；需要辨认内外圈。只有两项相邻、不同周期的额度才配对，其他账号用独立小环。'],
];
function App() {
 const [variant,setVariant]=useState(0),[remaining,setRemaining]=useState(false),[dark,setDark]=useState(false);
 const [scenario,setScenario]=useState('normal'),[width,setWidth]=useState('390');
 const select=useCallback((value:number)=>{
  setVariant(value);const url=new URL(location.href);url.searchParams.set('v',String(value+1));history.replaceState(null,'',url);
 },[]);
 useEffect(()=>{const value=Number(new URLSearchParams(location.search).get('v'));select(Number.isInteger(value)&&value>=1&&value<=4?value-1:0);},[select]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 const accounts=accountsFor(scenario,remaining),Variant=variants[variant],missing=scenario==='loading'?'读取中':'暂无数据';
 return <MotionConfig reducedMotion="user"><main className="lab-page">
  <header className="lab-header"><h1>再试三种用量表达</h1><p>同一组数据，一次看一种。独立原型 · 示例账号 · 不改变正式设置。</p></header>
  <div className="lab-layout">
   <aside className="lab-controls" aria-label="比较工具">
    <section aria-labelledby="direction"><h2 id="direction">{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="lab-fields">
     <Select label="检验场景" value={scenario} options={scenarios} onValueChange={setScenario}/>
     <Select label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={setWidth}/>
     <Switch label="显示剩余额度" checked={remaining} onCheckedChange={setRemaining}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
    </div>
    <section className="lab-rules" aria-labelledby="rules"><h2 id="rules">不因造型改变含义</h2><ul>
     <li>5h 和 1w 各自独立，不平均、不拼总量。</li><li>已用 ≥80% 才告警；剩余模式不反转危险程度。</li>
     <li>超额保留真实数字，缺失不写成 0%。</li><li>余额仍显示金额，不虚构总额度。</li>
     <li>不播放填充动画，不把用尽当成成功。</li>
    </ul></section>
    <p className="key-hint">按 1–4 或 ← → 切换；刷新保留所选方案。底部深色条仅用于比较。</p>
   </aside>
   <figure className="preview-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>{remaining?'剩余额度':'已用额度'} · {width}px</small></figcaption>
    <div className="preview-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario} data-remaining={remaining}>
     <header className="sample-header"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><span>设计预览</span></header>
     <div className="sample-scroll" key={variant} tabIndex={0} role="region" aria-label="用量预览，可滚动" aria-busy={scenario==='loading'}>
      <div className="mode-caption">{remaining?'剩余额度':'已用额度'}</div>
      {variant===2&&<p className="scale-caption">{remaining?'⚑ 剩余 ≤20% 时告警；0% 为用尽':'⚑ 已用 ≥80% 时告警；100% 为用尽'}</p>}
      {scenario==='error'&&<div className="sample-error"><p role="alert">示例读取失败，没有可用读数。</p><Button variant="secondary" size="sm" onClick={()=>setScenario('normal')}>重新载入示例</Button></div>}
      <div className="dashboard">{accounts.map(a=><section key={a.id} className="provider" data-provider={a.family} data-account={a.id} aria-label={`${a.name} ${a.email}`} style={providerTheme(a.family)}>
       <div className="sample-identity"><ProviderLogo family={a.family}/><div><div className="sample-name"><h3>{a.name}</h3><span>{a.plan}</span></div>{a.email&&<p>{a.email}</p>}</div></div>
       <Variant metrics={a.metrics.filter(m=>m.placement==='home')} remaining={remaining} missing={missing}/>
      </section>)}</div>
      {!accounts.length&&<div className="sample-empty"><p>示例中没有账号</p><Button variant="secondary" onClick={()=>setScenario('normal')}>载入示例账号</Button></div>}
     </div>
    </div>
    <p className="preview-foot">数值与倒计时均为固定示例，便于公平比较。</p>
   </figure>
  </div>
  <footer className="lab-footer"><p>沿用 TokenPlan 字体、配色和 Arc 控件；小环、同心环适配免费 Gauge，刻度尺适配免费 Usage Meter。未复制 Pro 组件。</p><p>这里只比较造型与读数。中文原型不代表五语言、原生窗口或真实服务商数据已经验收；选定后再正式接入。</p></footer>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
