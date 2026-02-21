import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  root: __dirname, // src/renderer
  base: "./", // important for file:// in Electron
  build: {
    outDir: path.resolve(__dirname, "../../dist/renderer"),
    emptyOutDir: true,
  },
});
