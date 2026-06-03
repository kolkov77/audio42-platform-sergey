import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"

const basePath = process.env.BASE_PATH || "/"

export default defineConfig({
  base: basePath,
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 4173,
  },
})
