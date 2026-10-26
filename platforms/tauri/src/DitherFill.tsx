import {useEffect,useRef} from 'react';

/**
 * Row Fill texture: solid colour up to the reading, a texture after it, and a band where the texture grows into the
 * solid colour. Changes ease in with a spring, and fast changes stretch the band. Decorative: the caller owns the meter.
 */
export const textures=['dither','lines','halftone','hatch'] as const;
export type Texture=typeof textures[number];
/** A saved texture choice: a texture, a plain `solid` fill, or `mixed` to give each metric the next texture in turn. */
export const textureChoices=[...textures,'solid','mixed'] as const;
export type TextureChoice=typeof textureChoices[number];
export const textureAt=(choice:TextureChoice,index:number):Texture|'solid'=>choice==='mixed'?textures[index%textures.length]:choice;
/** Texture colour; `provider` follows the service colour. Near-limit readings still turn red. */
export const tints=['provider','blue','green','orange','purple'] as const;
export type Tint=typeof tints[number];
const tintColors:Record<Tint,string|undefined>={provider:undefined,blue:'#3b6ff6',green:'#1f9d63',orange:'#e8730c',purple:'#7c4ddb'};
export const tintStyle=(tint:Tint)=>({'--texture-tint':tintColors[tint]}) as React.CSSProperties;

const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5],BAND=46,STIFFNESS=140,TRACK=.55;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
const lerp=(a:number,b:number,t:number)=>a+(b-a)*t;
const smooth=(a:number,b:number,x:number)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
// Each returns how much of the pixel at (x,y) is covered when the fill amount there is c (0 empty … 1 solid).
const cover:Record<Texture|'solid',(x:number,y:number,c:number,px:number)=>number>={
 dither(x,y,c){
  const s=3.5,i=Math.floor(x/s),j=Math.floor(y/s);
  if(BAYER[(j&3)*4+(i&3)]/16>=lerp(4.5,16.5,c)/16)return 0;
  const size=s*lerp(.62,1.01,smooth(.55,.95,c));return x-i*s<size&&y-j*s<size?1:0;
 },
 lines(x,y,c,px){return clamp((lerp(1,4.2,Math.pow(c,1.6))-Math.abs((x%8)-4))/px+.5,0,1);},
 halftone(x,y,c,px){
  const p=5,r=lerp(1.05,3.4,c),j0=Math.floor(y/p);let d=1e9;
  for(let j=j0-1;j<=j0+1;j++){
   const off=(j&1)?p/2:0,cx=Math.round((x-off-p/2)/p)*p+off+p/2,cy=j*p+p/2;
   for(const dx of [-p,0,p])d=Math.min(d,Math.hypot(x-cx-dx,y-cy));
  }
  return clamp((r-d)/px+.5,0,1);
 },
 solid(x,y,c){return c>=.5?1:0;},
 hatch(x,y,c,px){const u=(((x+y)%8)+8)%8;return clamp((lerp(.7,3,Math.pow(c,1.4))-Math.abs(u-4)/Math.SQRT2)/px+.5,0,1);},
};
function rgb(css:string) {
 const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d')!;
 x.fillStyle=css;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data.slice(0,3)];
}

export function DitherFill({value,texture,className,intro=false}:{value:number;texture:Texture|'solid';className:string;intro?:boolean}) {
 const wrap=useRef<HTMLSpanElement>(null),canvas=useRef<HTMLCanvasElement>(null),target=useRef<(v:number)=>void>(()=>{});
 useEffect(()=>{
  const el=wrap.current!,cv=canvas.current!,ctx=cv.getContext('2d')!,pattern=cover[texture];
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const s={pos:intro&&!reduced?0:clamp(value/100,0,1),target:clamp(value/100,0,1),vel:0,spread:0,w:0,dpr:1,raf:0,last:0,color:'',rgb:[0,0,0]};
  let img:ImageData|null=null;
  const draw=()=>{
   if(!img)return;
   const color=getComputedStyle(el).color;if(color!==s.color){s.color=color;s.rgb=rgb(color);}
   const W=img.width,H=img.height,data=img.data,px=1/s.dpr,edge=s.pos*s.w;
   // Near 0% and 100% the band narrows, so an empty quota never looks partly used and a full one is solid to the end.
   const width=Math.min(BAND,edge*2,(s.w-edge)*2)+s.spread,center=edge-Math.sign(s.vel)*s.spread*.18;
   const lo=Math.max(center-width/2,edge*.45),hi=Math.max(lo+1e-3,center+width/2);
   const fill=new Float32Array(W),alpha=new Float32Array(W);
   for(let i=0;i<W;i++){const c=edge<=0?0:1-smooth(lo,hi,(i+.5)*px);fill[i]=c;alpha[i]=lerp(TRACK,1,smooth(.15,.85,c))*255;}
   for(let iy=0,o=0;iy<H;iy++){
    const y=(iy+.5)*px;
    for(let ix=0;ix<W;ix++,o+=4){
     const c=fill[ix];
     data[o]=s.rgb[0];data[o+1]=s.rgb[1];data[o+2]=s.rgb[2];data[o+3]=(c>.995?1:pattern((ix+.5)*px,y,c,px))*alpha[ix];
    }
   }
   ctx.putImageData(img,0,0);
  };
  const frame=(now:number)=>{
   const dt=Math.min(.033,(now-s.last)/1000);s.last=now;
   if(reduced||!s.w){s.pos=s.target;s.vel=0;}
   else{
    // Critically damped spring toward the reading; motion widens the band, which relaxes once still.
    s.vel+=(STIFFNESS*(s.target-s.pos)-2*Math.sqrt(STIFFNESS)*s.vel/s.w)*s.w*dt;s.pos+=s.vel/s.w*dt;
    if(Math.abs(s.target-s.pos)<1e-4&&Math.abs(s.vel)<.5){s.pos=s.target;s.vel=0;}
    const want=Math.min(170,Math.abs(s.vel)*.4);
    s.spread+=(want-s.spread)*(1-Math.exp(-dt*(want>s.spread?18:5)));if(!want&&s.spread<.05)s.spread=0;
   }
   draw();
   s.raf=s.pos!==s.target||s.spread>0?requestAnimationFrame(frame):0;
  };
  const kick=()=>{if(!s.raf){s.last=performance.now();s.raf=requestAnimationFrame(frame);}};
  const resize=()=>{
   const r=el.getBoundingClientRect();s.dpr=Math.min(devicePixelRatio||1,3);s.w=r.width;
   cv.width=Math.max(1,Math.round(r.width*s.dpr));cv.height=Math.max(1,Math.round(r.height*s.dpr));
   img=ctx.createImageData(cv.width,cv.height);draw();kick();
  };
  target.current=v=>{s.target=clamp(v/100,0,1);kick();};
  // Theme and tone changes recolour the texture without moving it.
  const recolor=new MutationObserver(()=>{if(!s.raf)draw();});
  recolor.observe(document.documentElement,{attributes:true});
  const observer=new ResizeObserver(resize);observer.observe(el);resize();
  return ()=>{observer.disconnect();recolor.disconnect();cancelAnimationFrame(s.raf);};
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[texture]);
 useEffect(()=>target.current(value),[value]);
 return <span ref={wrap} className={className} aria-hidden="true"><canvas ref={canvas}/></span>;
}
