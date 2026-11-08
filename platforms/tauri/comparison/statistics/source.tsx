// Development-only original-runtime adapter, outside the production source tree.
import {useLayoutEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {HistoryPage} from '@statistics-original';
import '@statistics-original-foundation';
import '@statistics-original-style';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import {scenario,bridge} from './scenarios';

const props=scenario(),ready=bridge('source');
function Demo(){useLayoutEffect(()=>{requestAnimationFrame(ready);},[]);return <HistoryPage {...props}/>;}
createRoot(document.getElementById('root')!).render(<Demo/>);
