import {accountSchema, metricSchema, type Account} from '../../src/desktop';

export const now = Date.parse('2026-10-22T09:45:00Z');
export const scenarios = [
 {value:'normal', label:'正常资料'},
 {value:'missing', label:'多字段缺失'},
 {value:'empty-note', label:'空备注'},
 {value:'long', label:'长账号名、邮箱和套餐'},
 {value:'multiline', label:'多行长备注'},
 {value:'forty', label:'40 行备注'},
 {value:'error', label:'读取错误'},
 {value:'warning', label:'长警告'},
 {value:'no-time', label:'无更新时间'},
];

const quota = metricSchema.parse({
 id:'codex.session', label:'Session', placement:'details', pinned:false, pinnable:false,
 hasData:true, unit:'percent', percent:37, amount:null, periodSeconds:18000,
 resetsAt:'2026-10-22T12:15:00Z', values:[],
});
const balance = metricSchema.parse({
 id:'codex.credits', label:'Credits', placement:'details', pinned:false, pinnable:false,
 hasData:true, unit:'credits', percent:null, amount:63000, periodSeconds:null,
 resetsAt:null, values:[{amount:126.85, unit:'dollars', label:''},{amount:63000, unit:'credits', label:'Credits'}],
});

// Synthetic, schema-checked snapshots, not people, credentials, or live service responses.
export function accountFor(scenario: string): Account {
 const account = accountSchema.parse({
  id:'profile-example', family:'codex', name:'Codex', email:'usage-demo@example.com', plan:'Plus',
  enabled:true, tray:false, removable:false, apiKey:false, error:'',
  note:'这个账号用于个人开发项目。请结合当前额度查看用量。',
  fetchedAt:'2026-10-22T09:42:00Z', metrics:[quota, balance], history:[],
 });
 if (scenario === 'missing') Object.assign(account, {email:'', plan:'', note:'', fetchedAt:'', metrics:[]});
 if (scenario === 'empty-note') account.note = '';
 if (scenario === 'no-time') account.fetchedAt = '';
 if (scenario === 'long') Object.assign(account, {
  name:'Codex · 用于跨区域开发环境与长期维护项目的示例账号',
  email:'development.usage.observation.for.long.running.projects+account-profile-comparison@example.com',
  plan:'Business · 跨团队共享开发环境的长名称套餐示例（不代表真实订阅）',
 });
 if (scenario === 'multiline') account.note = [
  '这个账号用于维护多个开发项目。备注只是已有文本，不是账号设置，也不代表连接已成功。',
  '本周重点：检查较长的中英文混排文本是否能完整阅读；产品名称与邮箱保持可选择复制。',
  '补充说明：当前额度和余额仍使用相同的只读片段，资料样式不会改动刷新行为。',
  'Project context: compare account information, not billing, renewal dates, or connection health.',
 ].join('\n\n');
 if (scenario === 'forty') account.note = Array.from({length:40}, (_, i) =>
  `第 ${String(i+1).padStart(2,'0')} 行：这是一段用于检查滚动阅读的示例备注；不会保存到真实账号。`
 ).join('\n');
 if (scenario === 'error') {
  account.error = '无法读取账号用量。请在正式应用中检查登录状态后重试。这里是只读错误示例，不会执行登录或刷新。';
  account.metrics = account.metrics.map(metric => ({...metric, hasData:false}));
 }
 if (scenario === 'warning') account.warning = '部分用量暂时未返回，已显示的数据可能不完整。请稍后在正式应用中刷新；这个提示与上次更新时间是两件事，不能据此判断账号是否连接失效。长警告应一直可以完整阅读，不会藏进备注折叠区。';
 return account;
}
