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
import {MetricRow,isQuotaMetric} from '../../src/Metrics';
import {ProviderLogo} from '../../src/Dashboard';
import {providerTheme} from '../../src/providerTheme';
import {textFor} from '../../src/copy';
import {HistorySummary} from '../../src/preview/HistoryPage';
import {now} from '../usage-candidates/data';
import {accountFor,scenarios} from './data';
import {Picker,names} from './Picker';
import {Classic} from './Classic';
import {Summaries} from './Summaries';
import {Expandable} from './Expandable';
import '../usage-candidates/prototype.css';
import './benefits.css';

const variants=[Classic,Summaries,Expandable];
const notes=[
 ['保持原样的参照','正式详情页的名称、数值和到期日期列表。读数不合并，日期按需展开。','最省空间；金额不如大数字醒目。'],
 ['优先看清余额','每个指标一个静态数字摘要。同一个指标提供的金额与 Credits 留在同一组，到期日期直接可见。','更容易读到数值；权益多时需要更多滚动。'],
 ['数值常显，日期按需','余额保持紧凑列表，仅有到期信息的权益使用 Arc 可展开卡片。折叠不隐藏余额或权益数量。','点击区域更清楚；没有附加日期的指标不强行做成卡片。'],
];
function App() {
 const [variant,setVariant]=useState(0),[dark,setDark]=useState(false),[scenario,setScenario]=useState('normal');
 const [width,setWidth]=useState('390'),[range,setRange]=useState('30');
 const select=useCallback((value:number)=>{
  setVariant(value);const url=new URL(location.href);url.searchParams.set('v',String(value+1));history.replaceState(null,'',url);
 },[]);
 useEffect(()=>{const v=Number(new URLSearchParams(location.search).get('v'));select(Number.isInteger(v)&&v>=1&&v<=variants.length?v-1:0);},[select]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 const account=accountFor(scenario),Variant=variants[variant],missing=scenario==='loading'?'读取中':'暂无数据';
 return <MotionConfig reducedMotion="user"><main className="lab-page">
  <header className="lab-header"><h1>详情页也可以有自己的样式</h1><p>先比较“余额与权益”，不把整页绑成一个主题。之前的用量方案全部保留。</p><p className="detail-rounds"><a href="../usage-candidates/">圆环与刻度尺</a><a href="../usage-next/">数字与分段用量</a></p></header>
  <div className="lab-layout">
   <aside className="lab-controls" aria-label="比较工具">
    <section><h2>{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="lab-fields">
     <Select label="检验场景" value={scenario} options={scenarios} onValueChange={setScenario}/>
     <Select label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={setWidth}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
    </div>
    <section className="lab-rules"><h2>各区独立选择，不改数据含义</h2><ul>
     <li>当前额度：保留前两轮候选。</li><li>余额与权益：本轮比较三种表达。</li>
     <li>历史汇总：后续比较数字摘要与逐日记录。</li><li>模型明细：后续比较列表与有明确总量的占比。</li>
     <li>账号资料：适合紧凑资料行，不强行变成图表。</li>
    </ul></section>
    <p className="key-hint">按 1–3 或 ← → 切换。这里只记住预览方案，不保存正式设置。</p>
   </aside>
   <figure className="preview-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>余额与权益 · {width}px</small></figcaption>
    <div className="preview-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario}>
     <header className="sample-header" style={providerTheme(account.family)}><ProviderLogo family={account.family}/><h2>{account.name}</h2><span>示例详情</span></header>
     <div className="sample-scroll detail-sample" tabIndex={0} role="region" aria-label="详情预览，可滚动">
      <div className="detail-identity"><span>{account.email}</span><span className="plan-tag">{account.plan}</span></div>
      <section className="detail-group" style={providerTheme(account.family)}><h2>当前额度 · 已用</h2>{account.metrics.filter(isQuotaMetric).map(m=><MetricRow key={m.id} metric={m} now={now} missing="暂无数据" language="zh-Hans"/>)}</section>
      <section className="detail-group benefit-region" aria-labelledby="benefits-heading" aria-busy={scenario==='loading'}>
       <h2 id="benefits-heading">余额与权益</h2>
       {scenario==='error'&&<div className="sample-error"><p role="alert">示例余额读取失败，以下不是零余额。</p><Button variant="secondary" size="sm" onClick={()=>setScenario('normal')}>重新载入示例</Button></div>}
       {account.benefits.length?<Variant key={`${variant}-${scenario}`} metrics={account.benefits} missing={missing}/>:<div className="sample-empty"><p>这个示例没有余额或权益记录</p><Button variant="secondary" size="sm" onClick={()=>setScenario('normal')}>载入示例权益</Button></div>}
      </section>
      <section className="detail-group history-overview"><h2>{textFor('zh-Hans').history}</h2><HistorySummary accounts={[account]} t={textFor('zh-Hans')} language="zh-Hans" range={range} onRange={setRange}/></section>
      <section className="detail-group"><h2>备注</h2><p className="benefit-note">{account.note}</p></section>
     </div>
    </div>
    <p className="preview-foot">固定虚构数据 · 仅改变余额与权益区域</p>
   </figure>
  </div>
  <footer className="lab-footer"><p>数字摘要适配免费 Arc Metric Card 的信息结构；展开权益使用免费 Expandable Card。比较控件使用现有 Arc Select、Switch、Button。没有新增依赖、支付操作或假趋势。</p><p>中文交互原型，未接真实服务、未写入正式设置；最终采用哪些样式由你决定。</p></footer>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
