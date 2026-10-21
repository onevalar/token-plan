import {Button} from '../components/arc/button/button';
import {trayAccounts,type DesktopState} from '../desktop';
import {TrayGlyph} from './TrayPreview';

// Notification areas reserve a square slot. Keep readable account indicators in
// the tray's popup rather than squeezing a menu-bar strip into that slot.
export function TrayPanel({state,open,label}:{state:DesktopState;open:(id:string)=>void;label:string}) {
 const accounts=trayAccounts(state.accounts);
 if(!accounts.length)return null;
 return <nav className="tray-panel-strip" aria-label={label}>{accounts.map(a=><Button key={a.id} variant="ghost" className="tray-panel-account" aria-label={`${a.name} ${a.email||a.plan}`} onClick={()=>open(a.id)}><TrayGlyph family={a.family} metrics={a.metrics.filter(m=>m.pinned)} badge={a.badge} style={state.settings.trayStyle} position={state.settings.ringIconPosition}/></Button>)}</nav>;
}
