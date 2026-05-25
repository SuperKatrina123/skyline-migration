# Skyline 迁移方案

> 目标：将 `xtaro-hotel-detail-page` 小程序端从 WebView 迁移至 Skyline。
> XTaro 2.7.15 | Taro 3.5.12 | 单页面 pages/hoteldetail/detail

---

## 一、整体策略

1. **AB 实验只控制 renderer 配置** — 不做两套代码共存
2. **不改 H5/CRN 代码** — 所有修改限定在 `.mini.*` 文件或 mini-only 路径
3. **回退 = AB 关掉 + 发版** — 不引入运行时条件分支

---

## 二、前置条件

- [x] `index.config.mini.js` 已配 `navigationStyle: "custom"`
- [x] `index.config.mini.js` 已配 `disableScroll: true`
- [x] `index.config.mini.js` 已配 `renderer: "skyline"`
- [x] `index.config.mini.js` 已配 `componentFramework: "glass-easel"`

---

## 三、分批次迁移计划

> **WebView 影响**列标注该项变更对 WebView 渲染是否有副作用。标注「无影响」的项可提前并**并行**到日常需求中完成，无需等待 Skyline 上线批次。

| 批次 | 内容 | 风险 | 工作量 | WebView 影响 |
|---|---|---|---|---|
| **0 — Skyline 配置** | | | | |
| 0a | 页面 json Skyline 必需配置（renderer/componentFramework/disableScroll） | 低 | 小 | ✅ 无影响（仅 Skyline 侧生效） |
| **1 — flexDirection** | | | | |
| 1a | ~150 处 display:flex 加 flexDirection:'row' | 低 | 中（可脚本批量） | ✅ 无影响（Web 默认值即为 row） |
| **2 — CSS 不兼容属性 + scroll-view type** | | | | |
| 2a | 5 处 position:sticky → 替代方案 | 中 | 中 | ⚠️ 有影响（DOM/布局调整） |
| 2b | 5 处 overflow:scroll/auto → XScrollView | 中 | 中 | ⚠️ 有影响（布局结构调整） |
| 2c | 1 处 float → flex 布局 | 低 | 小 | ⚠️ 有影响（布局改变） |
| 2d | ~10 处 XScrollView 加 type 属性 | 低 | 小 | ✅ 无影响（WebView 忽略未知属性） |
| **3 — 页面滚动体系迁移** | | | | |
| 3a | window.scrollY → scroll-view onScroll | 高 | 中 | ⚠️ 有影响（架构级改动） |
| 3b | window.scrollTo() → ScrollViewContext | 中 | 小 | ⚠️ 有影响 |
| 3c | window.addEventListener('scroll') 移除 | 高 | 小 | ⚠️ 有影响 |
| **4 — 文本样式 + 验证** | | | | |
| 4a | white-space:pre → 数据层处理 | 中 | 小 | ⚠️ 有影响（两端行为都变） |
| 4b | overflow-wrap → word-break | 低 | 小 | ✅ 无影响（行为接近，可提前改） |
| 4c | text-overflow:ellipsis 在 view 上 → text 组件 | 低 | 中 | ⚠️ 有影响（DOM 改动） |
| 4d | position:fixed 浮层真机验证 | 高 | 中 | ✅ 无影响（仅验证，不改代码） |
| 4e | Video/Map 原生组件真机验证 | 中 | 中 | ✅ 无影响（仅验证） |
| | — Video：不需全屏，需验证黑屏/加载慢/断网恢复 | | | |
| 4f | 跨分包组件真机验证 | 中 | 小 | ✅ 无影响（仅验证） |

---

## 四、风险清单

| 风险 | 等级 | 缓解 |
|---|---|---|
| position:fixed 浮层层级错乱 | 高 | 真机验证，必要时调整 z-index |
| 滚动迁移导致位置丢失 | 高 | scrollTop 状态保持；AB 可回退 |
| 原生组件（Video/Map）行为差异 | 中 | 提前真机测试 |
| 分包组件加载时序 | 中 | 真机验证 |

---

## 五、回滚方案

**目标：关掉 AB 实验即可回退，无需发版。**

具体分流机制待定（双页面路由 / 动态跳转等），兼容改造先行。

---

## 六、验证清单

- [ ] 酒店详情页完整渲染
- [ ] XScrollView 滚动正常
- [ ] 吸顶替代方案正确
- [ ] fixed 浮层/弹窗正常
- [ ] 视频播放正常
- [ ] 地图展示正常
- [ ] 路由跳转正常
- [ ] 分包组件正常
- [ ] AB 实验回退正常
