import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'./tests',testMatch:'navigation-preview.spec.ts',workers:1,
 use:{browserName:'webkit',baseURL:'http://127.0.0.1:1421',locale:'zh-CN',viewport:{width:390,height:680},colorScheme:'light',reducedMotion:'reduce'},
 webServer:{command:'VITE_MAC_NAVIGATION_PREVIEW=1 npx vite --host 127.0.0.1 --port 1421 --strictPort',url:'http://127.0.0.1:1421',reuseExistingServer:false},
});
