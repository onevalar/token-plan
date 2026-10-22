import {createRoot} from 'react-dom/client';
import {useCallback,useEffect,useState,type CSSProperties} from 'react';
import {MotionConfig} from 'motion/react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
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
import {fixture,scenarios} from './data';
import {Classic} from './Classic';
import {Timeline} from './Timeline';
import {Cards} from './Cards';
import {Picker,names} from './Picker';
import './daily-records.css';

const variants=[Classic,Timeline,Cards];
const notes=[
 ['紧凑扫描，按需深入','沿用正式每日记录的日期、Token 与费用行。一次打开一天，再展开来源下的模型明细。','占用空间最少；来源与模型需要逐层打开。'],
 ['顺着日期，回看记录','日期串成一条阅读路径，只放真实记录日。当天来源数量可直接看到，也可以同时打开多天。','上下文更连贯；同屏日期比紧凑列表少。'],
 ['每天一张，读数优先','每张卡保留当天 Token、已记录费用与来源数量。独立展开，不必关闭前一天。','读数更醒目；40 条记录时需要更多滚动。'],
];
function App() {
 const [variant,setVariant]=useState(0),[dark,setDark]=useState(false),[scenario,setScenario]=useState('normal');
 const [width,setWidth]=useState('390'),[page,setPage]=useState(0),[mount,setMount]=useState(0);
 const choose=useCallback((value:number)=>{
  setVariant(value);setPage(0);setMount(n=>n+1);
  const url=new URL(location.href);url.searchParams.set('v',String(value+1));history.replaceState(null,'',url);
 },[]);
 useEffect(()=>{
  const query=new URLSearchParams(location.search),v=Number(query.get('v'));
  choose(Number.isInteger(v)&&v>=1&&v<=variants.length?v-1:0);
  const state=query.get('state');if(scenarios.some(item=>item.value===state))setScenario(state!);
 },[choose]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 const changeScenario=(value:string)=>{
  setScenario(value);setPage(0);
  const url=new URL(location.href);url.searchParams.set('state',value);history.replaceState(null,'',url);
 };
 const data=fixture(scenario),Variant=variants[variant],pages=Math.max(1,Math.ceil(data.days.length/7));
 const current=Math.min(page,pages-1),days=data.days.slice(current*7,current*7+7);
 return <MotionConfig reducedMotion="user"><main className="dr-lab">
  <header className="dr-lab-header"><h1>每日记录，按你的方式回看</h1><p>只比较日期与来源的组织方式。顶部汇总、模型占比和其他详情区，可以各自选择样式。</p></header>
  <div className="dr-layout">
   <aside className="dr-controls" aria-label="比较工具">
    <section><h2>{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="dr-tradeoff">取舍：{notes[variant][2]}</p></section>
    <div className="dr-fields">
     <Select label="检验场景" value={scenario} options={scenarios} onValueChange={changeScenario}/>
     <Select label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={setWidth}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
    </div>
    <section className="dr-rules"><h2>换组织方式，不换数据含义</h2><ul>
     <li>一天只表示当天已经记录的数据。</li><li>未知费用不当作零，部分费用会说明。</li>
     <li>缺少日期不代表零活动，不补虚构记录。</li><li>本机记录不会被重复算进多个账号。</li>
    </ul></section>
    <p className="dr-key-hint">按 1–3 或 ← → 切换。时间线也支持 ↑ ↓、Home、End；摘要卡支持 Escape 收起。</p>
   </aside>
   <figure className="dr-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>每日记录 · {width} × 704</small></figcaption>
    <div className="dr-window mac-preview" data-variant={variant+1} data-scenario={scenario}>
     <header className="dr-sample-header"><h2>用量历史</h2><span>虚构示例</span></header>
     <div className="dr-scroll" role="region" aria-label="每日记录预览，可滚动" tabIndex={0}>
      <div className="dr-context"><p>2026 年 · 仅显示已记录的日期</p><p>{data.days.length?`${data.days.length} 个记录日 · ${data.rows.length} 条来源记录`:'本机与账号的每日记录'}</p></div>
      <details className="dr-sources"><summary>来源范围与读数说明</summary><p>Claude 是本机记录，不归属单个账号；Cursor 是 {data.accounts[1].email} 的账号记录。两类来源独立保留。</p><p>“—”表示费用未知；记录金额是用量费用，不是支付或充值。这里没有连续活动曲线。</p>{scenario==='dedupe'&&<p>两个 Claude 账号共享同一本机历史，仅计一次。与正常场景的合计相同。</p>}</details>
      {data.partial&&<p className="dr-notice" role="status">部分记录尚不完整。费用只累计已知条目；“—”表示未知，不是 $0.00。</p>}
      {scenario==='gaps'&&<p className="dr-notice">10 月 20 日等日期没有记录，不据此判断是否有活动。时间线间距不表示相隔天数。</p>}
      {scenario==='zero'&&<p className="dr-notice">两类来源均明确记录了 0 token 与 $0.00；这不同于没有数据。没有模型明细。</p>}
      {scenario==='error'?<div className="dr-state"><h2 role="alert">示例记录读取失败</h2><p>这不代表没有活动。重新载入可恢复同一份虚构记录。</p><Button variant="secondary" onClick={()=>changeScenario('normal')}>重新载入示例</Button></div>
       :scenario==='empty'?<div className="dr-state"><h2>还没有每日记录</h2><p>没有记录不能视为零活动。可以载入示例，比较日期的组织方式。</p><Button variant="secondary" onClick={()=>changeScenario('normal')}>载入示例记录</Button></div>
       :scenario==='loading'?<div className="dr-state" aria-busy="true"><h2 role="status">正在读取示例记录</h2><div className="dr-skeleton" aria-hidden="true"/><div className="dr-skeleton" aria-hidden="true"/><div className="dr-skeleton" aria-hidden="true"/><Button variant="secondary" onClick={()=>changeScenario('normal')}>完成模拟读取</Button></div>
       :<><Variant key={`${variant}-${scenario}-${current}-${mount}`} days={days} rows={data.rows}/>
        {pages>1&&<div className="pagination"><Button size="sm" variant="ghost" disabled={!current} aria-label="上一页" onClick={()=>setPage(current-1)}><ChevronLeft size={16}/></Button><span aria-live="polite">{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} aria-label="下一页" onClick={()=>setPage(current+1)}><ChevronRight size={16}/></Button></div>}
       </>}
     </div>
    </div>
    <p className="dr-preview-foot">每页 7 个记录日 · 只改变本区，不保存正式设置</p>
   </figure>
  </div>
  <footer className="dr-footer"><p>现有列表是正式日记录块的聚焦复刻。新方向有限适配免费 Arc Timeline 与 Expandable Card；不把日记录伪装成事件或账单。</p><p>固定示例日期：2026 年 10 月 22 日。没有连接真实服务，最终采用哪些样式由你决定。</p></footer>
 </main><Picker current={variant} onChange={choose}/></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
