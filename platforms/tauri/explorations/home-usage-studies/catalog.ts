export type Study={id:string;name:string;focus:string;description:string;tradeoff:string;try:string;reference:string};
export const families:{name:string;title:string;description:string;variants:Study[]}[]=[
 {name:'刻盘',title:'精密仪表，读数不藏起来',description:'从能源表盘借刻度和指针，而不是直接换成现有圆环。',variants:[
  {id:'A1',name:'精密双针',focus:'独立指针 · 并列双盘',description:'细针承担位置感，大数字承担精确读数，两种周期不相加。',tradeoff:'造型鲜明，但比列表占据更多高度。',try:'拖动示例读数，让指针经过 80% 和 100%；再切换剩余模式。',reference:'能源自给率仪表、赛车仪表的细针与刻线。'},
  {id:'A2',name:'侧缘刻盘',focus:'数字在前 · 刻度在边缘',description:'把刻盘退到数字右侧，形成更安静的横向仪表行。',tradeoff:'读数更快；半幅刻盘的精度仍要靠数字。',try:'比较 0.4% 与 112%，看看极小和超额读数是否仍明确。',reference:'小型控制旋钮与留白较多的仪表面板。'},
  {id:'A3',name:'主次仪表',focus:'一项放大 · 其余仍可见',description:'每个账号只放大一个刻盘，用下方列表随时切换关注项。',tradeoff:'适合三项以上额度；需要一次点击才能换大表盘。',try:'点击另一周期切换大表盘；所有小读数一直保留。',reference:'设备总览里的重点设备与其余状态列表。'},
 ]},
 {name:'电量',title:'把额度看成可读的储量',description:'从点阵、电芯和设备栅格发散；分块只是比例，不是请求次数。',variants:[
  {id:'B1',name:'点阵电芯',focus:'细密矩阵 · 数字并列',description:'柔和的圆点矩阵配横向大读数，末格可部分点亮。',tradeoff:'储量感强；细微差异仍以准确数字为准。',try:'拖动到 0.4%、38% 和 82%，观察部分点亮而非跳整格。',reference:'设备面板中的小型电量阵列与数码读数。'},
  {id:'B2',name:'斜切栅格',focus:'斜片节奏 · 宽幅读数',description:'一条宽幅斜切栅格，保留直线比例、警戒标记和重置。',tradeoff:'比普通条更有性格；高密度时纹理会更明显。',try:'切换深浅色，再把两项读数拉开到 18% / 94%。',reference:'电力设备栅格和分段备用电量。'},
  {id:'B3',name:'分仓电池',focus:'竖向储仓 · 同行对照',description:'每项额度一根独立竖向电芯，精确数值与重置在仓外。',tradeoff:'两项时清晰；长名称与三项以上会改为逐行排列。',try:'打开三项额度、同周期与余额场景，检查没有错误合仓。',reference:'备用电池储量、设备组里的多通道读数。'},
 ]},
 {name:'周期',title:'还剩多少，也看何时重置',description:'同时呈现额度与周期时间，但不把时间当成预测、不平均两种比例。',variants:[
  {id:'C1',name:'双层跑道',focus:'外圈额度 · 内圈时间',description:'一条独立额度一个跑道，内圈虚线只表示周期已过。',tradeoff:'信息完整；双轨需要清楚的文字图例。',try:'固定额度再调周期进度，只有时间轨移动；切换剩余不反转时间。',reference:'跑圈轨道中的两条平行路径。'},
  {id:'C2',name:'并行周期',focus:'对齐双轨 · 同一周期',description:'额度读数和时间读数上下对齐，直接比较两个位置。',tradeoff:'最容易解释；比纯额度横条多一行。',try:'拖动周期到 0% 和 100%，检查尚未开始与到期状态。',reference:'设备读数列表与对齐的小型状态条。'},
  {id:'C3',name:'重置日晷',focus:'时间小盘 · 额度大字',description:'小盘只讲周期时间，大数只讲额度，两个问题各占其位。',tradeoff:'更安静；时间表盘的含义必须保留标签。',try:'切到重置边界场景；不知道周期时不绘制假时钟。',reference:'续约到期轮盘中的细刻度与时间位置。'},
 ]},
 {name:'游标',title:'在小窗口里看更多账号',description:'不用大面积填充，探索位置、刻线与文字对齐带来的精确感。',variants:[
  {id:'D1',name:'水平游标',focus:'空心标尺 · 实心读数点',description:'游标在固定尺度上定位，比实心横条更轻，精确值贴近读数。',tradeoff:'列表紧凑；不如填满的色块直观。',try:'先试多账号，再快速切换已用／剩余。',reference:'体重记录中的点位与横向目标标尺。'},
  {id:'D2',name:'边缘标尺',focus:'竖向刻线 · 左右读数',description:'刻线藏在每行边缘，大数字和重置横向展开。',tradeoff:'留下更多文字空间；方向感需要 0 / 100 端点。',try:'在窄面板和长名称下检查周期、读数、重置能否一起读完。',reference:'控制面板边缘的小型垂直计量尺。'},
  {id:'D3',name:'折返刻度',focus:'折返路径 · 紧凑满量程',description:'把一根 0–100% 标尺折成两行，中点和方向写明。',tradeoff:'很有识别度；首次阅读比普通直线稍慢。',try:'把数值拖过 50%，观察同一份额度沿折返点连续前进。',reference:'赛车路径与仪器细密刻度的组合。'},
 ]},
 {name:'版式',title:'让准确数字成为主角',description:'不堆图表，探索数字、空白和刻度在主页中的组合。',variants:[
  {id:'E1',name:'额度票据',focus:'票据分栏 · 读数与重置',description:'一边放大额度，一边给重置时间独立位置，底边是一根精细读数线。',tradeoff:'结构清楚；比纯数字略占空间。',try:'展开额度详情，再关闭，检查阅读位置与焦点是否保留。',reference:'财务摘要卡的数字层级与设备信息分栏。'},
  {id:'E2',name:'对开余量',focus:'已用与剩余 · 同时可见',description:'同一份额度的两面放在一起，当前模式突出，另一面作为参考。',tradeoff:'不会误解补数，但信息量增加；超额不假造正余额。',try:'切剩余模式，再试超额：112% 已用对应 −12% 剩余。',reference:'能量分配面板里的两端关系，不借用来源构成。'},
  {id:'E3',name:'数字书脊',focus:'连续数字列 · 边缘小环',description:'周期、百分比和重置严格对齐，边缘薄环只提供扫视线索。',tradeoff:'多账号最整齐；图形存在感比仪表弱。',try:'打开 40 项额度，滚到最后一项，再切换大字与留白。',reference:'设备总览里整齐的遥测数字和小型状态刻盘。'},
 ]},
];
export const allStudies=families.flatMap(f=>f.variants);
