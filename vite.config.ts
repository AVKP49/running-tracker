import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  root: "client", base: "./", plugins: [tailwindcss()],
  build: { outDir: "../dist", emptyOutDir: true },
});
