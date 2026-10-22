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
import {Select} from '../../src/components/arc/select/select';
import {Switch} from '../../src/components/arc/switch/switch';
import {ProviderLogo} from '../../src/Dashboard';
import {providerTheme} from '../../src/providerTheme';
import {accountFor,scenarios} from './data';
import {Baseline} from './Baseline';
import {Fields} from './Fields';
import {Summary} from './Summary';
import {Picker,names} from './Picker';
import './lab.css';
import './profile.css';

const variants=[Baseline,Fields,Summary];
const notes=[
 ['保持现有阅读顺序','邮箱和套餐在顶部，备注与上次更新时间留在额度、余额下方。直接使用正式样式作为参照。','最紧凑、最熟悉；资料分散，长套餐沿用现有不换行行为。'],
 ['资料集中，逐项查找','把邮箱、套餐、备注和上次更新时间放在一个只读资料列表。缺失的字段不占位置。','字段含义明确；标签和长备注会把额度推到更下面。'],
 ['身份常显，备注按需','邮箱、套餐和上次更新时间始终可见。只有确实存在备注时才出现展开入口。','默认更安静；读备注需要一步操作，短备注也要展开。'],
];
function query(key:string,value:string) {
 const url=new URL(location.href);url.searchParams.set(key,value);history.replaceState(null,'',url);
}
function App() {
 const [variant,setVariant]=useState(0),[dark,setDark]=useState(false),[scenario,setScenario]=useState('normal');
 const [width,setWidth]=useState('390');
 const select=useCallback((value:number)=>{setVariant(value);query('v',String(value+1));},[]);
 useEffect(()=>{
  const params=new URLSearchParams(location.search),v=Number(params.get('v'));
  select(Number.isInteger(v)&&v>=1&&v<=variants.length?v-1:0);
  const scene=params.get('scenario'),size=params.get('width');
  if(scenarios.some(item=>item.value===scene))setScenario(scene!);
  if(size&&['360','390','480'].includes(size))setWidth(size);
  setDark(params.get('theme')==='dark');
 },[select]);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 const account=accountFor(scenario),Variant=variants[variant];
 return <MotionConfig reducedMotion="user"><main className="ap-lab">
  <header className="ap-lab-header"><h1>账号资料，也可以有不同读法</h1><p>只比较详情里的资料组织。额度、余额片段不变，之前的设计全部保留。</p></header>
  <div className="ap-lab-layout">
   <aside className="ap-controls" aria-label="比较工具">
    <section><h2>{names[variant]}：{notes[variant][0]}</h2><p>{notes[variant][1]}</p><p className="ap-tradeoff">取舍：{notes[variant][2]}</p></section>
    {variant===0&&scenario==='long'&&<section className="ap-baseline-caveat"><h2>原样基线的已知限制</h2><p>正式套餐标签不换行，长文本可能超出面板。此处不修饰基线；完整套餐原文：</p><p>{account.plan}</p></section>}
    <div className="ap-controls-fields">
     <Select id="profile-scenario" label="检验场景" value={scenario} options={scenarios} onValueChange={value=>{setScenario(value);query('scenario',value);}}/>
     <Select id="profile-width" label="面板宽度" value={width} options={['360','390','480'].map(value=>({value,label:`${value}px`}))} onValueChange={value=>{setWidth(value);query('width',value);}}/>
     <Switch label="深色外观" checked={dark} onCheckedChange={value=>{setDark(value);query('theme',value?'dark':'light');}}/>
    </div>
    <section className="ap-rules"><h2>只展示已有资料</h2><ul>
     <li>账号名、邮箱和套餐不放进折叠区。</li>
     <li>错误与警告在外面，完整可读。</li>
     <li>上次更新时间不等于连接状态。</li>
     <li>缺少资料就不补写，也不放空展开按钮。</li>
    </ul></section>
    <p className="ap-key-hint">按 1–3 或 ← → 切换。展开备注支持 Enter、空格；Esc 收起并回到按钮。</p>
    <p className="ap-boundary">只读虚构样例，不是账号设置。不会登录、刷新、保存或连接真实服务。</p>
    <footer className="ap-footer"><p>本轮探索尚未选定。分项资料使用原生描述列表；展开备注采用 Arc 免费 Expandable Card。比较控件沿用现有 Arc Select、Switch。</p><p>这里只改变阅读组织，不测试配置表单、历史、模型明细或刷新行为。最终选择由你决定。</p></footer>
   </aside>
   <figure className="ap-figure" style={{'--panel-width':`${width}px`} as CSSProperties}>
    <figcaption><span>{names[variant]}</span><small>账号资料 · {width}px</small></figcaption>
    <div className="ap-window mac-preview" data-density="compact" data-variant={variant+1} data-scenario={scenario}>
     <header className="ap-sample-header" style={providerTheme(account.family)}><ProviderLogo family={account.family}/><h2>{account.name}</h2></header>
     <div key={`${variant}-${scenario}`} className="ap-scroll" tabIndex={0} role="region" aria-label="详情预览，可滚动">
      <div className="account-detail" data-provider={account.family} style={providerTheme(account.family)}><Variant account={account}/></div>
     </div>
    </div>
    <p className="ap-preview-foot">虚构账号资料 · 未接真实账号</p>
   </figure>
  </div>
 </main><Picker current={variant} onChange={select}/></MotionConfig>;
}
const root=createRoot(document.getElementById('root')!);
root.render(<App/>);
if(import.meta.hot)import.meta.hot.dispose(()=>root.unmount());
