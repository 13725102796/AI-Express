import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import path from "path";

// 紫微灵犀 Vite 配置
// - @/ 别名指向 src
// - dev server 端口 5173（H5 默认）
export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
