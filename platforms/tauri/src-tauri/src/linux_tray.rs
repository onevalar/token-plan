use crate::{model::DesktopState,tray};
use ksni::{Tray,TrayMethods};
use tauri::{Manager,Emitter};
use tokio::sync::Mutex;
#[derive(Default)]
pub struct LinuxTrays(Mutex<Vec<(String,ksni::Handle<Item>)>>);
struct Item { app:tauri::AppHandle, id:String, title:String, quit:String, width:i32,height:i32,pixels:Vec<u8> }
impl Tray for Item {
 fn id(&self)->String { self.id.clone() }
 fn title(&self)->String { self.title.clone() }
 fn activate(&mut self,x:i32,y:i32) { crate::show_near(&self.app,x,y); }
 fn icon_pixmap(&self)->Vec<ksni::Icon> { vec![ksni::Icon{width:self.width,height:self.height,data:self.pixels.clone()}] }
 fn menu(&self)->Vec<ksni::MenuItem<Self>> {
  vec![ksni::menu::StandardItem{label:"TokenPlan".into(),activate:Box::new(|item:&mut Self|crate::show(&item.app)),..Default::default()}.into(),
       ksni::menu::StandardItem{label:self.quit.clone(),activate:Box::new(|item:&mut Self|item.app.exit(0)),..Default::default()}.into()]
 }
 fn watcher_offline(&self,_:ksni::OfflineReason)->bool {
  // Keep a usable window when the desktop has no StatusNotifier host.
  crate::show(&self.app);let _=self.app.emit("desktop-error","tray_failed");true
 }
}
pub async fn update(app:&tauri::AppHandle,state:&DesktopState)->Result<(),()> {
 let manager=app.state::<LinuxTrays>();let mut handles=manager.0.lock().await;
 let shown=tray::visible(state);
 let ids:Vec<_>=if shown.is_empty() { vec!["root".to_string()] } else { shown.iter().map(|(a,_)|a.id.clone()).collect() };
 if handles.iter().map(|(id,_)|id).ne(ids.iter()) || handles.iter().any(|(_,h)|h.is_closed()) {
  for (_,h) in handles.drain(..) { h.shutdown().await; }
 }
 let language=if state.settings.language=="system" {&state.settings.locale} else {&state.settings.language};
 let dark=match state.settings.appearance.as_str(){"dark"=>true,"light"=>false,_=>app.get_webview_window("main").and_then(|w|w.theme().ok())==Some(tauri::Theme::Dark)};
 if shown.is_empty() {
  let image=tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png")).map_err(|_|())?;
  let item=Item{app:app.clone(),id:"TokenPlan_root".into(),title:"TokenPlan".into(),quit:tray::quit_label(language).into(),width:image.width() as i32,height:image.height() as i32,pixels:image.rgba().chunks_exact(4).flat_map(|p|[p[3],p[0],p[1],p[2]]).collect()};
  if let Some((_,handle))=handles.first(){handle.update(|old|*old=item).await.ok_or(())?;}
  else {handles.push(("root".into(),item.spawn().await.map_err(|_|())?));}
 }
 for (account,badge) in shown {
  let image=tray::render(account,badge,&state.settings.tray_style,dark);
  let pixels=image.rgba().chunks_exact(4).flat_map(|p|[p[3],p[0],p[1],p[2]]).collect();
  let item=Item{app:app.clone(),id:format!("TokenPlan_{}",account.id.replace(|c:char|!c.is_ascii_alphanumeric(),"_")),title:format!("{} {}",account.name,account.email),quit:tray::quit_label(language).into(),width:image.width() as i32,height:image.height() as i32,pixels};
  if let Some((_,handle))=handles.iter().find(|(id,_)|id==&account.id) {
   handle.update(|old|*old=item).await.ok_or(())?;
  } else {
   let handle=item.spawn().await.map_err(|_|())?;handles.push((account.id.clone(),handle));
  }
 }
 if let Some(root)=app.tray_by_id("root") {root.set_menu(Some(tray::menu(app,language).map_err(|_|())?)).map_err(|_|())?;root.set_visible(false).map_err(|_|())?;}
 Ok(())
}
