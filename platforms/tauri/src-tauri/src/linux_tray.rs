use crate::{model::DesktopState,tray};
use ksni::{Tray,TrayMethods};
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;
/// Stable positional slots survive refreshes, account reordering and style switches.
#[derive(Default)]
pub struct LinuxTrays(Mutex<Vec<ksni::Handle<Item>>>);
struct Item { app:tauri::AppHandle, slot:String, title:String, quit:String, lines:Vec<String>, icon:ksni::Icon }
fn icon(image:&tauri::image::Image<'_>)->ksni::Icon {
 // StatusNotifier pixmaps are straight ARGB in network byte order.
 ksni::Icon{width:image.width() as i32,height:image.height() as i32,data:image.rgba().chunks_exact(4).flat_map(|p|[p[3],p[0],p[1],p[2]]).collect()}
}
impl Tray for Item {
 fn id(&self)->String { self.slot.clone() }
 fn title(&self)->String { self.title.clone() }
 fn activate(&mut self,x:i32,y:i32) { crate::show_near(&self.app,x,y,y); }
 fn icon_pixmap(&self)->Vec<ksni::Icon> { vec![self.icon.clone()] }
 fn tool_tip(&self)->ksni::ToolTip { ksni::ToolTip{title:self.title.clone(),description:self.lines.join("\n"),..Default::default()} }
 fn menu(&self)->Vec<ksni::MenuItem<Self>> {
  let mut items=vec![ksni::menu::StandardItem{label:"TokenPlan".into(),activate:Box::new(|item:&mut Self|crate::show(&item.app)),..Default::default()}.into()];
  items.push(ksni::menu::StandardItem{label:self.title.clone(),enabled:false,..Default::default()}.into());
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
 let manager=app.state::<LinuxTrays>();let mut handles=manager.0.lock().await;
 let cells=crate::tray_cells::cells(state);
 for (index,cell) in cells.iter().enumerate() {
  let item=Item{app:app.clone(),slot:crate::tray_cells::slot_id(index),title:cell.title.clone(),quit:tray::quit_label(tray::language(state)).into(),lines:cell.lines.clone(),icon:icon(&cell.image)};
  if index<handles.len()&&!handles[index].is_closed() {
   handles[index].update(|old|*old=item).await.ok_or(())?;
  }else{
   let handle=item.spawn().await.map_err(|error|{eprintln!("Linux tray registration failed: {error}");})?;
   if index<handles.len(){handles[index]=handle;}else{handles.push(handle);}
  }
 }
 // Remove stale metrics/accounts only after their replacement cells are registered.
 while handles.len()>cells.len(){if let Some(old)=handles.pop(){old.shutdown().await;}}
 Ok(())
}
