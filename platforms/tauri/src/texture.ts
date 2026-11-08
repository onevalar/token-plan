/** Framework-independent saved texture and tint choices. */
export const textures=['dither','lines','halftone','hatch'] as const;
export type Texture=typeof textures[number];
export const textureChoices=[...textures,'solid','mixed'] as const;
export type TextureChoice=typeof textureChoices[number];
export const textureAt=(choice:TextureChoice,index:number):Texture|'solid'=>choice==='mixed'?textures[index%textures.length]:choice;
export const tints=['provider','blue','green','orange','purple'] as const;
export type Tint=typeof tints[number];
const tintColors:Record<Tint,string|undefined>={provider:undefined,blue:'#3b6ff6',green:'#1f9d63',orange:'#e8730c',purple:'#7c4ddb'};
export const tintStyle=(tint:Tint):Record<string,string|undefined>=>({'--texture-tint':tintColors[tint]});
