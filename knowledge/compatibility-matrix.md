# Skyline 兼容性矩阵

> 基于 skyline-wxss / skyline-components / skyline-config 官方规则评估。
> 参考：https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/wxss.html

## 配置已消除的差异

以下差异已通过 `rendererOptions` 配置对齐 WebView，无需代码改动：

| 差异 | 配置项 | 效果 |
|------|--------|------|
| view 默认 flex + column | `defaultDisplayBlock: true` | 默认 block，和 WebView 一致 |
| box-sizing 默认 border-box | `defaultContentBox: true` | 默认 content-box，和 Web 一致 |
| tag/id 选择器受样式隔离 | `tagNameStyleIsolation: "legacy"` | 跨组件生效，对齐 WebView |
| @keyframe 受样式隔离 | `keyframeStyleIsolation: "legacy"` | 跨组件生效，对齐 WebView |

## CSS 特性兼容性（仍需代码改动）

| CSS 特性 | 出现次数 | Skyline 支持 | 改造方案 | 优先级 |
|---|---|---|---|---|
| `position:sticky` | 5 | ❌ 不支持 | sticky-header / sticky-section 组件 | P0 |
| `overflow:scroll/auto` | 2 | ❌ 不支持 | 改为 scroll-view 包裹 | P0 |
| `overflow-x:scroll/auto` | 3 | ❌ 不支持 | 改为 scroll-view scroll-x | P0 |
| `float` | 1 | ❌ 不支持 | 改用 flex + marginLeft:auto | P0 |
| `white-space:pre/pre-wrap/pre-line` | 6 | ❌ 只支持 normal/nowrap | 数据层处理换行，或 text 组件 | P1 |
| `overflow-wrap:break-word` | 3 | ❌ 不支持 | 改用 `word-break:break-all` | P1 |
| `text-overflow:ellipsis` | 多处 | ⚠️ 需在 text 组件上同元素设 overflow:hidden + white-space:nowrap | text 组件同时设三个属性；`word-break:break-word` 映射为 normal | P1 |
| flex column + `alignItems:flex-start` 文字不继承宽度 | 多处 | ⚠️ 子元素不自动继承容器宽度 | 文字元素加 `alignSelf: 'stretch'` 或父容器设 `width: '100%'` | P1 |
| absolute 元素 shrink-to-fit | 1 | ❌ 不支持内容撑开宽度 | JS 动态计算宽度 | P1 |
| `background-clip` | 1 | ❌ 不支持 | 嵌套元素模拟 | P2 |
| `backdrop-filter` 多 function | 1 | ⚠️ 不支持组合/drop-shadow/url | 降级为单 function 或半透明背景 | P2 |
| `em` 单位 | 待扫描 | ❌ 不支持 | 改 rpx/px/rem | P1 |
| `currentColor` | 待扫描 | ❌ 不支持 | 显式写颜色值 | P2 |
| 多重 `box-shadow` | 待扫描 | ❌ 不支持叠加 | 嵌套元素模拟 | P2 |
| 多重 `background-image` | 待扫描 | ❌ 不支持多张 | 嵌套元素叠加 | P2 |
| `inline` 布局 | 待扫描 | ❌ 不支持 | text/span 组件或 flex 布局 | P1 |

## 组件兼容性

| 组件 | 使用情况 | Skyline 兼容性 | 注意事项 | 优先级 |
|---|---|---|---|---|
| `XScrollView`（XTaro 封装） | ~10 处 | ⚠️ 缺 type 属性 | 必须加 `type="list"`（或 custom/nested） | P0 |
| `scroll-view`（原生） | 少量 | ⚠️ 缺 type 属性 | 同上 | P0 |
| `XView` / `View` | 大量使用 | ✅ 支持 | — | — |
| `XImage` / `Image` | 大量使用 | ✅ 支持 | 仅 5 种缩放模式（无裁剪模式） | — |
| `XText` / `Text` | 大量使用 | ✅ 支持 | text-overflow 仅在 text 组件生效 | P2 |
| Video（原生视频） | 少量 | ⚠️ 有风险 | 需真机验证：黑屏/加载慢/断网恢复 | P2 |
| 跨分包组件 | 5 个 | ⚠️ 需验证 | 真机测试（开发者工具不支持原生组件调试） | Info |
| 自定义导航栏 | 已配 | ✅ 已配置 | `navigationStyle: "custom"` | — |

## JS API 兼容性

| API | 出现次数 | Skyline 兼容性 | 改造方案 | 优先级 |
|---|---|---|---|---|
| `window.scrollY` | 多处 | ❌ 不存在 | 改用 scroll-view onScroll | P0 |
| `window.scrollTo()` | 1 处 | ❌ 不支持 | 改用 ScrollViewContext.scrollTo() | P0 |
| `window.addEventListener('scroll')` | 1 处 | ❌ 不触发 | 改用 scroll-view scroll 事件 | P0 |
| `xDOMUtils.getBoundingClientRect` | ~3 处 | ⚠️ 性能开销大 | 可用 worklet:onscrollupdate 替代 | P1 |
| `animate` 动画接口 | 待扫描 | ❌ 不支持 | 改用 worklet 动画 | P1 |

## Skyline 特有行为（需注意）

| 行为 | 说明 | 影响 |
|---|---|---|
| z-index 无层叠上下文 | 只对兄弟节点生效，不支持 scroll-view 直接子节点 | fixed 浮层层级需验证 |
| position:absolute 定位 | 所有节点默认 relative，可能导致 absolute 相对坐标偏移 | 需检查 absolute 元素 |
| scroll-view 子节点按需渲染 | 不在屏的直接子节点不渲染 | getBoundingClientRect 需逐个获取 |
| border-color 默认 black | Web 默认 currentcolor | 显式指定则无影响 |
| position:fixed | 只支持相对 viewport，不支持 top/left/bottom/right 默认值 auto 解析 | 8.0.43+ 支持 |
| 原生组件开发者工具不渲染 | map/canvas/video/camera | 必须真机调试 |
| 热重载不支持 | Skyline 模式下 | 需重新编译预览 |

## Skyline 新增特性可收益点

| 场景 | 建议使用特性 | 预期收益 |
|---|---|---|
| 滚动位置跟踪 | worklet:onscrollupdate | UI 线程回调，无延迟 |
| 吸顶效果 | sticky-header / sticky-section | 原生吸顶，替代 position:sticky |
| 半屏面板 | draggable-sheet 组件 | 原生拖拽体验 |
| 文本省略 | `<text overflow="ellipsis" max-lines="N">` | 原生支持多行省略 |
| 条件兼容 | `this.renderer` + class 切换 | 少量场景按渲染器差异化 |
