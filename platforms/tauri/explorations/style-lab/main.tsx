import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import {MotionConfig} from 'motion/react';
import {ChevronRight} from 'lucide-react';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '../../src/components/arc/foundation.css';
import {Switch} from '../../src/components/arc/switch/switch';
import styles from './lab.module.css';

const groups=[
 {title:'主页用量',description:'这些方案都保留。当前额度、已用或剩余、重置时间始终一起表达。',items:[
  {path:'usage-candidates',title:'圆环与刻度尺',detail:'原有横条、紧凑圆环、刻度尺、独立同心弧',ready:true},
  {path:'usage-next',title:'数字与分段用量',detail:'原有横条、静态数字、可部分填充的分段条',ready:true},
 ]},
 {title:'详情页',description:'每个区域独立比较，将来可以各选一种，不必绑定成整页主题。',items:[
  {path:'detail-benefits',title:'余额与权益',detail:'原有列表、数字摘要、可展开权益',ready:true},
  {path:'history-summary',title:'历史汇总',detail:'现有汇总、数字摘要、每日概览',ready:true},
  {path:'daily-records',title:'每日记录',detail:'现有列表、日期时间线、逐日摘要卡',ready:true},
  {path:'model-breakdown',title:'模型明细',detail:'现有列表、横向排名、构成环形',ready:true},
  {path:'account-profile',title:'账号资料',detail:'现有身份行、分项资料、展开摘要',ready:true},
 ]},
];

function App() {
 const [dark,setDark]=useState(false);
 useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
 return <MotionConfig reducedMotion="user"><main className={styles.page}>
  <header className={styles.header}>
   <div><h1>TokenPlan 样式实验室</h1><p>先看清信息，再选择你喜欢的表达。</p></div>
   <Switch label="深色外观" checked={dark} onCheckedChange={setDark}/>
  </header>
  {groups.map(group=><section className={styles.group} key={group.title} aria-label={group.title}>
   <h2>{group.title}</h2><p className={styles.description}>{group.description}</p>
   <ul>{group.items.map(item=><li key={item.path}>
    {item.ready?<a className={styles.item} href={`../${item.path}/`} aria-describedby={`${item.path}-detail`}>
     <span><span className={styles.title}>{item.title}</span><span id={`${item.path}-detail`} className={styles.detail}>{item.detail}</span></span>
     <ChevronRight size={18} aria-hidden="true"/>
    </a>:<div className={styles.item}>
     <span><span className={styles.title}>{item.title}</span><span className={styles.detail}>{item.detail}</span></span>
     <span className={styles.pending}>并行制作中</span>
    </div>}
   </li>)}</ul>
  </section>)}
  <footer className={styles.footer}>
   <p>每组保留原有样式作参照。进入后，用底部切换器比较同一份示例数据，也可以切换缺失、长内容和深色场景。</p>
   <p>这里只是中文交互原型，不连接真实账号，不保存正式设置。最终采用哪些样式，由你决定。</p>
  </footer>
 </main></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
