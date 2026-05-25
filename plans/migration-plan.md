# Skyline 迁移方案

> 目标：将 `xtaro-hotel-detail-page` 小程序端从 WebView 迁移至 Skyline。
> XTaro 2.7.15 | Taro 3.5.12 | 单页面 pages/hoteldetail/detail

---

## 一、整体策略

1. **配置优先** — 能通过 rendererOptions 对齐 WebView 的差异，优先用配置消除，不改代码
2. **不改 H5/CRN 代码** — 所有修改限定在 `.mini.*` 文件或 mini-only 路径
3. **回退 = 关 AB 即回退，无需发版**（分流机制待定）

---

## 二、前置条件（Batch 0 — 已完成）

- [x] `index.config.mini.js` 已配 `navigationStyle: "custom"`
- [x] `index.config.mini.js` 已配 `disableScroll: true`
- [x] `index.config.mini.js` 已配 `renderer: "skyline"`
- [x] `index.config.mini.js` 已配 `componentFramework: "glass-easel"`
- [x] `rendererOptions.skyline.defaultDisplayBlock: true`（view 默认 block，消除 ~150 处 flexDirection）
- [x] `rendererOptions.skyline.defaultContentBox: true`（box-sizing 默认 content-box，对齐 Web）
- [x] `rendererOptions.skyline.tagNameStyleIsolation: "legacy"`（tag 选择器跨组件生效）
- [x] `rendererOptions.skyline.keyframeStyleIsolation: "legacy"`（@keyframe 跨组件生效）

---

## 三、配置已消除的问题（无需代码改动）

| 原计划项 | 原工作量 | 配置项 |
|---------|---------|--------|
| ~150 处 display:flex 加 flexDirection:'row' | 中 | `defaultDisplayBlock: true` |
| box-sizing 差异导致尺寸不一致 | 未知 | `defaultContentBox: true` |
| tag/id 选择器跨组件样式不生效 | 未知 | `tagNameStyleIsolation: "legacy"` |
| @keyframe 动画跨组件不生效 | 未知 | `keyframeStyleIsolation: "legacy"` |

---

## 四、分批次迁移计划（仅配置无法覆盖的）

> **WebView 影响**列标注该项变更对 WebView 渲染是否有副作用。标注「无影响」的项可提前并行到日常需求中完成。

| 批次 | 内容 | 风险 | 工作量 | WebView 影响 |
|---|---|---|---|---|
| **1 — CSS 不兼容属性 + scroll-view type** | | | | |
| 1a | 5 处 position:sticky → sticky-header/sticky-section | 中 | 中 | ⚠️ 有影响（DOM/布局调整） |
| 1b | 5 处 overflow:scroll/auto → scroll-view | 中 | 中 | ⚠️ 有影响（布局结构调整） |
| 1c | 1 处 float → flex 布局 | 低 | 小 | ⚠️ 有影响（布局改变） |
| 1d | ~10 处 scroll-view 加 type 属性 | 低 | 小 | ✅ 无影响（WebView 忽略未知属性） |
| **2 — 页面滚动体系迁移** | | | | |
| 2a | window.scrollY → scroll-view onScroll | 高 | 中 | ⚠️ 有影响（架构级改动） |
| 2b | window.scrollTo() → ScrollViewContext | 中 | 小 | ⚠️ 有影响 |
| 2c | window.addEventListener('scroll') 移除 | 高 | 小 | ⚠️ 有影响 |
| **3 — 文本样式** | | | | |
| 3a | white-space:pre/pre-wrap → 数据层处理或 text 组件 | 中 | 小 | ⚠️ 有影响 |
| 3b | overflow-wrap:break-word → word-break:break-all | 低 | 小 | ✅ 无影响（行为接近） |
| 3c | text-overflow:ellipsis 在 view 上 → `<text overflow="ellipsis" max-lines="N">` | 低 | 中 | ⚠️ 有影响（DOM 改动） |
| 3d | 多段文本内联 → text/span 组件或 flex 布局 | 低 | 中 | ⚠️ 有影响 |
| **4 — 验证** | | | | |
| 4a | position:fixed 浮层真机验证（z-index 仅兄弟节点生效） | 高 | 中 | ✅ 无影响（仅验证） |
| 4b | Video/Map 原生组件真机验证 | 中 | 中 | ✅ 无影响（仅验证） |
| 4c | 跨分包组件真机验证 | 中 | 小 | ✅ 无影响（仅验证） |
| 4d | scroll-view 子节点按需渲染验证（getBoundingClientRect） | 中 | 小 | ✅ 无影响（仅验证） |

---

## 五、运行时条件兼容（少量场景备用）

对于无法通用解决的差异，可按 renderer 条件兼容：

```javascript
// page.js
onLoad() { this.setData({ renderer: this.renderer }) }
```
```html
<view class="box {{renderer}}"></view>
```
```css
.box { position: fixed; }
.box.skyline { position: absolute; }
```

> 仅限少量无法通用的场景使用，不作为主要策略。

---

## 六、风险清单

| 风险 | 等级 | 缓解 |
|---|---|---|
| position:fixed 浮层层级错乱（z-index 无层叠上下文） | 高 | 真机验证；z-index 只对兄弟节点生效 |
| 滚动迁移导致位置丢失 | 高 | scrollTop 状态保持；AB 可回退 |
| position:absolute 相对坐标偏移（所有节点默认 relative） | 中 | 检查 absolute 元素的定位上下文 |
| scroll-view 子节点按需渲染 | 中 | getBoundingClientRect 需逐个获取 |
| 原生组件（Video/Map）行为差异 | 中 | 真机验证（开发者工具不支持） |
| 分包组件加载时序 | 中 | 真机验证 |
| animate 动画接口不支持 | 中 | 改用 worklet 动画 |
| 多段文本无法内联（不支持 inline） | 低 | 用 text/span 组件 |

---

## 七、回滚方案

**目标：关掉 AB 实验即可回退，无需发版。**

具体分流机制待定（双页面路由 / 动态跳转等），兼容改造先行。

---

## 八、验证清单

- [ ] 酒店详情页完整渲染
- [ ] scroll-view 滚动正常
- [ ] 吸顶替代方案正确
- [ ] fixed 浮层/弹窗正常（z-index 兄弟节点）
- [ ] 视频播放正常（真机）
- [ ] 地图展示正常（真机）
- [ ] 路由跳转正常
- [ ] 分包组件正常（真机）
- [ ] AB 实验回退正常
- [ ] absolute 定位元素位置正确
- [ ] 文本省略/换行正常
- [ ] 动画效果正常
