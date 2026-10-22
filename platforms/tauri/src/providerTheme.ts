import type {CSSProperties} from 'react';

// Stable service identities, independent of account order. Neutral brands receive
// an application accent; these are interface colors, not replacements for brand assets.
const colors:Record<string,[string,string]>={
 claude:['#bf5639','#ed997d'],codex:['#087f73','#53c7b5'],
 antigravity:['#326fce','#79a7f5'],cursor:['#6752b8','#b6a0ed'],
 opencode:['#5267ad','#9baef0'],grok:['#53677e','#a4bad0'],
 copilot:['#8652bd','#c098ec'],amp:['#c64d3b','#f18b79'],
 deepseek:['#3d60d2','#91a6ff'],devin:['#147b91','#6bc5d5'],
 moonshot:['#3268d6','#8aacf5'],kimi:['#3268d6','#8aacf5'],
 minimax:['#bd426b','#ef8fac'],openrouter:['#6655c4','#afa2f3'],
 siliconflow:['#7954c0','#bc9af0'],ollama:['#647353','#b4c69d'],
 zai:['#526e9d','#a2bbe4'],
};
export function providerTheme(family:string):CSSProperties {
 const [light,dark]=colors[family]??['#526e9d','#a2bbe4'];
 return {'--provider-light':light,'--provider-dark':dark} as CSSProperties;
}
