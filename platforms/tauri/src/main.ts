import {mount} from 'svelte';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './svelte/theme.css';
import './style.css';
import App from './svelte/App.svelte';

// The platform shell still owns native windows, tray indicators and data helpers.
mount(App,{target:document.getElementById('root')!});
