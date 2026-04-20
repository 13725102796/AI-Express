<script setup lang="ts">
/**
 * App.vue — 全局根组件
 * 职责：
 * 1) 全局 lifecycle（onLaunch/onShow/onHide）
 * 2) 字体加载（H5 引入 Google Fonts；小程序用 uni.loadFontFace 降级）
 * 3) 全局 CSS 变量（:root）与 reset
 */
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";

onLaunch(() => {
  // 字体加载：小程序端用 loadFontFace（加载失败静默降级到 serif）
  // H5 端通过 index.html <link> 已经加载，这里跳过
  // #ifdef MP-WEIXIN
  try {
    uni.loadFontFace({
      family: "Noto Serif SC",
      source: 'url("https://fonts.gstatic.com/s/notoserifsc/v1/H4chBXePl9DZ0Xe7gG9cyOj7oqCcbzhqDtg.woff2")',
      global: true,
      success: () => console.log("[font] Noto Serif SC 加载成功"),
      fail: (e) => console.warn("[font] Noto Serif SC 加载失败，降级到系统 serif", e),
    });
  } catch (e) {
    console.warn("[font] loadFontFace 不可用", e);
  }
  // #endif
  console.log("[App] 紫微灵犀 启动");
});

onShow(() => {
  console.log("[App] Show");
});

onHide(() => {
  console.log("[App] Hide");
});
</script>

<style lang="scss">
/* ========== 全局 CSS 变量（page-specs.md 第 0.1 节硬约束，禁止紫金御阁） ========== */
page {
  --c-gold: #D4AF37;
  --c-gold-dim: rgba(212, 175, 55, 0.4);
  --c-gold-soft: rgba(212, 175, 55, 0.1);
  --c-bg: #000000;
  --text-main: rgba(255, 255, 255, 0.9);
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-dim: rgba(255, 255, 255, 0.4);
  --text-subtle: rgba(255, 255, 255, 0.3);
  --text-faint: rgba(255, 255, 255, 0.2);
  --form-bg: rgba(10, 10, 15, 0.8);
  --c-error: #ff3333;

  background: var(--c-bg);
  color: var(--text-main);
  font-family: "Noto Serif SC", serif;
  min-height: 100vh;
}

/* H5 根元素兜底 */
/* #ifdef H5 */
:root {
  --c-gold: #D4AF37;
  --c-gold-dim: rgba(212, 175, 55, 0.4);
  --c-gold-soft: rgba(212, 175, 55, 0.1);
  --c-bg: #000000;
  --text-main: rgba(255, 255, 255, 0.9);
  --text-secondary: rgba(255, 255, 255, 0.6);
  --text-dim: rgba(255, 255, 255, 0.4);
  --text-subtle: rgba(255, 255, 255, 0.3);
  --text-faint: rgba(255, 255, 255, 0.2);
  --form-bg: rgba(10, 10, 15, 0.8);
  --c-error: #ff3333;
}

body,
html,
#app {
  background: #000000;
  color: rgba(255, 255, 255, 0.9);
  font-family: "Noto Serif SC", serif;
  margin: 0;
  padding: 0;
  min-height: 100vh;
}

/**
 * H5 端隐藏 uni-h5 自动渲染的 <uni-tabbar>（它叠加在 BaseTabBar 上会导致双 Tab 栈）
 * pages.json 中仍保留 tabBar 配置（custom: true）以满足 uni-h5 的 useShowTabBar 依赖
 */
uni-tabbar,
.uni-tabbar {
  display: none !important;
}
/* #endif */
</style>
