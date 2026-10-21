import {defineConfig} from '@playwright/test';
export default defineConfig({
 outputDir:'./test-results-navigation',testDir:'./tests',testMatch:'navigation-preview.spec.ts',workers:1,
 projects:[{name:'macos',use:{browserName:'webkit'},metadata:{platform:'macos'}},{name:'windows',use:{browserName:'chromium',launchOptions:process.env.TOKENPLAN_TEST_BROWSER?{executablePath:process.env.TOKENPLAN_TEST_BROWSER}:{}},metadata:{platform:'windows'}},{name:'linux',use:{browserName:'chromium',launchOptions:process.env.TOKENPLAN_TEST_BROWSER?{executablePath:process.env.TOKENPLAN_TEST_BROWSER}:{}},metadata:{platform:'linux'}}],
 use:{baseURL:'http://127.0.0.1:1421',locale:'zh-CN',viewport:{width:390,height:680},colorScheme:'light',reducedMotion:'reduce'},
 webServer:{command:'npx vite --host 127.0.0.1 --port 1421 --strictPort',url:'http://127.0.0.1:1421',reuseExistingServer:false},
});
