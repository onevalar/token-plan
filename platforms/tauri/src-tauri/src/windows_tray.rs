use crate::{model::DesktopState,tray,tray_cells};
use std::sync::Mutex;
use tauri::{Manager,menu::{Menu,MenuItem,PredefinedMenuItem},tray::{TrayIconBuilder,TrayIconEvent,MouseButton,MouseButtonState}};

#[derive(Default)]
pub struct WindowsTrays(Mutex<Vec<Vec<u8>>>);

fn menu(app:&tauri::AppHandle,id:&str,cell:&tray_cells::Cell,language:&str)->tauri::Result<Menu<tauri::Wry>> {
    let menu=Menu::new(app)?;
    menu.append(&MenuItem::with_id(app,format!("{id}-open"),"TokenPlan",true,None::<&str>)?)?;
    menu.append(&MenuItem::with_id(app,format!("{id}-account"),&cell.title,false,None::<&str>)?)?;
    for (index,line) in cell.lines.iter().enumerate() {
        menu.append(&MenuItem::with_id(app,format!("{id}-metric-{index}"),line,false,None::<&str>)?)?;
    }
    menu.append(&PredefinedMenuItem::separator(app)?)?;
    menu.append(&MenuItem::with_id(app,format!("{id}-quit"),tray::quit_label(language),true,None::<&str>)?)?;
    Ok(menu)
}

pub fn update(app:&tauri::AppHandle,state:&DesktopState)->tauri::Result<()> {
    let cells=tray_cells::cells(state);
    let manager=app.state::<WindowsTrays>();
    let mut images=manager.0.lock().unwrap();
    for (index,cell) in cells.iter().enumerate() {
        let id=tray_cells::slot_id(index);
        // Windows native tooltips have a 128 UTF-16-unit limit. The menu retains the full identity.
        let tooltip=cell.title.chars().scan(0,|used,c|{*used+=c.len_utf16();(*used<128).then_some(c)}).collect::<String>();
        let menu=menu(app,&id,cell,tray::language(state))?;
        if let Some(icon)=app.tray_by_id(&id) {
            if images.get(index).map(Vec::as_slice)!=Some(cell.image.rgba()){icon.set_icon(Some(cell.image.clone()))?;}
            icon.set_tooltip(Some(tooltip))?;
            icon.set_menu(Some(menu))?;
        }else{
            let open=format!("{id}-open");let quit=format!("{id}-quit");
            TrayIconBuilder::with_id(id)
                .icon(cell.image.clone()).tooltip(tooltip).menu(&menu).show_menu_on_left_click(false)
                .on_menu_event(move|app,event|{
                    if event.id.as_ref()==open{crate::show(app);}
                    else if event.id.as_ref()==quit{app.exit(0);}
                })
                .on_tray_icon_event(|icon,event|{
                    if let TrayIconEvent::Click{button:MouseButton::Left,button_state:MouseButtonState::Up,rect,..}=event {
                        let p=rect.position.to_physical::<f64>(1.);let s=rect.size.to_physical::<f64>(1.);
                        crate::show_near(icon.app_handle(),(p.x+s.width/2.) as i32,p.y as i32,(p.y+s.height) as i32);
                    }
                }).build(app)?;
        }
        if index<images.len(){images[index]=cell.image.rgba().to_vec();}else{images.push(cell.image.rgba().to_vec());}
    }
    while images.len()>cells.len(){let index=images.len()-1;app.remove_tray_by_id(&tray_cells::slot_id(index));images.pop();}
    // The initial application icon stays available until at least one dynamic cell succeeds.
    app.remove_tray_by_id("root");
    Ok(())
}
