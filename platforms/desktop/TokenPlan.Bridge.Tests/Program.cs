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
  await Call(session,new{method="settings",value=new{trayStyle="percentage",autoUpdates=false,language="zh-Hans"}});
  await Call(session,new{method="move",accountId="claude:second",value=-1});
  state=await Call(session,new{method="remove",accountId="claude:second"});
  Assert(!state.GetProperty("accounts").EnumerateArray().Any(a=>a.GetProperty("id").GetString()=="claude:second"),"Removed account hidden");
  Assert(Preferences.Load(file).ProviderNotes["claude"]=="kept","Existing notes preserved");
 }
 using(var session=new DesktopSession(file)){
  var state=await Call(session,new{method="state"});
  Assert(state.GetProperty("settings").GetProperty("trayStyle").GetString()=="percentage","Persisted style");
  Assert(!state.GetProperty("settings").GetProperty("autoUpdates").GetBoolean(),"Persisted updater preference");
  Assert(!state.GetProperty("accounts").EnumerateArray().Any(a=>a.GetProperty("id").GetString()=="claude:second"),"Tombstone survives relaunch");
  Assert(!state.ToString().Contains("CredentialFingerprint"),"No authentication fields exported");
 }
 Console.WriteLine("Bridge integration checks passed (isolated preferences; no network or real credentials).");
}finally{Directory.Delete(root,true);}
