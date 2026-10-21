use crate::{model::DesktopState,tray};
use ksni::{Tray,TrayMethods};
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;
/// One StatusNotifier item, updated in place so the panel keeps its position.
#[derive(Default)]
pub struct LinuxTrays(Mutex<Option<ksni::Handle<Item>>>);
struct Item { app:tauri::AppHandle, quit:String, lines:Vec<String> }
fn icon()->ksni::Icon {
 static ICON:std::sync::OnceLock<ksni::Icon>=std::sync::OnceLock::new();
 ICON.get_or_init(||{
  let image=tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")).expect("bundled tray icon");
  // StatusNotifier pixmaps are ARGB in network byte order.
  ksni::Icon{width:image.width() as i32,height:image.height() as i32,data:image.rgba().chunks_exact(4).flat_map(|p|[p[3],p[0],p[1],p[2]]).collect()}
 }).clone()
}
impl Tray for Item {
 fn id(&self)->String { "TokenPlan".into() }
 fn title(&self)->String { "TokenPlan".into() }
 fn activate(&mut self,x:i32,y:i32) { crate::show_near(&self.app,x,y,y); }
 fn icon_pixmap(&self)->Vec<ksni::Icon> { vec![icon()] }
 fn tool_tip(&self)->ksni::ToolTip { ksni::ToolTip{title:"TokenPlan".into(),description:self.lines.join("\n"),..Default::default()} }
 fn menu(&self)->Vec<ksni::MenuItem<Self>> {
  let mut items=vec![ksni::menu::StandardItem{label:"TokenPlan".into(),activate:Box::new(|item:&mut Self|crate::show(&item.app)),..Default::default()}.into()];
  items.extend(self.lines.iter().map(|line|ksni::menu::StandardItem{label:line.clone(),enabled:false,..Default::default()}.into()));
  if !self.lines.is_empty() {items.push(ksni::MenuItem::Separator);}
  items.push(ksni::menu::StandardItem{label:self.quit.clone(),activate:Box::new(|item:&mut Self|item.app.exit(0)),..Default::default()}.into());
  items
 }
 fn watcher_offline(&self,_:ksni::OfflineReason)->bool {
  // Keep a usable window when the desktop has no StatusNotifier host.
  crate::panel::retain_window_without_tray(&self.app);let _=self.app.emit("desktop-error","tray_failed");true
 }
}
pub async fn update(app:&tauri::AppHandle,state:&DesktopState)->Result<(),()> {
 let manager=app.state::<LinuxTrays>();let mut handle=manager.0.lock().await;
 let item=Item{app:app.clone(),quit:tray::quit_label(tray::language(state)).into(),lines:tray::summaries(state)};
 match handle.as_ref().filter(|h|!h.is_closed()) {
  Some(existing)=>{existing.update(|old|*old=item).await.ok_or(())?;}
  None=>{*handle=Some(item.spawn().await.map_err(|_|())?);}
 }
 Ok(())
}
