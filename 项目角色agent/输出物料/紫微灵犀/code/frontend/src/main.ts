import { createSSRApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";

// 紫微灵犀 入口
// - createSSRApp 是 uni-app 规定入口
// - Pinia 用于全局状态管理（user / chart / points / templates / reading）
export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  return {
    app,
    Pinia: pinia,
  };
}
