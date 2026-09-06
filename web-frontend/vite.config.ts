import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");
  const devApiProxyTarget =
    env.VITE_DEV_API_PROXY_TARGET ?? "http://127.0.0.1:8011";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      host: "0.0.0.0",
      port: 5187,
      allowedHosts: ["de.ownai.icu"],
      proxy: {
        "/api": {
          target: devApiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
