import {HomeMetrics} from '@portfolio/v3/personal-projects/stories/token-plan-current/HomeMetrics';
import {styleCategories,variantLabel} from '@portfolio/v3/personal-projects/stories/token-plan-current/homeUsage';
import {providerText as tr} from '@portfolio/v3/personal-projects/stories/token-plan-current/providerText';
import {providerTheme} from '@portfolio/v3/personal-projects/covers/token-plan-kit';
import {sampleQuotas,sampleReading} from '@portfolio/v3/personal-projects/covers/token-plan-samples';
import './gallery.css';
// Keep the original renderers and sample data. Only the comparison sheet is new.
const groups=[...styleCategories.slice(0,4).map(c=>({id:c.id,title:tr(c.label),items:c.styles.map(style=>({style,label:tr(variantLabel(style))}))})),
 {id:'more',title:'更多用量样式',items:styleCategories.slice(4).map(c=>({style:c.styles[0],label:tr(c.label)}))},
 {id:'textures',title:'底纹横条 · 版式与底纹',items:[
  {style:'texturebar:card:dither',label:'整行卡片 · 像素网格'},
  {style:'texturebar:half:dither',label:'半宽横条 · 像素网格'},
  {style:'texturebar:row:lines',label:'横条 · 竖线'},
  {style:'texturebar:row:halftone',label:'横条 · 半调圆点'},
  {style:'texturebar:row:hatch',label:'横条 · 斜线'},
  {style:'texturebar:row:solid',label:'横条 · 纯色'},
 ]}];
export function StyleGallery(){return <div id="style-gallery" className="style-gallery tp-native-theme">
 {groups.map(group=><section className="gallery-sheet" id={`gallery-${group.id}`} key={group.id}>
  <header><h3>{group.title}</h3><span>示例数据</span></header>
  <div className="gallery-grid">{group.items.map(item=><article className="gallery-item" key={item.style} data-gallery-style={item.style}>
   <h4>{item.label}</h4><div className="tp-kit tp-current" data-provider="claude" style={providerTheme('claude')}><div className="gallery-metrics">
    <HomeMetrics metrics={sampleQuotas([68,35])} style={item.style} {...sampleReading} sources={[{name:'Sonnet',share:.65},{name:'Opus',share:.35}]}/>
   </div></div>
  </article>)}</div>
 </section>)}
</div>}
