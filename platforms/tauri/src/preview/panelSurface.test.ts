import {describe,expect,it} from 'vitest';
import {glassColors} from '../svelte/preferences.svelte';

// WCAG 2 relative luminance and contrast, written out here independently of the module.
const channel=(c:number)=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const ratio=(a:number,b:number)=>{const [x,y]=[channel(a),channel(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
// An achromatic OKLCH color has linear RGB channels L^3. Keep the foundation values exact.
const neutral=(lightness:number)=>{const linear=lightness**3;return linear<=.0031308?12.92*linear:1.055*linear**(1/2.4)-.055;};
// Valar neutral theme: light panel #fff with oklch(14.5%) text;
// dark panel oklch(14.5%) with oklch(98.5%) text. These are independent theme inputs.
// Dark glass components add up to a 12% white layer under text (preview.css); light glass layers are white.
const themes={light:{panel:1,text:neutral(.145),worst:0,lift:0},dark:{panel:neutral(.145),text:neutral(.985),worst:1,lift:.12}} as const;

describe('frosted glass legibility',()=>{
 for(const theme of ['light','dark'] as const)it(`keeps ${theme} secondary and muted text at AA over the worst backdrop`,()=>{
  const t=themes[theme];
  let previousTint=101;
  for(let transparency=0;transparency<=100;transparency+=5){
   const c=glassColors(theme,transparency),tint=c.tint/100;
   const panel=tint*t.panel+(1-tint)*t.worst,backdrop=panel+t.lift*(1-panel);
   const text=(opacity:number)=>opacity/100*t.text+(1-opacity/100)*backdrop;
   expect(c.tint).toBeLessThan(previousTint);previousTint=c.tint;
   expect(ratio(text(c.muted),backdrop)).toBeGreaterThanOrEqual(4.5);
   expect(ratio(text(c.secondary),backdrop)).toBeGreaterThanOrEqual(4.5);
   expect(ratio(t.text,backdrop)).toBeGreaterThanOrEqual(4.5);
   expect(c.secondary).toBeGreaterThanOrEqual(c.muted);
   expect(c.secondary).toBeLessThan(100);
  }
 });
 for(const theme of ['light','dark'] as const)it(`keeps emitted ${theme} status text at AA and usage meters at 3:1 over the worst backdrop`,()=>{
  const t=themes[theme],luminance=([r,g,b]:number[])=>.2126*channel(r!)+.7152*channel(g!)+.0722*channel(b!);
  const contrast=(a:number,b:number)=>{const [x,y]=[a,b].sort((p,q)=>q-p);return (x!+.05)/(y!+.05);};
  for(let transparency=0;transparency<=100;transparency+=5){
   const c=glassColors(theme,transparency),tint=c.tint/100;
   const panel=tint*t.panel+(1-tint)*t.worst,backdrop=channel(panel+t.lift*(1-panel));
   // The hook emits integer rgb() channels. Check those, not the pre-serialization floats.
   for(const [name,{color}] of Object.entries(c.status)){
    const emitted=color.map(v=>Math.round(v*255)/255);
    expect(contrast(luminance(emitted),backdrop),`${theme} ${transparency} ${name}`).toBeGreaterThanOrEqual(name==='usage'?3:4.5);
   }
  }
  // At the lowest offered transparency the colors are still mostly their own hue, not the text color.
  for(const {mix} of Object.values(glassColors(theme,20).status))expect(mix).toBeLessThanOrEqual(40);
 });
 it('shows more of the backdrop as transparency rises, and none at 0%',()=>{
  expect(glassColors('light',0).tint).toBe(100);
  // A medium setting must not hide an already-tinted native material behind a near-solid page.
  expect(glassColors('light',60).tint).toBeLessThan(70);
  expect(glassColors('dark',60).tint).toBeLessThan(82);
  expect(glassColors('light',100).tint).toBeLessThan(65);
  expect(glassColors('dark',100).tint).toBeLessThan(80);
 });
});
