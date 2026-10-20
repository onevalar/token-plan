import translations from './provider-translations.json';
const tables=translations as Record<string,Record<string,string>>;
const escape=(s:string)=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function providerText(text:string,locale:string) {
 const language=/zh.*(TW|HK|Hant)/i.test(locale)?'zh-Hant':locale.startsWith('zh')?'zh-Hans':locale.split('-')[0];
 const table=tables[language];if(!table)return text;if(table[text])return table[text];
 // Native retry notices may have already interpolated their duration. Preserve the
 // captured values while translating the format, including reordered placeholders.
 for(const [key,translated] of Object.entries(table)){
  const parts=key.split(/%(?:\d+\$)?(?:lld|ld|d|@|s)/g);if(parts.length<2)continue;
  const match=text.match(new RegExp('^'+parts.map(escape).join('(.+?)')+'$'));if(!match)continue;
  let index=0;return translated.replace(/%(?:(\d+)\$)?(?:lld|ld|d|@|s)/g,(_,position)=>match[position?Number(position):++index]??'');
 }
 return text;
}
