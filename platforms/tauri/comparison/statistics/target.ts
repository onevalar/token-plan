import {mount,tick} from 'svelte';
import HistoryPage from '../../src/svelte/HistoryPage.svelte';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '../../src/style.css';
import '../../src/svelte/theme.css';
import {scenario,bridge} from './scenarios';

const ready=bridge('target');
mount(HistoryPage,{target:document.getElementById('root')!,props:scenario()});
void tick().then(()=>requestAnimationFrame(ready));
