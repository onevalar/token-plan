import {readFileSync,writeFileSync} from 'node:fs';
const tables={};
for(const locale of ['zh-Hans','zh-Hant','ja','ko']){
 const source=readFileSync(new URL(`../../../Localization/${locale}.lproj/Localizable.strings`,import.meta.url),'utf8');
 tables[locale]=Object.fromEntries([...source.matchAll(/"((?:[^"\\]|\\.)*)"\s*=\s*"((?:[^"\\]|\\.)*)";/g)].map(m=>[JSON.parse(`"${m[1]}"`),JSON.parse(`"${m[2]}"`)]));
}
writeFileSync(new URL('../src/provider-translations.json',import.meta.url),JSON.stringify(tables)+'\n');
