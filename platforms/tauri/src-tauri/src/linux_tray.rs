use crate::{model::DesktopState,tray};
use ksni::{Tray,TrayMethods};
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct LinuxTrays(Mutex<Option<ksni::Handle<Item>>>);
struct Item { app:tauri::AppHandle, open:String, quit:String, icon:ksni::Icon, anchor:Option<(i32,i32,i32)> }
impl Tray for Item {
 // Hosts supporting Activate open Home; ContextMenu keeps the two-item D-Bus menu.
 // Some GNOME extensions choose to show the menu for both mouse buttons.
 const MENU_ON_ACTIVATE:bool=false;
 fn activate(&mut self,x:i32,y:i32) {
  self.anchor=if (x,y)==(-1,-1) {None} else {Some((x,y,y))};
  crate::show_home_at(&self.app,self.anchor);
 }
 fn id(&self)->String { "com.onevalar.tokenplan".into() }
 fn title(&self)->String { "TokenPlan".into() }
 fn icon_pixmap(&self)->Vec<ksni::Icon> { vec![self.icon.clone()] }
 fn tool_tip(&self)->ksni::ToolTip { ksni::ToolTip{title:"TokenPlan".into(),..Default::default()} }
 fn menu(&self)->Vec<ksni::MenuItem<Self>> {
  vec![
   ksni::menu::StandardItem{label:self.open.clone(),activate:Box::new(|item:&mut Self|crate::show_home_at(&item.app,item.anchor)),..Default::default()}.into(),
   ksni::menu::StandardItem{label:self.quit.clone(),activate:Box::new(|item:&mut Self|item.app.exit(0)),..Default::default()}.into(),
  ]
 }
 fn watcher_online(&self) {
  crate::panel::linux_tray_available(&self.app,true);
 }
 fn watcher_offline(&self,_:ksni::OfflineReason)->bool {
  crate::panel::linux_tray_available(&self.app,false);let _=self.app.emit("desktop-error","tray_failed");true
 }
}
pub async fn update(app:&tauri::AppHandle,state:&DesktopState)->Result<(),()> {
 let manager=app.state::<LinuxTrays>();let mut handle=manager.0.lock().await;
 let open=tray::open_label(tray::language(state)).to_string();
 let quit=tray::quit_label(tray::language(state)).to_string();
 if let Some(old)=handle.as_ref().filter(|h|!h.is_closed()) {
  old.update(|item|{item.open=open;item.quit=quit;}).await.ok_or(())?;
 }else{
  let image=tray::application_icon().map_err(|error|eprintln!("Tray icon could not be decoded: {error}"))?;
  // SNI pixmaps use straight ARGB, preserving the original icon's transparency.
  let icon=ksni::Icon{width:image.width() as i32,height:image.height() as i32,data:image.rgba().chunks_exact(4).flat_map(|p|[p[3],p[0],p[1],p[2]]).collect()};
  let item=Item{app:app.clone(),open,quit,icon,anchor:None};
  match item.spawn().await {
   Ok(service)=>{
    *handle=Some(service);
    crate::panel::linux_tray_available(app,true);
   },
   Err(error)=>{
    eprintln!("Linux tray registration failed: {error}");
    crate::panel::linux_tray_available(app,false);
    return Err(());
   }
  }
 }
 Ok(())
}
