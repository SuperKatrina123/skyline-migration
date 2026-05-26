# Skyline 迁移方案

> 目标：将 `xtaro-hotel-detail-page` 小程序端从 WebView 迁移至 Skyline。
> XTaro 2.7.15 | Taro 3.5.12 | 单页面 pages/hoteldetail/detail

---

## 一、整体策略

1. **配置优先** — 能通过 rendererOptions 对齐 WebView 的差异，优先用配置消除，不改代码
2. **不改 H5/CRN 代码** — 所有修改限定在 `.mini.*` 文件或 mini-only 路径
3. **回退 = 关 AB 即回退，无需发版**（分流机制待定）

---

## 二、前置条件（Batch 0 — 已完成 ✅）

> **目标：** Skyline 页面正常打开，rendererOptions 全量配置生效，低版本用户自动 fallback WebView。
>
> **验证结果：** 基础库 3.8.12，模拟器正常启动 Skyline 渲染，布局无大面积错乱。

- [x] `renderer: "skyline"` + `componentFramework: "glass-easel"`
- [x] `disableScroll: true`（禁用页面级原生滚动，由 XScrollView 接管）
- [x] `disableABTest: true`（关闭微信侧灰度，由我方 AB SDK 控制分流）
- [x] `sdkVersionBegin: "3.8.0"` / `sdkVersionEnd: "15.255.255"`（低于 3.8.0 自动 fallback WebView）
- [x] `defaultDisplayBlock: true`（view 默认 block，消除 ~150 处 flexDirection 改动）
- [x] `defaultContentBox: false`（保持 Skyline 默认 border-box）
- [x] `tagNameStyleIsolation: "legacy"`（tag 选择器跨组件生效，对齐 WebView）
- [x] `enableScrollViewAutoSize: true`（scroll-view 自动根据内容撑开）
- [x] `keyframeStyleIsolation: "legacy"`（@keyframe 跨组件生效，对齐 WebView）

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

| 批次 | 内容 | 风险 | 工作量 | WebView 影响 | 进度 |
|---|---|---|---|---|---|
| **1 — CSS 不兼容属性 + scroll-view type** | | | | | |
| 1a | 8 处 position:sticky → transform:translateY + transition（#007 PhysicalRoomCard + IncapableHeader） | 中 | 中 | ⚠️ 有影响（布局调整） | ✅ #007 已修复（transform:translateY + transition:0.02s 替代 position:fixed） |
| 1b | 5 处 overflow:scroll/auto → scroll-view | 中 | 中 | ⚠️ 有影响（布局结构调整） | ❌ Issue #003 open，首次修复失败 |
| 1c | 1 处 float → position:absolute 布局 | 低 | 小 | ⚠️ 有影响（布局改变） | ✅ 验证通过 |
| 1d | scroll-view 加 type 属性 | 低 | 小 | ✅ 无影响 | ⏳ 部分修复（#015 HighlightFloat XScrollView 已加 type="list"，其余待统一排查） |
| **2 — 页面滚动体系迁移** | | | | | |
| 2a | onScroll 使用 e.detail.scrollTop 替代 getBoundingClientRect | 高 | 中 | ⚠️ 有影响 | ✅ 已修复 |
| 2b | scroll-view 添加 type="list" | 低 | 小 | ✅ 无影响 | ✅ 已修复 |
| 2c | 模块测量改用 createSelectorQuery（xDOMUtils 在 Skyline 要求 node 有 id/class） | 中 | 小 | ⚠️ 有影响（测量逻辑改动） | ✅ 已验证 |
| 2d | 清理 usePageScroll/mini 死代码 | 低 | 小 | ✅ 无影响 | ✅ 已修复 |
| **3 — 文本样式** | | | | | |
| 3a | white-space:pre/pre-wrap → 数据层处理或 text 组件 | 中 | 小 | ⚠️ 有影响 | ✅ 已修复 |
| 3b | overflow-wrap:break-word → word-break:break-all | 低 | 小 | ✅ 无影响（行为接近） | ✅ 已修复 |
| 3c | text-overflow:ellipsis 在 view 上 → `<text overflow="ellipsis" max-lines="N">` | 低 | 中 | ⚠️ 有影响（DOM 改动） | ✅ 已修复 |
| 3d | 多段文本内联 → text/span 组件或 flex 布局 | 低 | 中 | ⚠️ 有影响 | 未开始 |
| **4 — 验证** | | | | | |
| 4a | position:fixed 浮层真机验证（z-index 仅兄弟节点生效） | 高 | 中 | ✅ 无影响（仅验证） | 未开始 |
| 4b | Video/Map 原生组件真机验证 | 中 | 中 | ✅ 无影响（仅验证） | 未开始 |
| 4c | 跨分包组件真机验证 | 中 | 小 | ✅ 无影响（仅验证） | 未开始 |
| 4d | scroll-view 子节点按需渲染验证（getBoundingClientRect） | 中 | 小 | ✅ 无影响（仅验证） | 未开始 |

### 阻塞项

具体见 [Issues 汇总](../issues/SUMMARY.md)

| Issue | 现象 | 优先级 | 阻塞内容 | 状态 |
|-------|------|--------|----------|------|
| #001 | absolute 元素不能自动收缩包裹内容 | P1 | absolute shrink-to-fit 不支持 | 需 JS 动态计算宽度 |
| #005 | 筛选浮层无法显示 | P0 | 筛选浮层不可见 | z-index fix 无效，疑似 FilterProvider 状态未更新，待排查 |
| #003 | scroll-view 无滚动条 | P2 | overflow:scroll 滚动条 | 证据不足，需 more search |
| #011 | 整个页面经常卡死不动 | P0 | Skyline type=list 渲染阻塞 / 无限重绘 | draft / pending，待真机 profile |
| #012 | 页面 tab 锚定依然不准确 | P1 | ScrollViewContext.scrollTo() 偏移量偏差 | 暂未修复 |
| #013 | 首屏相册 tab 切换无效 | P0 | Skyline click 事件 / Swiper current prop 不同步 | enriched / ready_for_review，需真机确认调用链 |
| #014 | scroll 滚动显隐 + 吸顶掉帧 | P1 | onScroll 逻辑线程 → setState re-render 帧率不足 | draft / pending，需 worklet 迁移 |
| #015 | 首屏相册亮点浮层无法滚动 | P0 | XScrollView 缺少 type 属性 | enriched / ready_for_review，已加 type="list" 待验证 |

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
