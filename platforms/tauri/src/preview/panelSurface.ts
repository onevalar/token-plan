import {useEffect,useState} from 'react';

/** How the panel background looks. More styles can be added here later. 'glass' is the system's
 * own blur material: frosted glass (vibrancy) on macOS, acrylic on Windows. */
export type PanelStyle='glass'|'solid';
export type PanelSurface={style:PanelStyle;transparency:number};
type Theme='light'|'dark';

const key='tokenplan.panelSurface';
export const defaultSurface:PanelSurface={style:'glass',transparency:60};
/** The blur material each system offers, by its own name. Linux desktops have no common one. */
export const glassMaterial=(platform:string)=>platform==='macos'?'Frosted Glass':platform==='windows'?'Acrylic':null;
const glassSupported=(platform:string)=>glassMaterial(platform)!==null;

// The opaque panel colors from Arc's foundation tokens, as sRGB channel values.
const srgb=(okLightness:number)=>{const y=okLightness**3;return y<=.0031308?12.92*y:1.055*y**(1/2.4)-.055;};
// lift: the strongest translucent component layer text can sit on (see preview.css). On light glass
// the layers are white, which only helps dark text; on dark glass a 12% white layer lightens it.
const palette={light:{tint:srgb(1),text:srgb(.15),worst:0,lift:0},dark:{tint:srgb(.19),text:srgb(.96),worst:1,lift:.12}};
/** The least panel tint each theme keeps at 100% transparency, so text stays legible over any backdrop. */
const minimumTint={light:.58,dark:.74};
const luminance=(c:number)=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const contrast=(a:number,b:number)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

/**
 * The panel cannot see what is behind its window, so text is checked against the worst case:
 * a black backdrop under the light panel and a white one under the dark panel. Secondary and muted
 * text are drawn as see-through foreground so they pick up the backdrop's color, with the least
 * opacity that still meets WCAG AA (4.5:1) in that worst case, including on the brightest component layer.
 */
export function glassColors(theme:Theme,transparency:number) {
 const p=palette[theme],tint=1-Math.min(100,Math.max(0,transparency))/100*(1-minimumTint[theme]);
 const panel=tint*p.tint+(1-tint)*p.worst,backdrop=panel+p.lift*(1-panel);
 const opacity=(target:number)=>{for(let o=0;o<=100;o++)if(contrast(o/100*p.text+(1-o/100)*backdrop,backdrop)>=target)return o;return 100;};
 const strongest=contrast(p.text,backdrop);
 return {tint:Math.round(tint*100),secondary:opacity(Math.max(4.5,Math.min(7,strongest*.85))),muted:opacity(4.5),worstContrast:strongest};
}

function read():PanelSurface {
 try {
  const saved=JSON.parse(localStorage.getItem(key)??'null') as Partial<PanelSurface>|null;
  return {style:saved?.style==='solid'?'solid':'glass',transparency:typeof saved?.transparency==='number'?Math.min(100,Math.max(0,saved.transparency)):defaultSurface.transparency};
 } catch {return defaultSurface;}
}

/** Local to this device, like Density. Applies the chosen surface to the panel. */
export function usePanelSurface(platform:string) {
 const [surface,setSurface]=useState(read),[failed,setFailed]=useState(false);
 const change=(patch:Partial<PanelSurface>)=>{
  const next={...surface,...patch};setSurface(next);
  try {localStorage.setItem(key,JSON.stringify(next));setFailed(false);} catch {setFailed(true);}
 };
 useEffect(()=>{
  const root=document.documentElement,reduced=matchMedia('(prefers-reduced-transparency: reduce)');
  const apply=()=>{
   const glass=surface.style==='glass'&&glassSupported(platform)&&!reduced.matches;
   root.dataset.panel=glass?'glass':'solid';
   for(const theme of ['light','dark'] as const){
    const c=glassColors(theme,surface.transparency);
    root.style.setProperty(`--panel-tint-${theme}`,`${c.tint}%`);
    root.style.setProperty(`--glass-secondary-${theme}`,`${c.secondary}%`);
    root.style.setProperty(`--glass-muted-${theme}`,`${c.muted}%`);
   }
  };
  apply();reduced.addEventListener('change',apply);
  return()=>reduced.removeEventListener('change',apply);
 },[surface,platform]);
 // Without a blur material (Linux) the style list would hold only Solid, so the setting is not offered.
 return {surface,change,failed,material:glassMaterial(platform)};
}
