import type {Metric} from '../../desktop';
import type {MetricRowProps} from '../../metric';
import {preciseQuotaReading} from '../../homeUsage';
import type {HomeQuotaDesign} from '../../homeUsage';

export type Reading=ReturnType<typeof preciseQuotaReading>;
export type ReadingProps=Omit<MetricRowProps,'metric'>;
export type Disclosure={selected:string|null;detailId:string;onSelect:(metricId:string,trigger:HTMLButtonElement)=>void};
export type DesignProps=ReadingProps&Disclosure&{metrics:Metric[];variant:HomeQuotaDesign['variant']};
export type SourceShare={name:string;share:number};
export const clamp=(value:number)=>Math.max(0,Math.min(100,value));
export function metricAttributes(metric:Metric,r:Reading) {
 return {'data-metric':metric.id,'data-kind':'quota','data-value':r.value??'unknown','data-used':r.used??'unknown','data-tone':r.tone};
}
export function point(angle:number,r:number,cx=80,cy=80) {
 const a=angle*Math.PI/180;return {x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};
}
export function arcPath(from:number,to:number,r:number,cx=80,cy=80) {
 const a=point(from,r,cx,cy),b=point(to,r,cx,cy);
 return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to-from>180?1:0} 1 ${b.x} ${b.y}`;
}
/** Svelte style attributes accept CSS text, not React style objects. */
export const cssText=(style:Record<string,string|number|undefined>)=>Object.entries(style).filter(([,v])=>v!==undefined).map(([k,v])=>`${k.replace(/[A-Z]/g,m=>`-${m.toLowerCase()}`)}:${v}`).join(';');
