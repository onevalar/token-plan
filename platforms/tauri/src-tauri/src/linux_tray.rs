use crate::{model::DesktopState,tray};
use ksni::{Tray,TrayMethods};
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;

#[derive(Default)]
pub struct LinuxTrays(Mutex<Option<ksni::Handle<Item>>>);
struct Item { app:tauri::AppHandle, open:String, quit:String, icon:ksni::Icon }
impl Tray for Item {
 // Let GNOME/KDE render the standard two-item menu on a primary click. SNI has
 // no double-click method; those hosts consume the click stream themselves.
 const MENU_ON_ACTIVATE:bool=true;
 fn id(&self)->String { "com.onevalar.tokenplan".into() }
 fn title(&self)->String { "TokenPlan".into() }
 fn icon_pixmap(&self)->Vec<ksni::Icon> { vec![self.icon.clone()] }
 fn tool_tip(&self)->ksni::ToolTip { ksni::ToolTip{title:"TokenPlan".into(),..Default::default()} }
 fn menu(&self)->Vec<ksni::MenuItem<Self>> {
  vec![
   ksni::menu::StandardItem{label:self.open.clone(),activate:Box::new(|item:&mut Self|crate::show_home(&item.app)),..Default::default()}.into(),
   ksni::menu::StandardItem{label:self.quit.clone(),activate:Box::new(|item:&mut Self|item.app.exit(0)),..Default::default()}.into(),
  ]
 }
 fn watcher_offline(&self,_:ksni::OfflineReason)->bool {
  crate::panel::retain_window_without_tray(&self.app);let _=self.app.emit("desktop-error","tray_failed");true
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
  let item=Item{app:app.clone(),open,quit,icon};
  *handle=Some(item.spawn().await.map_err(|error|eprintln!("Linux tray registration failed: {error}"))?);
 }
 Ok(())
}
