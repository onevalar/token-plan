import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [svelte(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  clearScreen: false,
  // Archived design explorations are not application entries.
  optimizeDeps: { entries: ["index.html"] },
  server: { host: "127.0.0.1", port: 1420, strictPort: true },
});
