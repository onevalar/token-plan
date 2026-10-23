using System.Text.Json;
using TokenPlan.Core;
using TokenPlan.Bridge;
var root=Path.Combine(Path.GetTempPath(),"tokenplan-bridge-tests-"+Guid.NewGuid());Directory.CreateDirectory(root);
try {
 var file=Path.Combine(root,"preferences.json");
 var preferences=new Preferences() with { TrayServices=new(){["claude"]=false}, AccountVisibility=new(){["claude:second"]=true}, ProviderNotes=new(){["claude"]="kept"} };preferences.Save(file);
 var secondary=new ProviderResult("claude","Claude",null,null,AccountKey:"claude:second",AccountEmail:"second@example.com",AccountIdentity:"second");
 File.WriteAllText(Path.Combine(root,"tauri-session.json"),JsonSerializer.Serialize(new{trayStyle="ring",accounts=new[]{secondary}}));
 async Task<JsonElement> Call(DesktopSession session,object request) => JsonSerializer.SerializeToElement(await session.Execute(JsonSerializer.SerializeToElement(request)));
 void Assert(bool value,string message){if(!value)throw new Exception(message);}
 using(var session=new DesktopSession(file)){
  var state=await Call(session,new{method="state"});Assert(state.GetProperty("schema").GetString()=="tokenplan.desktop.v1","Schema");
  state=await Call(session,new{method="tray",accountId="claude:second",value=true});
  var trayAccounts=state.GetProperty("accounts").EnumerateArray().ToArray();
  Assert(trayAccounts.Single(a=>a.GetProperty("id").GetString()=="claude:second").GetProperty("tray").GetBoolean(),"Unhide account from legacy hidden family");
  Assert(!trayAccounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("tray").GetBoolean(),"Keep sibling tray hidden during migration");
  state=await Call(session,new{method="enabled",accountId="claude",value=false});
  var accounts=state.GetProperty("accounts").EnumerateArray().ToArray();
  Assert(!accounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("enabled").GetBoolean(),"Primary disabled");
  Assert(accounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("added").GetBoolean(),"Hidden account stays added");
  Assert(!accounts.Single(a=>a.GetProperty("id").GetString()=="deepseek").GetProperty("added").GetBoolean(),"Unconfigured service is not an added account");
  Assert(accounts.Single(a=>a.GetProperty("id").GetString()=="claude:second").GetProperty("enabled").GetBoolean(),"Secondary must remain enabled");
  await Call(session,new{method="settings",value=new{trayStyle="percentage",ringIconPosition="left",autoUpdates=false,autoRefresh=false,language="zh-Hans"}});
  try { await Call(session,new{method="settings",value=new{ringIconPosition="invalid"}}); throw new Exception("Invalid position accepted"); } catch(InvalidDataException) { }
  // Synthetic quota results exercise the actual bridge cap, not just the UI switch.
  var cache=(System.Collections.Concurrent.ConcurrentDictionary<string,ProviderResult>)typeof(DesktopSession).GetField("results",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!.GetValue(session)!;
  cache["antigravity"]=new("antigravity","Antigravity",AntigravityUsage.Parse("""{"groups":[{"buckets":[{"bucketId":"gemini-5h","remainingFraction":0.8},{"bucketId":"gemini-weekly","remainingFraction":0.6},{"bucketId":"gemini-argon-wtu-weekly","remainingFraction":0.4}]}]}""",DateTimeOffset.UtcNow),null);
  var quotaState=await Call(session,new{method="state"});
  var agMetrics=quotaState.GetProperty("accounts").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="antigravity").GetProperty("metrics").EnumerateArray().ToArray();
  Assert(agMetrics.Select(m=>m.GetProperty("periodSeconds").GetDouble()).SequenceEqual(new[]{18000d,604800d,604800d}),"Antigravity window periods reach the shared frontend");
  cache["claude"]=new("claude","Claude",new("claude","Claude","Pro",new[]{"a","b","c","d"}.Select(label=>new UsageWindow(label,25,null)).ToArray(),DateTimeOffset.UtcNow),null);
  state=await Call(session,new{method="metric",accountId="claude",metricId="c",value=new{pinned=true}});
  Assert(state.GetProperty("accounts").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("metrics").EnumerateArray().Count(m=>m.GetProperty("pinned").GetBoolean())==3,"Bridge accepts third pin");
  try { await Call(session,new{method="metric",accountId="claude",metricId="d",value=new{pinned=true}}); throw new Exception("Fourth pin accepted"); } catch(InvalidDataException) { }
  var pinned = new Preferences().Pin("claude","a",true,3).Pin("claude","b",true,3).Pin("claude","c",true,3).Pin("claude","d",true,3);
  Assert(pinned.PinnedMetrics["claude"].SequenceEqual(new[]{"a","b","c"}),"Three pins, fourth rejected");
  pinned.Save(Path.Combine(root,"pins.json"));
  Assert(Preferences.Load(Path.Combine(root,"pins.json")).PinnedMetrics["claude"].Length==3,"Three pins persist");
  Assert(new Preferences().Pin("claude","a",true).Pin("claude","b",true).Pin("claude","c",true).PinnedMetrics["claude"].Length==2,"Classic default stays two");
  await Call(session,new{method="move",accountId="claude:second",value=-1});
  state=await Call(session,new{method="remove",accountId="claude:second"});
  Assert(!state.GetProperty("accounts").EnumerateArray().Any(a=>a.GetProperty("id").GetString()=="claude:second"),"Removed account hidden");
  Assert(Preferences.Load(file).ProviderNotes["claude"]=="kept","Existing notes preserved");
 }
 using(var session=new DesktopSession(file)){
  var state=await Call(session,new{method="state"});
  Assert(state.GetProperty("settings").GetProperty("trayStyle").GetString()=="percentage","Persisted style");
  Assert(state.GetProperty("settings").GetProperty("ringIconPosition").GetString()=="left","Persisted ring position");
  Assert(!state.GetProperty("settings").GetProperty("autoRefresh").GetBoolean(),"Refresh preference survives restart");
  Assert(!state.GetProperty("settings").GetProperty("autoUpdates").GetBoolean(),"Persisted updater preference");
  var hidden = state.GetProperty("accounts").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="claude");
  Assert(hidden.GetProperty("added").GetBoolean() && !hidden.GetProperty("enabled").GetBoolean(),"Hidden membership survives restart");
  Assert(!state.GetProperty("accounts").EnumerateArray().Any(a=>a.GetProperty("id").GetString()=="claude:second"),"Tombstone survives relaunch");
  Assert(!state.ToString().Contains("CredentialFingerprint"),"No authentication fields exported");
 }
 // Login switches must not replace the previous account's durable identity or customization.
 var switchDir=Path.Combine(root,"switching");Directory.CreateDirectory(switchDir);
 var switchFile=Path.Combine(switchDir,"preferences.json");
 using(var session=new DesktopSession(switchFile)) {
  var remember=typeof(DesktopSession).GetMethod("RememberAccount",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!;
  remember.Invoke(session,[new ProviderResult("claude","Claude",null,null,AccountEmail:"first@example.com",AccountIdentity:"first|org")]);
  await Call(session,new{method="note",accountId="claude",value="first note"});
  await Call(session,new{method="enabled",accountId="claude",value=false});
  var switched=(ProviderResult)remember.Invoke(session,[new ProviderResult("claude","Claude",null,null,AccountEmail:"next@example.com",AccountIdentity:"next|org")])!;
  Assert(switched.SettingsKey!="claude","Quota observations use the new account key after a login switch");
  var state=await Call(session,new{method="state"});
  var accounts=state.GetProperty("accounts").EnumerateArray().Where(a=>a.GetProperty("family").GetString()=="claude").ToArray();
  Assert(accounts.Length==2,"Switching preserves both account headings");
  Assert(accounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("connection").GetString()=="different_account","A switched identity is distinguished from an expired session");
  Assert(accounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("note").GetString()=="first note","Old identity retains notes");
  remember.Invoke(session,[new ProviderResult("claude","Claude",null,"login unavailable")]);
  remember.Invoke(session,[new ProviderResult("claude","Claude",null,null,AccountKey:"claude:other-source",AccountEmail:"first@example.com",AccountIdentity:"first|org")]);
  state=await Call(session,new{method="settings",value=new{autoRefresh=false}});
  accounts=state.GetProperty("accounts").EnumerateArray().Where(a=>a.GetProperty("family").GetString()=="claude").ToArray();
  Assert(accounts.Length==2,"Reconnection merges by identity, not login directory");
  Assert(!accounts.Single(a=>a.GetProperty("id").GetString()=="claude").GetProperty("enabled").GetBoolean(),"Reconnection keeps visibility");
 }
 using(var session=new DesktopSession(switchFile)) {
  var state=await Call(session,new{method="state"});
  Assert(state.GetProperty("accounts").EnumerateArray().Count(a=>a.GetProperty("family").GetString()=="claude")==2,"Both accounts survive a process restart");
  Assert(state.GetProperty("accounts").EnumerateArray().Where(a=>a.GetProperty("family").GetString()=="claude").All(a=>a.GetProperty("connection").GetString()=="unchecked"),"Restored headings require a check, not a premature login failure");
 }

 var pinsDir=Path.Combine(root,"account-pins");Directory.CreateDirectory(pinsDir);
 var pinsFile=Path.Combine(pinsDir,"preferences.json");
 using(var session=new DesktopSession(pinsFile)) {
  var remember=typeof(DesktopSession).GetMethod("RememberAccount",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!;
  ProviderResult Fixture(string identity) => new("claude","Claude",new("claude","Claude","Pro",new[]{new UsageWindow("Session",19,null),new UsageWindow("Weekly",47,null)},DateTimeOffset.UtcNow),null,AccountIdentity:identity);
  remember.Invoke(session,[Fixture("first")]);
  await Call(session,new{method="metric",accountId="claude",metricId="Session",value=new{pinned=false}});
  await Call(session,new{method="metric",accountId="claude",metricId="Weekly",value=new{pinned=false}});
  var second=(ProviderResult)remember.Invoke(session,[Fixture("second")])!;
  await Call(session,new{method="settings",value=new{autoRefresh=false}});
  var saved=Preferences.Load(pinsFile);
  Assert(saved.PinnedMetrics["claude"].Length==0,"Explicit icon-only sibling stays empty");
  Assert(saved.PinnedMetrics[second.SettingsKey].Length==2,"New account defaults persist independently");
  remember.Invoke(session,[Fixture("first")]);
  await Call(session,new{method="settings",value=new{autoRefresh=false}});
  Assert(Preferences.Load(pinsFile).PinnedMetrics["claude"].Length==0,"Reconnecting does not undo icon-only choice");
 }
 // Regression: a pressed Refresh answered "refreshed" without fetching, and numbers only caught up later. A pressed Refresh
 // must always fetch; the first refresh after a relaunch must fetch; only near-simultaneous repeats are coalesced.
 var gateDir=Path.Combine(root,"refresh-gate");Directory.CreateDirectory(gateDir);
 var gateFile=Path.Combine(gateDir,"preferences.json");
 new Preferences().WithEnabled("claude",false).WithEnabled("codex",false).WithEnabled("cursor",false).WithEnabled("deepseek",true).Save(gateFile);
 var gateKeys=new APIKeyStore(Path.Combine(gateDir,"keys"),_=>null);gateKeys.Save("deepseek","fixture-key");
 var gateCalls=0;
 DesktopSession GateSession()=>new(gateFile,new ProviderService(gateDir,gateDir,new CountingHandler(()=>{gateCalls++;return """{"balance_infos":[{"currency":"CNY","total_balance":"10"}]}""";}),(_,_)=>{},keys:gateKeys));
 using(var session=GateSession()){
  var state=await Call(session,new{method="refresh"});
  Assert(gateCalls==1,"The first refresh fetches");
  Assert(state.GetProperty("accounts").EnumerateArray().Single(a=>a.GetProperty("id").GetString()=="deepseek").GetProperty("fetchedAt").GetString()!="","The fetch is reported in state");
  await Call(session,new{method="refresh"});
  Assert(gateCalls==1,"A repeat that arrives moments later is coalesced");
  await Call(session,new{method="refresh",force=true});
  Assert(gateCalls==2,"A pressed Refresh always fetches");
  await Call(session,new{method="refresh",accountId="deepseek",force=true});
  Assert(gateCalls==3,"A pressed per-account Refresh always fetches");
 }
 using(var session=GateSession()){
  await Call(session,new{method="refresh"});
  Assert(gateCalls==4,"The first refresh after a relaunch fetches instead of waiting out an old saved interval");
 }
 var registeredHome=Path.Combine(root,"registered");Directory.CreateDirectory(registeredHome);
 File.WriteAllText(Path.Combine(root,".tokenplan-account-directories.json"),JsonSerializer.Serialize(new Dictionary<string,string[]>{{"claude",[registeredHome]}}));
 Assert(AccountHomes.Discover("claude",root,Path.Combine(root,".claude"),_=>null).Any(a=>a.Home==registeredHome),"Registered independent directory is discoverable");
 Console.WriteLine("Bridge integration checks passed (isolated preferences; no network or real credentials).");
}finally{Directory.Delete(root,true);}

sealed class CountingHandler(Func<string> body) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken token)
        => Task.FromResult(new HttpResponseMessage(System.Net.HttpStatusCode.OK) { Content = new StringContent(body()) });
}
