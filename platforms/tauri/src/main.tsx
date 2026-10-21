import {createRoot} from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './components/arc/foundation.css';
import './style.css';
import {DesktopApp} from './preview/App';

// Shared navigation on every platform; the native shell still owns window and tray behavior.
createRoot(document.getElementById('root')!).render(<DesktopApp/>);
