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
import {Classic} from '../usage-candidates/variants/Classic';
import {accountsFor,scenarios} from '../usage-candidates/data';
import {Picker,names} from './Picker';
import {Numbers} from './Numbers';
import {Segmented} from './Segmented';
import '../usage-candidates/prototype.css';
import './next.css';

const variants=[Classic,Numbers,Segmented];
const notes=[
 ['保持原样的参照','直接使用正式主页的横条组件。三个方案读取同一组示例数据，不因为更换造型修改读数或账号顺序。','最紧凑，也最容易横向比较。'],
 ['让读数成为主角','每项额度独立显示大数字，两列排列。不画圆环或长度，不把多个周期合成一个总数。','数字醒目；需要阅读数字，不能像横条一样扫一眼比较长短。'],
 ['把连续容量分段看','每一小段代表 5 个百分点，最后一段按实际比例填充。保留百分比和重置时间，不把格子当作请求次数。','比二维格点更扁平；细分段增加视觉密度，值得与上一轮刻度尺比较。'],
];
function App() {
 const [variant,setVariant]=useState(0),[remaining,setRemaining]=useState(false),[dark,setDark]=useState(false);
 const [scenario,setScenario]=useState('normal'),[width,setWidth]=useState('390');
 const select=useCallback((value:number)=>{
  setVariant(value);const url=new URL(location.href);url.searchParams.set('v',String(value+1));history.replaceState(null,'',url);
 },[]);
 useEffect(()=>{const value=Number(new URLSearchParams(location.search).get('v'));select(Number.isInteger(value)&&value>=1&&value<=variants.length?value-1:0);},[select]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 const accounts=accountsFor(scenario,remaining),Variant=variants[variant],missing=scenario==='loading'?'读取中':'暂无数据';
 return <MotionConfig reducedMotion="user"><main className="lab-page">
  <header className="lab-header"><h1>数字与分段，再比较两种</h1><p>上一轮全部保留。这轮仍是独立原型，不改变正式设置。</p><p className="round-links"><a href="../usage-candidates/">查看上一轮：紧凑圆环、刻度尺、同心环 →</a></p></header>
  <div className="lab-layout">
   <aside className="lab-controls" aria-label="比较工具">
    <section aria-labelledby="direction"><h2 id="direction">{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="lab-fields">
     <Select label="检验场景" value={scenario} options={scenarios} onValueChange={setScenario}/>
     <Select label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={setWidth}/>
     <Switch label="显示剩余额度" checked={remaining} onCheckedChange={setRemaining}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
    </div>
    <section className="lab-rules" aria-labelledby="rules"><h2 id="rules">保持同一把尺</h2><ul>
     <li>同一账号、同一读数，5h 与 1w 不合并。</li><li>已用 ≥80% 告警；切到剩余时，低余额仍告警。</li>
     <li>数字沿用整数显示，告警和填充按原始小数计算。</li><li>超额保留数字，缺失不画成空电量，余额仍是金额。</li>
     <li>数字不滚动，分段不播放从零填满的动画。</li>
    </ul></section>
    <p className="key-hint">按 1–3 或 ← → 切换；刷新保留所选方案。底部深色条仅用于比较。</p>
   </aside>
   <figure className="preview-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>{remaining?'剩余额度':'已用额度'} · {width}px</small></figcaption>
    <div className="preview-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario} data-remaining={remaining}>
     <header className="sample-header"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><span>设计预览</span></header>
     <div className="sample-scroll" key={variant} tabIndex={0} role="region" aria-label="用量预览，可滚动" aria-busy={scenario==='loading'}>
      <div className="mode-caption">{remaining?'剩余额度':'已用额度'}</div>
      {scenario==='error'&&<div className="sample-error"><p role="alert">示例读取失败，没有可用读数。</p><Button variant="secondary" size="sm" onClick={()=>setScenario('normal')}>重新载入示例</Button></div>}
      <div className="dashboard">{accounts.map(a=><section key={a.id} className="provider" data-provider={a.family} data-account={a.id} aria-label={`${a.name} ${a.email}`} style={providerTheme(a.family)}>
       <div className="sample-identity"><ProviderLogo family={a.family}/><div><div className="sample-name"><h3>{a.name}</h3><span>{a.plan}</span></div>{a.email&&<p>{a.email}</p>}</div></div>
       <Variant metrics={a.metrics.filter(m=>m.placement==='home')} remaining={remaining} missing={missing}/>
      </section>)}</div>
      {!accounts.length&&<div className="sample-empty"><p>示例中没有账号</p><Button variant="secondary" onClick={()=>setScenario('normal')}>载入示例账号</Button></div>}
     </div>
    </div>
    <p className="preview-foot">固定示例数据 · 同样的读数，不同的表达</p>
   </figure>
  </div>
  <footer className="lab-footer"><p>沿用 TokenPlan 字体、配色与 Arc 控件。数字式适配免费 Metric Card 的信息结构；分段式适配免费 Usage Meter。两者均非原版即插即用组件。</p><p>这里只比较首页造型，不增加趋势或预测；中文原型不代表五语言、原生窗口或真实服务商数据已经验收。所有方案等待你的最终选择。</p></footer>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
