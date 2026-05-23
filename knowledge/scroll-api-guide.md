# Skyline 滚动控制 API

> 记录项目滚动控制方式在 Skyline 下的兼容性。

## 项目滚动方式扫描

| 滚动方式 | 使用情况 | 涉及文件 | Skyline 兼容性 | 改造方案 |
|---|---|---|---|---|
| `window.scrollY` 读取滚动位置 | 页面滚动回调 | `usePageScroll/index.ts` | ❌ 不存在 | 改用 scroll-view 的 onScroll |
| `window.scrollTo()` 滚动到位置 | 滚动定位 | `ScrollBoundary/utils/index.ts` | ❌ 不存在 | 改用 ScrollViewContext.scrollTo() |
| `window.addEventListener('scroll')` | 页面滚动监听 | `usePageScroll/index.ts` | ❌ 不触发 | 改用 scroll-view scroll 事件 |
| `XScrollView` + onScroll | 主内容区滚动 | `PageContent/index.mini.tsx` | ⚠️ 兼容 | 加 type="list" + 可升级 worklet:onscrollupdate |
| `XScrollView` + xDOMUtils.getBoundingClientRect | 手动计算 scrollTop | `PageContent/index.mini.tsx` | ⚠️ 性能开销 | 可用 worklet:onscrollupdate 直接在 UI 线程读取 |
| `overflow:scroll` / `overflow-x:scroll/auto` | 局部滚动 | 5 组件 style 文件 | ❌ 不支持 | 改为 XScrollView 包裹 |
| ScrollViewContext（enhanced） | 程序化控制滚动 | 部分 XScrollView | ✅ 支持 | 需确保 enhanced 已开启 |

## 关键迁移点

1. **usePageScroll** → 移除 window.scrollY 依赖，改为读取 scroll-view 的 onScroll(scrollTop)
2. **PageContent XScrollView** → 加 `type="list"` + `disableScroll: true`
3. **ScrollBoundary** → window.scrollTo() 改为 ScrollViewContext.scrollTo()
4. **局部 overflow 滚动** → 全部改为 XScrollView
