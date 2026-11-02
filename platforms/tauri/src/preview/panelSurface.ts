import {useEffect,useState} from 'react';
import {Effect,getCurrentWindow} from '@tauri-apps/api/window';

/** How the panel background looks. More styles can be added here later. 'glass' is the system's
 * own blur material: frosted glass (vibrancy) on macOS, acrylic on Windows. */
export type PanelStyle='glass'|'solid';
export type PanelSurface={style:PanelStyle;transparency:number};
type Theme='light'|'dark';
type Channels=[number,number,number];

const key='tokenplan.panelSurface';
/** The lowest Transparency offered; below it the glass would look the same as Solid. */
export const minimumTransparency=20;
export const defaultSurface:PanelSurface={style:'glass',transparency:60};
/** The blur material each system offers, by its own name. Linux desktops have no common one. */
export const glassMaterial=(platform:string)=>platform==='macos'?'Frosted Glass':platform==='windows'?'Acrylic':null;
const glassSupported=(platform:string)=>glassMaterial(platform)!==null;
const clampTransparency=(value:number)=>Math.min(100,Math.max(minimumTransparency,value));

// Arc's foundation tokens (foundation.css) and the default usage color (style.css), as sRGB channels.
const encode=(c:number)=>{c=Math.min(1,Math.max(0,c));return c<=.0031308?12.92*c:1.055*c**(1/2.4)-.055;};
const oklch=(l:number,c:number,h:number):Channels=>{
 const a=c*Math.cos(h*Math.PI/180),b=c*Math.sin(h*Math.PI/180);
 const L=(l+.3963377774*a+.2158037573*b)**3,M=(l-.1055613458*a-.0638541728*b)**3,S=(l-.0894841775*a-1.291485548*b)**3;
 return [encode(4.0767416621*L-3.3077115913*M+.2309699292*S),encode(-1.2684380046*L+2.6097574011*M-.3413193965*S),encode(-.0041960863*L-.7034186147*M+1.707612701*S)];
};
const hex=(value:string):Channels=>[1,3,5].map(i=>parseInt(value.slice(i,i+2),16)/255) as Channels;
// lift: the strongest translucent component layer text can sit on (see preview.css). On light glass
// the layers are white, which only helps dark text; on dark glass a 12% white layer lightens it.
const palette={
 light:{tint:oklch(1,0,0)[0],text:oklch(.15,0,0)[0],worst:0,lift:0,status:{success:oklch(.49,.19,150),warning:oklch(.58,.18,75),danger:oklch(.54,.21,25),usage:hex('#326fce')}},
 dark:{tint:oklch(.19,0,0)[0],text:oklch(.96,0,0)[0],worst:1,lift:.12,status:{success:oklch(.78,.18,150),warning:oklch(.83,.17,80),danger:oklch(.76,.2,25),usage:hex('#578fe6')}},
};
/** Status colors are text (4.5:1); the usage color fills meters next to their value text, so it needs the graphics minimum (3:1). */
const statusTarget={success:4.5,warning:4.5,danger:4.5,usage:3};
export type StatusColor=keyof typeof statusTarget;
/** The least panel tint each theme keeps at 100% transparency, so text stays legible over any backdrop. */
const minimumTint={light:.58,dark:.74};
const luminance=(c:number)=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const relative=([r,g,b]:Channels)=>.2126*luminance(r)+.7152*luminance(g)+.0722*luminance(b);
const ratio=(a:number,b:number)=>(Math.max(a,b)+.05)/(Math.min(a,b)+.05);

/**
 * The panel cannot see what is behind its window, so text is checked against the worst case:
 * a black backdrop under the light panel and a white one under the dark panel. Secondary and muted
 * text are drawn as see-through foreground so they pick up the backdrop's color, with the least
 * opacity that still meets WCAG AA (4.5:1) in that worst case, including on the brightest component layer.
 * Status and usage colors are mixed toward the text color by the least amount that meets their target there.
 */
export function glassColors(theme:Theme,transparency:number) {
 // Rounded the way the CSS applies it, so contrast is checked against the tint actually drawn.
 const p=palette[theme],tint=Math.round(100-Math.min(100,Math.max(0,transparency))*(1-minimumTint[theme]))/100;
 const panel=tint*p.tint+(1-tint)*p.worst,backdrop=panel+p.lift*(1-panel),back=luminance(backdrop);
 const opacity=(target:number)=>{for(let o=0;o<=100;o++)if(ratio(luminance(o/100*p.text+(1-o/100)*backdrop),back)>=target)return o;return 100;};
 const strongest=ratio(luminance(p.text),back);
 const status=Object.fromEntries((Object.keys(statusTarget) as StatusColor[]).map(name=>{
  const at=(mix:number)=>p.status[name].map(c=>mix/100*p.text+(1-mix/100)*c) as Channels;
  let mix=0;while(mix<100&&ratio(relative(at(mix)),back)<statusTarget[name])mix++;
  return [name,{mix,color:at(mix)}];
 })) as Record<StatusColor,{mix:number;color:Channels}>;
 return {tint:Math.round(tint*100),secondary:opacity(Math.max(4.5,Math.min(7,strongest*.85))),muted:opacity(4.5),worstContrast:strongest,status};
}

function read():PanelSurface {
 try {
  const saved=JSON.parse(localStorage.getItem(key)??'null') as Partial<PanelSurface>|null;
  return {style:saved?.style==='solid'?'solid':'glass',transparency:typeof saved?.transparency==='number'?clampTransparency(saved.transparency):defaultSurface.transparency};
 } catch {return defaultSurface;}
}
const reducedQuery=()=>matchMedia('(prefers-reduced-transparency: reduce)');

/** Local to this device, like Density. Applies the chosen surface to the panel. */
export function usePanelSurface(platform:string) {
 const [surface,setSurface]=useState(read),[failed,setFailed]=useState(false),[reduced,setReduced]=useState(()=>reducedQuery().matches);
 const change=(patch:Partial<PanelSurface>)=>{
  const next={...surface,...patch};setSurface(next);
  try {localStorage.setItem(key,JSON.stringify(next));setFailed(false);} catch {setFailed(true);}
 };
 useEffect(()=>{
  const query=reducedQuery(),update=()=>setReduced(query.matches);
  update();query.addEventListener('change',update);
  return()=>query.removeEventListener('change',update);
 },[]);
 const glass=surface.style==='glass'&&glassSupported(platform)&&!reduced;
 useEffect(()=>{
  const root=document.documentElement;
  root.dataset.panel=glass?'glass':'solid';
  for(const theme of ['light','dark'] as const){
   const c=glassColors(theme,surface.transparency);
   root.style.setProperty(`--panel-tint-${theme}`,`${c.tint}%`);
   root.style.setProperty(`--glass-secondary-${theme}`,`${c.secondary}%`);
   root.style.setProperty(`--glass-muted-${theme}`,`${c.muted}%`);
   for(const [name,{color}] of Object.entries(c.status))root.style.setProperty(`--glass-${name}-${theme}`,`rgb(${color.map(v=>Math.round(v*255)).join(' ')})`);
  }
 },[glass,surface.transparency]);
 // Windows draws acrylic for the whole window even under an opaque page, so it is turned off when unused.
 // macOS keeps its vibrancy under the opaque page.
 useEffect(()=>{
  if(platform!=='windows')return;
  void (async()=>{const panel=getCurrentWindow();await (glass?panel.setEffects({effects:[Effect.Acrylic]}):panel.clearEffects());})()
   .catch(e=>console.error('Panel window effect could not be changed',e));
 },[platform,glass]);
 // Without a blur material (Linux) the style list would hold only Solid, so the setting is not offered.
 return {surface,change,failed,reduced,material:glassMaterial(platform)};
}
