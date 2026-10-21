use super::*;
fn fixture()->DesktopState{serde_json::from_str(include_str!("../../../tests/fixtures/desktop.json")).unwrap()}

#[test]
fn percentages_keep_every_account_and_every_selected_metric() {
    let mut state=fixture();state.settings.tray_style="percentage".into();
    let expected=tray::visible(&state).iter().map(|(a,_)|1+a.metrics.iter().filter(|m|m.pinned).take(3).count()).sum::<usize>();
    assert_eq!(cells(&state).len(),expected);
    let mut a=state.accounts[0].clone();let mut metric=a.metrics[0].clone();
    metric.pinned=true;metric.has_data=true;metric.percent=Some(10.);
    a.metrics=vec![metric.clone();3];a.tray=true;a.enabled=true;state.accounts=vec![a];
    let original=cells(&state);assert_eq!(original.len(),4);
    state.accounts[0].metrics[2].percent=Some(85.);
    let changed=cells(&state);
    assert_ne!(original[3].image.rgba(),changed[3].image.rgba());
    assert_eq!(original[1].image.rgba(),changed[1].image.rgba());
    assert!(changed[3].title.contains("85%"));
}

#[test]
fn unpin_hide_remove_and_reorder_leave_no_stale_account_cells() {
    let mut state=fixture();state.settings.tray_style="ring".into();state.settings.ring_icon_position="inside".into();
    let first_email=state.accounts[0].email.clone();
    state.accounts.swap(0,1);
    assert!(cells(&state)[0].title.contains(&state.accounts[0].email));
    for m in &mut state.accounts[0].metrics{m.pinned=false;}
    assert!(cells(&state)[0].lines.is_empty());
    state.accounts.retain(|a|a.email!=first_email);
    assert!(cells(&state).iter().all(|cell|!cell.title.contains(&first_email)));
    assert!(!cells(&state)[0].title.ends_with(" · 1"),"one visible account has no ordinal");
    for a in &mut state.accounts{a.tray=false;}
    let fallback=cells(&state);assert_eq!(fallback.len(),1);assert_eq!(fallback[0].title,"TokenPlan");
}

#[test]
fn three_ring_values_and_badge_remain_visible_with_a_separate_provider_mark() {
    let mut state=fixture();let mut metric=state.accounts[0].metrics[0].clone();
    metric.pinned=true;metric.has_data=true;metric.percent=Some(50.);
    state.accounts[0].metrics=vec![metric;3];
    state.settings.tray_style="ring".into();state.settings.ring_icon_position="inside".into();
    let before=cells(&state);
    state.accounts[0].metrics[2].percent=Some(90.);
    let after=cells(&state);
    assert_eq!(before[0].image.rgba(),after[0].image.rgba(),"provider mark remains stable");
    assert_ne!(before[1].image.rgba(),after[1].image.rgba(),"inner ring updates");
    assert_eq!(after[1].lines.len(),3);
    let rendered=rings("claude",&state.accounts[0].metrics.iter().collect::<Vec<_>>(),Some(2),false);
    let plain=rings("claude",&state.accounts[0].metrics.iter().collect::<Vec<_>>(),None,false);
    assert_ne!(rendered.rgba(),plain.rgba(),"center ordinal must be present");
}

#[test]
fn tracks_stay_visible_and_missing_values_do_not_turn_into_numeric_zero() {
    let mut m=fixture().accounts[0].metrics[0].clone();m.has_data=true;m.percent=Some(0.);
    let empty=rings("claude",&[&m],None,true);
    m.percent=Some(100.);let full=rings("claude",&[&m],None,true);
    let pixel=|image:&Image<'_>,x:u32,y:u32|image.rgba()[((y*SIDE+x)*4) as usize];
    assert!(pixel(&empty,59,34)>65,"the full track remains visible at zero percent");
    assert!(pixel(&full,59,34)>220);
    m.percent=Some(0.);let zero=reading(&m,None);m.has_data=false;
    assert_ne!(zero.rgba(),reading(&m,None).rgba());
}

#[test]
fn stable_slots_and_opaque_contrast_do_not_depend_on_system_or_application_theme() {
    let state=fixture();assert_eq!(slot_id(9),"TokenPlan-0009");
    for cell in cells(&state){
        assert_eq!((cell.image.width(),cell.image.height()),(64,64));
        assert!(cell.image.rgba().chunks_exact(4).any(|p|p[3]==0),"rounded transparent corners");
        assert!(cell.image.rgba().chunks_exact(4).any(|p|p[0]>220&&p[3]==255),"white foreground");
        assert!(cell.image.rgba().chunks_exact(4).any(|p|p[0]<45&&p[3]==255),"opaque dark contrast plate");
    }
}

#[test]
fn a_single_menu_dispatcher_handles_only_native_slot_actions() {
    assert_eq!(menu_action("TokenPlan-0002-open"),Some("open"));
    assert_eq!(menu_action("TokenPlan-0020-quit"),Some("quit"));
    for id in ["open","TokenPlan-0002-metric-0","TokenPlan-0002-account","TokenPlan-other-open"]{
        assert_eq!(menu_action(id),None);
    }
}

#[test]
fn percentage_digits_never_clip_against_the_native_icon_edges() {
    let mut metric=fixture().accounts[0].metrics[0].clone();metric.has_data=true;
    for percent in [0.,25.,65.,92.,100.,999.] {
        metric.percent=Some(percent);
        let image=reading(&metric,None);
        for x in [0,1,2,61,62,63]{for y in 24..57{
            assert!(image.rgba()[((y*SIDE+x)*4) as usize]<180,"{percent}% clips at {x},{y}");
        }}
    }
}

#[test]
fn export_native_tray_review() {
    let Ok(path)=std::env::var("TOKENPLAN_NATIVE_TRAY_REVIEW")else{return};
    let mut state=fixture();
    for (i,account) in state.accounts.iter_mut().take(3).enumerate(){
        let base=account.metrics[0].clone();
        account.metrics=(0..3-i).map(|n|{let mut m=base.clone();m.id=format!("metric-{n}");m.pinned=true;m.has_data=true;m.percent=Some([25.,65.,92.][n]);m.period_seconds=Some([18000.,604800.,2592000.][n]);m}).collect();
    }
    let mut sheet=Pixmap::new(1200,720).unwrap();
    for row in 0..6 {
        let dark=row>=3;let shade=if dark{24}else{245};
        for y in row*120..(row+1)*120{for x in 0..1200{let p=((y*1200+x)*4) as usize;sheet.data_mut()[p..p+4].copy_from_slice(&[shade,shade,shade,255]);}}
        let (style,position)=[("ring","inside"),("ring","left"),("percentage","inside")][row%3];
        state.settings.tray_style=style.into();state.settings.ring_icon_position=position.into();
        for (col,cell) in cells(&state).iter().enumerate(){
            let mut native=Pixmap::new(64,64).unwrap();native.data_mut().copy_from_slice(cell.image.rgba());
            for p in native.data_mut().chunks_exact_mut(4){for c in 0..3{p[c]=((p[c] as u16*p[3] as u16)/255) as u8;}}
            for (side,offset,y) in [(64.,0.,0.),(32.,0.,72.),(22.,42.,72.),(16.,74.,72.)]{
                let x=col as f32*120.+offset;let y=row as f32*120.+y;
                sheet.draw_pixmap(0,0,native.as_ref(),&Default::default(),Transform::from_scale(side/64.,side/64.).post_translate(x,y),None);
            }
        }
    }
    sheet.save_png(path).unwrap();
}
