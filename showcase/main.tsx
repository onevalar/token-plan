import React from 'react';
import {createRoot} from 'react-dom/client';
import TokenPlanCover from '@portfolio/v3/personal-projects/covers/token-plan';
import {figures} from '@portfolio/v3/personal-projects/stories/token-plan-components';
import {TokenPlanHistory} from '@portfolio/v3/personal-projects/stories/token-plan-history';
import './showcase.css';
import {StyleGallery} from './StyleGallery';
const Components=figures['token-plan-components'];
const repo='https://github.com/onevalar/token-plan';
function App(){return <div className="showcase tp-native-theme">
 <header className="site-header"><a className="brand" href={repo}>TokenPlan</a><nav><a href="#styles">用量样式</a><a href="#history">用量统计</a><a href={`${repo}#下载`}>下载</a></nav></header>
 <main>
  <section className="intro"><p className="eyebrow">TokenPlan · 交互演示</p><h1>用你喜欢的方式，<br/>查看 AI 用量。</h1><p className="lede">在菜单栏或系统托盘，集中查看订阅额度、余额与用量。</p><p className="sample">所有读数均为示例数据，不连接真实账号。</p></section>
  <section className="hero-demo" aria-label="用量样式动画"><div id="cover-capture" data-cover-card><TokenPlanCover/></div><p>将鼠标移入画面，或点击画面中的 TokenPlan 图标播放。<br/>开启“减少动态效果”时显示静态画面。</p></section>
  <section id="styles"><div className="section-heading"><div><p className="eyebrow">用量样式</p><h2>同一份用量，多种展示方式。</h2></div><p>选择样式，再拖动用量滑块查看变化。</p></div>
   <div id="styles-capture"><Components/></div>
   <StyleGallery/>
  </section>
  <section id="history"><div className="section-heading"><div><p className="eyebrow">用量统计</p><h2>从每日记录，查看模型构成。</h2></div><p>切换时间范围，展开日期和服务查看明细。</p></div>
   <div id="history-capture"><TokenPlanHistory/></div>
  </section>
  <section className="end"><h2>在自己的桌面上使用 TokenPlan。</h2><p>支持 macOS、Windows 和 Linux。</p><a className="download" href={`${repo}#下载`}>下载安装包 ↗</a></section>
 </main><footer>TokenPlan · 演示数据仅用于展示 <a href="./NOTICE.txt">组件声明</a></footer>
 </div>}
createRoot(document.getElementById('root')!).render(<App/>);
