import {createRoot} from 'react-dom/client';
import {useCallback,useEffect,useRef,useState,type CSSProperties} from 'react';
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
import {accountsFor,historyView,scenarios,useLocalDay} from './data';
import {Picker,names} from './Picker';
import {Classic} from './Classic';
import {Summaries} from './Summaries';
import {Daily} from './Daily';
import '../usage-candidates/prototype.css';
import './history.css';

const notes=[
 ['正式界面，保持原样','直接使用当前 HistorySummary：范围按钮、费用、Tokens 和小型日柱图。','最紧凑；没有逐日精确数值，费用与缺日的说明较简略。'],
 ['先读总量，再读覆盖','两个静态数字摘要，明确日期边界、记录天数与费用覆盖，不用趋势装饰总量。','范围和未知费用更清楚；看不到用量集中在哪几天。'],
 ['先看分布，再核对数值','带刻度的每日柱状概览。缺日用问号，真实零用圆点；可展开每日精确数值。','适合查看每日差异；比小图占空间，需要读取覆盖说明。'],
];

function App() {
 const [variant,setVariant]=useState(0),[ready,setReady]=useState(false),[dark,setDark]=useState(false),[scenario,setScenario]=useState('normal');
 const [width,setWidth]=useState('390'),[range,setRange]=useState('30');
 const preview=useRef<HTMLDivElement>(null);
 const day=useLocalDay();
 const select=useCallback((value:number)=>{
  setVariant(value);const url=new URL(location.href);url.searchParams.set('v',String(value+1));history.replaceState(null,'',url);
 },[]);
 useEffect(()=>{
  const query=new URLSearchParams(location.search),v=Number(query.get('v'));
  select(Number.isInteger(v)&&v>=1&&v<=3?v-1:0);setReady(true);
 },[select]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 // The browser clock is read only after mount. Every render builds fixtures and the new
 // summaries from this one instant; the reference reads the same real local calendar.
 if(!ready||!day)return <p role="status">正在准备历史示例</p>;
 const now=new Date(),accounts=accountsFor(scenario,now),account=accounts[0],view=historyView(accounts,range,now);
 const loadExample=()=>{setScenario('normal');requestAnimationFrame(()=>preview.current?.focus());};
 const failed=scenario==='error',loading=scenario==='loading';
 return <MotionConfig reducedMotion="user"><main className="lab-page hs-lab">
  <header className="lab-header"><h1>历史汇总，三种读法</h1><p>比较详情页的历史区域。其他区域继续独立探索，不把整页绑成一个主题。</p><p className="hs-rounds"><a href="../detail-benefits/">余额与权益</a><a href="../usage-candidates/">圆环与刻度尺</a><a href="../usage-next/">数字与分段用量</a></p></header>
  <div className="lab-layout">
   <aside className="lab-controls" aria-label="比较工具">
    <section><h2>{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="lab-fields">
     <Select label="检验场景" value={scenario} options={scenarios} onValueChange={setScenario}/>
     <Select label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={setWidth}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
    </div>
    <section className="lab-rules"><h2>先保证数据含义</h2><ul><li>缺少某日记录，不补成零。</li><li>只累加已知费用，不冒充全量账单。</li><li>每日 Tokens 不是套餐额度趋势。</li><li>设备历史按 family 去重，不重复累加。</li></ul></section>
    <p className="key-hint">按 1–3 或 ← → 切换。网址只记住比较方案，不保存正式设置。</p>
    <p className="hs-clock">示例以本地 {day} 为今天。数值固定，日期随本地日历平移。</p>
   </aside>
   <figure className="preview-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>历史汇总 · {width}px</small></figcaption>
    <div className="preview-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario} data-local-day={day}>
     <header className="sample-header" style={providerTheme(account.family)}><ProviderLogo family={account.family}/><h2>{account.name}</h2><span>示例详情</span></header>
     <div ref={preview} className="sample-scroll hs-scroll" tabIndex={0} role="region" aria-label="详情预览，可滚动">
      <div className="detail-identity"><span>{account.email}</span><span className="plan-tag">{account.plan}</span></div>
      <section className="detail-group hs-region" aria-labelledby="history-heading" aria-busy={loading}>
       <h2 id="history-heading">历史汇总</h2>
       <div role="alert">{failed&&<p className="hs-error">历史示例读取失败。不是零用量，请重新载入示例。</p>}</div>
       <div role="status">{loading&&<p className="hs-state">正在模拟读取历史。完成后再显示总量。</p>}</div>
       {failed||loading?<div className="hs-state"><Button variant="secondary" onClick={loadExample}>{failed?'重新载入示例':'完成模拟读取'}</Button></div>:variant===0?<Classic accounts={accounts} range={range} onRange={setRange}/>:variant===1?<Summaries key={`${scenario}-${day}`} view={view} range={range} onRange={setRange} onExample={loadExample}/>:<Daily key={`${scenario}-${day}`} view={view} range={range} onRange={setRange} onExample={loadExample}/>}
      </section>
      <section className="detail-group"><h2>记录说明</h2><p className="hs-note">{scenario==='device'?'两个虚构账号共享同一份设备历史；按 family 去重后仍为一份记录。':account.note}</p><p className="hs-note">{account.historyScope==='device'?'本设备记录':'账号记录'} · 金额为 USD。历史用量与当前套餐额度分别记录。</p></section>
     </div>
    </div>
    <p className="preview-foot">虚构固定数值 · 仅改变历史汇总区域</p>
   </figure>
  </div>
  <footer className="lab-footer"><p>数字摘要适配免费 Arc Metric Card；每日图适配免费 Bar Chart 的静态绘图部分，明确保留未知与真实零。比较工具使用现有 Arc Button、Select、Switch。</p><p>用户尚未选择，原型未上线；不接真实服务、不写正式设置，也没有新增依赖或 Tooltip。</p></footer>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
