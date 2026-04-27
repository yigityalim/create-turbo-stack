/**
 * Inline Eta templates for the Vite + Vue app type.
 *
 * Keys are output paths relative to the rendered app directory; values
 * are raw Eta source. The `<% if %>` / `<%= it.x %>` syntax follows the
 * same conventions as built-in templates in `packages/templates/`.
 */
export const VITE_VUE_TEMPLATES: Record<string, string> = {
  "index.html.eta": `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title><%= it.app.name %></title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
`,

  "vite.config.ts.eta": `import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: <%= it.app.port %>,
  },
});
`,

  "src/main.ts.eta": `import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

createApp(App).mount("#app");
`,

  "src/App.vue.eta": `<script setup lang="ts">
import { ref } from "vue";

const count = ref(0);
</script>

<template>
  <main>
    <h1><%= it.app.name %></h1>
    <button type="button" @click="count++">count is {{ count }}</button>
  </main>
</template>
`,

  "src/style.css.eta": `:root {
  font-family: system-ui, sans-serif;
  line-height: 1.5;
}

body {
  margin: 0;
  display: grid;
  place-items: center;
  min-height: 100vh;
}
`,

  "src/vite-env.d.ts.eta": `/// <reference types="vite/client" />
`,
};
