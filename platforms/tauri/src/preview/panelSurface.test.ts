import {describe,expect,it} from 'vitest';
import {glassColors} from './panelSurface';

// WCAG 2 relative luminance and contrast, written out here independently of the module.
const channel=(c:number)=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4;
const ratio=(a:number,b:number)=>{const [x,y]=[channel(a),channel(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05);};
// Arc foundation: light panel #fff with oklch(15%) text; dark panel oklch(19%) with oklch(96%) text.
// Dark glass components add up to a 12% white layer under text (preview.css); light glass layers are white.
const themes={light:{panel:1,text:.0439,worst:0,lift:0},dark:{panel:.0771,text:.948,worst:1,lift:.12}} as const;

describe('frosted glass legibility',()=>{
 for(const theme of ['light','dark'] as const)it(`keeps ${theme} secondary and muted text at AA over the worst backdrop`,()=>{
  const t=themes[theme];
  let previousTint=101;
  for(let transparency=0;transparency<=100;transparency+=5){
   const c=glassColors(theme,transparency),tint=c.tint/100;
   const panel=tint*t.panel+(1-tint)*t.worst,backdrop=panel+t.lift*(1-panel);
   const text=(opacity:number)=>opacity/100*t.text+(1-opacity/100)*backdrop;
   expect(c.tint).toBeLessThan(previousTint);previousTint=c.tint;
   expect(ratio(text(c.muted),backdrop)).toBeGreaterThanOrEqual(4.4);
   expect(ratio(t.text,backdrop)).toBeGreaterThanOrEqual(4.5);
   expect(c.secondary).toBeGreaterThanOrEqual(c.muted);
   expect(c.secondary).toBeLessThan(100);
  }
 });
 for(const theme of ['light','dark'] as const)it(`keeps ${theme} status text at AA and usage meters at 3:1 over the worst backdrop`,()=>{
  const t=themes[theme],luminance=([r,g,b]:number[])=>.2126*channel(r!)+.7152*channel(g!)+.0722*channel(b!);
  const contrast=(a:number,b:number)=>{const [x,y]=[a,b].sort((p,q)=>q-p);return (x!+.05)/(y!+.05);};
  for(let transparency=0;transparency<=100;transparency+=5){
   const c=glassColors(theme,transparency),tint=c.tint/100;
   const panel=tint*t.panel+(1-tint)*t.worst,backdrop=channel(panel+t.lift*(1-panel));
   for(const name of ['success','warning','danger'] as const)expect(contrast(luminance(c.status[name].color),backdrop)).toBeGreaterThanOrEqual(4.5);
   expect(contrast(luminance(c.status.usage.color),backdrop)).toBeGreaterThanOrEqual(3);
  }
  // At the lowest offered transparency the colors are still mostly their own hue, not the text color.
  for(const {mix} of Object.values(glassColors(theme,20).status))expect(mix).toBeLessThanOrEqual(40);
 });
 it('shows more of the backdrop as transparency rises, and none at 0%',()=>{
  expect(glassColors('light',0).tint).toBe(100);
  expect(glassColors('light',100).tint).toBeLessThan(65);
  expect(glassColors('dark',100).tint).toBeLessThan(80);
 });
});
