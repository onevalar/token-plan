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
  Assert(accounts.Single(a=>a.GetProperty("id").GetString()=="claude:second").GetProperty("enabled").GetBoolean(),"Secondary must remain enabled");
  await Call(session,new{method="settings",value=new{trayStyle="percentage",ringIconPosition="left",autoUpdates=false,autoRefresh=false,language="zh-Hans"}});
  try { await Call(session,new{method="settings",value=new{ringIconPosition="invalid"}}); throw new Exception("Invalid position accepted"); } catch(InvalidDataException) { }
  // Synthetic quota results exercise the actual bridge cap, not just the UI switch.
  var cache=(System.Collections.Concurrent.ConcurrentDictionary<string,ProviderResult>)typeof(DesktopSession).GetField("results",System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic)!.GetValue(session)!;
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
 }
 var registeredHome=Path.Combine(root,"registered");Directory.CreateDirectory(registeredHome);
 File.WriteAllText(Path.Combine(root,".tokenplan-account-directories.json"),JsonSerializer.Serialize(new Dictionary<string,string[]>{{"claude",[registeredHome]}}));
 Assert(AccountHomes.Discover("claude",root,Path.Combine(root,".claude"),_=>null).Any(a=>a.Home==registeredHome),"Registered independent directory is discoverable");
 Console.WriteLine("Bridge integration checks passed (isolated preferences; no network or real credentials).");
}finally{Directory.Delete(root,true);}
