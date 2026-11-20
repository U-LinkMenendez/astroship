import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import icon from "astro-icon";
import directPrivacyPage from "./scripts/direct-privacy-page.mjs";

// https://astro.build/config
export default defineConfig({
  site: "https://menendez.lat",
  integrations: [directPrivacyPage(), mdx(), sitemap(), icon()],
  vite: {
    plugins: [tailwindcss()],
  },
});
