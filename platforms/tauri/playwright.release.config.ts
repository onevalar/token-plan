import {defineConfig, type Project} from '@playwright/test';
import {layoutTests} from './playwright.suites';

// One complete suite per platform, using its native webview engine family.
// Shared tests retain their default viewport/motion; layout tests retain the
// compact viewport and reduced motion used by the interactive preview suite.
const projects: Project[] = (['macos', 'windows', 'linux'] as const).flatMap(platform => {
 const browserName = platform === 'windows' ? 'chromium' : 'webkit';
 const use = {
  browserName,
  ...(browserName === 'chromium' && process.env.TOKENPLAN_TEST_BROWSER
   ? {launchOptions: {executablePath: process.env.TOKENPLAN_TEST_BROWSER}} : {}),
 } as const;
 return [
  {name: `${platform}-shared`, testIgnore: layoutTests, metadata: {platform}, use},
  {name: `${platform}-layout`, testMatch: layoutTests, metadata: {platform},
   use: {...use, viewport: {width: 390, height: 680}, colorScheme: 'light', reducedMotion: 'reduce'}},
 ];
});

export default defineConfig({
 testDir: './tests',
 outputDir: './test-results-release',
 workers: 1,
 forbidOnly: true,
 globalTimeout: 60 * 60 * 1000,
 projects,
 use: {baseURL: 'http://127.0.0.1:1421', locale: 'zh-CN', trace: 'retain-on-failure'},
 webServer: {
  command: 'npx vite --host 127.0.0.1 --port 1421 --strictPort',
  url: 'http://127.0.0.1:1421', reuseExistingServer: false,
 },
});
