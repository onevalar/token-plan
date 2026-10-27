#!/usr/bin/env python3
"""GNOME Shell + distribution tray extension, virtual display, no user credentials.

This is desktop integration testing, not a physical-machine or Wayland certification.
Never change extension settings on a user's login session.
"""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time


def main(executable):
    if os.environ.get('GITHUB_ACTIONS') != 'true':
        raise RuntimeError('Disposable CI desktop only')
    import dbus
    report = Path('linux-desktop-evidence').resolve()
    report.mkdir(exist_ok=True)
    executable = str(Path(executable).resolve())
    with tempfile.TemporaryDirectory(prefix='tokenplan-gnome-') as home:
        os.environ.update(HOME=home, XDG_CONFIG_HOME=home+'/config',
                          XDG_DATA_HOME=home+'/data', XDG_CACHE_HOME=home+'/cache',
                          XDG_CURRENT_DESKTOP='ubuntu:GNOME', XDG_SESSION_TYPE='x11',
                          LIBGL_ALWAYS_SOFTWARE='1', GSETTINGS_BACKEND='memory')
        # Memory settings do not cross processes, so use an isolated on-disk dconf DB.
        os.environ.pop('GSETTINGS_BACKEND')
        subprocess.run(['dbus-update-activation-environment','HOME','XDG_CONFIG_HOME',
                        'XDG_DATA_HOME','XDG_CACHE_HOME','XDG_CURRENT_DESKTOP',
                        'XDG_SESSION_TYPE'],check=True)
        extensions = [json.loads(p.read_text())['uuid'] for p in
                      Path('/usr/share/gnome-shell/extensions').glob('*/metadata.json')
                      if 'indicator' in p.parent.name.lower()]
        if not extensions:
            raise RuntimeError('Ubuntu tray extension is missing')
        subprocess.run(['gsettings', 'set', 'org.gnome.shell', 'enabled-extensions',
                        str(extensions)], check=True)
        subprocess.run(['gsettings', 'set', 'org.gnome.shell', 'disable-user-extensions', 'false'], check=True)
        bus = dbus.SessionBus()
        processes = []
        logs = []
        results = {'session':'GNOME on X11 / Xvfb', 'extensions':extensions, 'checks':{}}

        def launch(args, name):
            log = (report/(name+'.log')).open('w')
            logs.append(log)
            proc = subprocess.Popen(args, stdout=log, stderr=log)
            processes.append(proc)
            return proc

        def evaluate(js):
            proxy = bus.get_object('org.gnome.Shell','/org/gnome/Shell')
            ok, value = proxy.Eval(js, dbus_interface='org.gnome.Shell')
            if not ok:
                raise RuntimeError('GNOME evaluation failed: '+str(value))
            return json.loads(str(value))

        def wait_for(fn, timeout=30):
            deadline = time.monotonic()+timeout
            while time.monotonic()<deadline:
                try:
                    result=fn()
                    if result:
                        return result
                except dbus.DBusException:
                    pass
                time.sleep(.5)
            raise RuntimeError('Desktop condition timed out')

        def visible():
            return bool(subprocess.run(['xdotool','search','--onlyvisible','--name',
                                       '^TokenPlan Preview$'], capture_output=True).stdout.strip())

        def capture(name):
            subprocess.run(['import','-window','root',str(report/(name+'.png'))],check=True)

        # Find the real extension's button, not a fake StatusNotifier host.
        actor = "Object.values(Main.panel.statusArea).find(a=>a._indicator && String(a._indicator.id).includes('tokenplan'))"
        try:
            shell=launch(['gnome-shell','--x11','--replace','--unsafe-mode'],'gnome-shell')
            wait_for(lambda: bus.name_has_owner('org.gnome.Shell'))
            wait_for(lambda: evaluate('1')==1)
            extension_proxy=bus.get_object('org.gnome.Shell','/org/gnome/Shell')
            for uuid in extensions:
                extension_proxy.EnableExtension(uuid,dbus_interface='org.gnome.Shell.Extensions')
            wait_for(lambda: bus.name_has_owner('org.kde.StatusNotifierWatcher'))
            # GNOME can start in overview; test against the ordinary desktop.
            evaluate('Main.overview.hide(); true')
            wait_for(lambda: not evaluate('Main.overview.visible'))
            launch([executable],'tokenplan')
            wait_for(visible)
            coords=wait_for(lambda: evaluate(f"(()=>{{let a={actor};if(!a)return null;let [x,y]=a.get_transformed_position();let [w,h]=a.get_transformed_size();return Number.isFinite(x+w/2) && Number.isFinite(y+h/2) && w>0 && h>0 ? [x+w/2,y+h/2] : null;}})()"))
            time.sleep(3)
            # Close through the window manager: Tauri handles CloseRequested by
            # hiding the popup. The initial window may already have lost focus.
            if visible():
                evaluate("global.get_window_actors().find(a=>a.meta_window.get_title()==='TokenPlan Preview')?.meta_window.delete(global.get_current_time()); true")
            wait_for(lambda: not visible())
            def click(x,y,button=1):
                subprocess.run(['xdotool','mousemove',str(int(x)),str(int(y)),'click',str(button)],check=True)

            def menu_open():
                return evaluate(f'Boolean(({actor})?.menu?.isOpen)')

            def home_from_menu():
                if not menu_open():
                    click(*coords,button=3)
                wait_for(menu_open)
                point=evaluate(f"(()=>{{let a=({actor}).menu._getMenuItems()[0];a=a.actor || a;let [x,y]=a.get_transformed_position();return [x+a.width/2,y+a.height/2];}})()")
                click(*point)
                wait_for(visible)
                time.sleep(.5)

            # GNOME owns left-click routing. A menu OR direct Home is valid.
            click(*coords)
            time.sleep(1)
            results['left_click_route']='menu' if menu_open() else 'home' if visible() else 'none'
            results['checks']['system_left_click_works']=results['left_click_route']!='none'
            capture('left-click')
            if menu_open():
                subprocess.run(['xdotool','key','Escape'],check=True)
            click(*coords,button=3)
            wait_for(menu_open)
            results['checks']['right_click_shows_menu']=True
            capture('right-click')
            home_from_menu()
            results['checks']['menu_shows_home']=visible()
            capture('home')
            click(100,800)
            time.sleep(.5)
            results['checks']['desktop_click_hides_home']=not visible()
            capture('outside-click')

            other=launch(['xmessage','-title','Other App','-geometry','220x120+1000+400','Outside click target'],'other-app')
            time.sleep(1)
            home_from_menu()
            click(1100,460)
            time.sleep(.5)
            results['checks']['other_app_click_hides_home']=not visible()
            capture('other-app-click')

            # A tray host restart must not leave the popup permanently persistent.
            for uuid in extensions:
                extension_proxy.DisableExtension(uuid,dbus_interface='org.gnome.Shell.Extensions')
            wait_for(visible)
            time.sleep(.5)
            properties=subprocess.check_output(['xprop','-name','TokenPlan Preview','_NET_WM_STATE'],text=True)
            results['checks']['missing_tray_not_always_on_top']='_NET_WM_STATE_ABOVE' not in properties
            for uuid in extensions:
                extension_proxy.EnableExtension(uuid,dbus_interface='org.gnome.Shell.Extensions')
            wait_for(lambda: evaluate(f'Boolean({actor})'))
            time.sleep(1)
            home_from_menu()
            click(100,800)
            time.sleep(.5)
            results['checks']['tray_recovery_restores_hiding']=not visible()
            results['shell_alive']=shell.poll() is None
        finally:
            subprocess.run(['import','-window','root',str(report/'final-desktop.png')],check=False)
            (report/'results.json').write_text(json.dumps(results,indent=2)+'\n')
            for proc in reversed(processes):
                proc.terminate()
                try:
                    proc.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    proc.kill()
                    proc.wait()
            for log in logs:
                log.close()
        if not results['checks'] or not all(results['checks'].values()):
            raise RuntimeError('Desktop interaction failures: '+json.dumps(results))


if __name__=='__main__':
    main(sys.argv[1])
