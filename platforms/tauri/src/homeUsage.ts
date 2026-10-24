import type {MetricRowProps} from './Metrics';
import {metricName,usageTone} from './Metrics';
import {providerText} from './providerText';

/**
 * A Home style is a string: `family`, or `family:option:option`. Saved choices from before the options existed
 * (bars, gauges, cells, rings, ruler, concentric, numbers, segments, ticks) stay valid and keep their look.
 */
export const homeUsageFamilies={bars:'Bars',ruler:'Quota Ruler',cells:'Cells',rings:'Rings',gauges:'Gauges',numbers:'Numbers',vessel:'Containers',frame:'Border Progress',sources:'Source Split',columns:'Side-by-Side Columns',signal:'Status Lights',rowfill:'Row Fill'} as const;
export type HomeUsageFamily=keyof typeof homeUsageFamilies;
export type HomeUsageStyle=string;
export type CellShape='square'|'capsule'|'rising';
export type VesselShape='battery'|'tank'|'thermometer'|'hourglass';
export type StyleSpec={family:HomeUsageFamily;root:string;forecast:boolean;shape:CellShape;count:5|10|20;vessel:VesselShape};

const cellShapes:CellShape[]=['square','capsule','rising'],cellCounts=[5,10,20] as const,vessels:VesselShape[]=['battery','tank','thermometer','hourglass'];
export function parseStyle(id:string):StyleSpec|null {
 const [root,a,b,...extra]=id.split(':');
 const spec=(family:HomeUsageFamily,patch:Partial<StyleSpec>={}):StyleSpec=>({family,root,forecast:false,shape:'square',count:20,vessel:'battery',...patch});
 if(extra.length)return null;
 switch(root){
  case 'bars':case 'ruler':return a===undefined?spec(root):a==='forecast'&&b===undefined?spec(root,{forecast:true}):null;
  case 'cells':case 'gauges':case 'numbers':case 'rings':case 'concentric':case 'ticks':case 'frame':case 'sources':case 'columns':case 'signal':case 'rowfill':
   if(a!==undefined)return null;
   return spec(root==='concentric'||root==='ticks'?'rings':root);
  case 'segments':{
   if(a===undefined)return spec('cells');
   const count=Number(b);
   return cellShapes.includes(a as CellShape)&&(b===undefined||cellCounts.includes(count as 5))?spec('cells',{shape:a as CellShape,count:(b===undefined?20:count) as 5|10|20}):null;
  }
  case 'vessel':return a===undefined?spec('vessel'):vessels.includes(a as VesselShape)&&b===undefined?spec('vessel',{vessel:a as VesselShape}):null;
  default:return null;
 }
}
export function isHomeUsageStyle(value:string):value is HomeUsageStyle {return parseStyle(value)!==null;}
export function familyOf(id:string):HomeUsageFamily {return parseStyle(id)?.family??'bars';}
/** The style a family starts with when it is first picked. */
export function defaultStyle(family:HomeUsageFamily):HomeUsageStyle {return family==='cells'?'cells':family;}

export type StyleChoice={label:string;id:HomeUsageStyle};
export type StyleOptionGroup={name:string;choices:StyleChoice[]};
/** The options a style offers, each as the full style it would select. The choice matching `id` is marked by the caller. */
export function styleOptions(id:string):StyleOptionGroup[] {
 const spec=parseStyle(id);if(!spec)return [];
 const {family,root}=spec;
 if(family==='bars'||family==='ruler')return [{name:'Forecast',choices:[{label:'Off',id:family},{label:'Show Forecast',id:`${family}:forecast`}]}];
 if(family==='rings')return [{name:'Rings',choices:[{label:'Single Ring',id:'rings'},{label:'Double Ring',id:'concentric'},{label:'Ticks',id:'ticks'}]}];
 if(family==='vessel')return [{name:'Shape',choices:[{label:'Battery',id:'vessel'},{label:'Tank',id:'vessel:tank'},{label:'Thermometer',id:'vessel:thermometer'},{label:'Hourglass',id:'vessel:hourglass'}]}];
 if(family==='cells'){
  const single=root!=='cells',layout:StyleOptionGroup={name:'Layout',choices:[{label:'Grid',id:'cells'},{label:'Single Row',id:segs(spec.shape,spec.count)}]};
  return single?[layout,{name:'Shape',choices:cellShapes.map(s=>({label:{square:'Squares',capsule:'Capsules',rising:'Rising Bars'}[s],id:segs(s,spec.count)}))},
   {name:'Cell Count',choices:cellCounts.map(n=>({label:String(n),id:segs(spec.shape,n)}))}]:[layout];
 }
 return [];
}
const segs=(shape:CellShape,count:number)=>shape==='square'&&count===20?'segments':`segments:${shape}:${count}`;
/** One spelling per look, so `segments` and `segments:square:20` compare equal. */
export function canonicalStyle(id:string) {
 const spec=parseStyle(id);
 return spec&&spec.family==='cells'&&spec.root!=='cells'?segs(spec.shape,spec.count):id;
}
export function styleLabel(id:string) {
 const spec=parseStyle(id);if(!spec)return id;
 if(spec.root==='concentric')return 'Concentric Rings';
 if(spec.root==='ticks')return 'Tick Ring';
 return homeUsageFamilies[spec.family];
}

export function quotaReading({metric:m,language,missing,remaining=false}:MetricRowProps) {
 const tr=(s:string)=>providerText(s,language),name=metricName(m,language),mode=tr(remaining?'Remaining':'Used');
 // The helper already converted percent to the chosen mode. Only danger uses actual consumption.
 const value=m.hasData?m.percent:null,used=value===null?null:remaining?100-value:value;
 const tone=value===null?'normal':usageTone(value,remaining),label=`${name} · ${mode}`;
 const warning=used===null?'':used>100?tr('Quota exceeded'):used===100?tr('Quota exhausted'):tone==='critical'?tr('Near quota limit'):'';
 const valueText=value===null?missing:`${Math.round(value)}%`,description=[valueText,warning].filter(Boolean).join(' · ');
 return {value,used,tone,name,mode,label,warning,valueText,description};
}

export function quotaMeter(reading:ReturnType<typeof quotaReading>) {
 return reading.value===null?{}:{role:'meter' as const,'aria-label':reading.label,'aria-valuemin':0,'aria-valuemax':100,
  'aria-valuenow':Math.max(0,Math.min(100,reading.value)),'aria-valuetext':reading.description};
}

/**
 * Used share expected by the end of the window if the pace so far continues, or null when the window is unknown
 * or too young (under 5% elapsed) for a pace to mean anything.
 */
export function projectedUsed(m:MetricRowProps['metric'],now:number,used:number|null) {
 if(used===null||!m.hasData||m.notStarted||!m.resetsAt||!m.periodSeconds||m.periodSeconds<=0||!now)return null;
 const span=m.periodSeconds*1000,end=Date.parse(m.resetsAt);
 if(!Number.isFinite(end))return null;
 const elapsed=1-(end-now)/span;
 return elapsed<0.05||elapsed>1?null:Math.max(used,used/elapsed);
}

/** Calm, watch, or critical, in step with the existing 80% warning line. */
export function usageLevel(used:number|null):'calm'|'watch'|'critical' {
 return used===null||used<50?'calm':used<80?'watch':'critical';
}

/** Where the striped forecast sits on a bar that fills with the shown reading: after the used part, or before the remaining part. */
export function forecastSpan(used:number,projected:number,remaining:boolean) {
 const u=Math.max(0,Math.min(100,used)),f=Math.max(u,Math.min(100,projected));
 return remaining?{left:`${100-f}%`,width:`${f-u}%`}:{left:`${u}%`,width:`${f-u}%`};
}

export function sameLook(a:string,b:string) {return canonicalStyle(a)===canonicalStyle(b);}
