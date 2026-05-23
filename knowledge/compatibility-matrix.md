# Skyline 兼容性矩阵

> 基于 skyline-wxss / skyline-components / skyline-config 官方规则评估。

## CSS 特性兼容性

| CSS 特性 | 出现次数 | Skyline 兼容性 | 改造方案 | 优先级 |
|---|---|---|---|---|
| `display:flex` 缺 `flexDirection` | ~150 | ⚠️ Skyline view 默认 flex-direction:column | 显式加 `flexDirection: 'row'` | P0 |
| `position:sticky` | 5 | ❌ 不支持 | 改用 sticky-header 或 position:fixed + 占位符 | P0 |
| `overflow:scroll` / `overflow:auto` | 2 | ❌ 不支持 | 改为 scroll-view 包裹 | P0 |
| `overflow-x:scroll` / `overflow-x:auto` | 3 | ❌ 不支持 | 改为 scroll-view scroll-x | P0 |
| `float` | 1 | ❌ 不支持 | 改用 flex + marginLeft:auto | P0 |
| `white-space:pre/pre-wrap/pre-line` | 6 | ❌ 不支持 | 数据层处理换行，或 text 组件 | P1 |
| `overflow-wrap:break-word` | 3 | ❌ 不支持 | 改用 `word-break:break-all` | P1 |
| `background-clip` | 1 | ❌ 不支持 | 嵌套元素模拟 | P1 |
| `text-overflow:ellipsis` | 25 | ⚠️ 仅在 text 组件生效 | 用 text 组件的 overflow/max-lines 属性 | P2 |
| `backdrop-filter` | 1 | ⚠️ 不支持 url()/drop-shadow 和多函数组合 | 降级为半透明背景 | P2 |
| `position:fixed` | 18 | ✅ 基本支持 | 需真机验证 z-index 层级 | Info |

## 组件兼容性

| 组件 | 使用情况 | Skyline 兼容性 | 注意事项 | 优先级 |
|---|---|---|---|---|
| `XScrollView`（XTaro 封装） | ~10 处 | ⚠️ 缺 type 属性 | 必须加 `type="list"`（或 custom/nested） | P0 |
| `scroll-view`（原生） | 少量 | ⚠️ 缺 type 属性 | 同上 | P0 |
| `XView` / `View` | 大量使用 | ✅ 支持 | — | — |
| `XImage` / `Image` | 大量使用 | ✅ 支持 | Skyline 仅 5 种缩放模式（无裁剪模式） | — |
| `XText` / `Text` | 大量使用 | ✅ 支持 | text-overflow:ellipsis 仅在 text 组件生效 | P2 |
| Video（原生视频） | 少量 | ⚠️ 需验证 | 真机测试层级和行为 | Info |
| 跨分包组件 | 5 个 | ⚠️ 需验证 | 分包引用需要真机测试 | Info |
| 自定义导航栏 | 已配 navigationStyle:custom | ✅ 已配置 | `index.config.mini.js` 已有 | — |

## JS API 兼容性

| API | 出现次数 | Skyline 兼容性 | 改造方案 | 优先级 |
|---|---|---|---|---|
| `window.scrollY` | 多处 | ❌ 不存在 | 改用 scroll-view onScroll | P0 |
| `window.scrollTo()` | 1 处 | ❌ 不支持 | 改用 ScrollViewContext.scrollTo() | P0 |
| `window.addEventListener('scroll')` | 1 处 | ❌ 不触发 | 改用 scroll-view scroll 事件 | P0 |
| `xDOMUtils.getBoundingClientRect` | ~3 处 | ⚠️ 性能开销大 | 可用 worklet:onscrollupdate 替代 | P1 |

## Skyline 新增特性可收益点

| 场景 | 建议使用特性 | 预期收益 |
|---|---|---|
| 滚动位置跟踪 | worklet:onscrollupdate | UI 线程回调，无延迟 |
| 吸顶效果 | sticky-header 组件 | 原生吸顶，替代 position:sticky |
| 半屏面板 | draggable-sheet 组件 | 原生拖拽体验 |
