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
- [ ] 补 `disableScroll: true`（已用 XScrollView 但未禁用页面级滚动）
- [ ] app.json 配 `renderer: "skyline"`、`componentFramework: "glass-easel"`、`lazyCodeLoading: "requiredComponents"`
- [ ] app.json 配 `rendererOptions.defaultDisplayBlock: true`、`defaultContentBox: true`

---

## 三、分批次迁移计划

| 批次 | 内容 | 风险 | 工作量 |
|---|---|---|---|
| **1 — 配置 + flexDirection** | | | |
| 1a | app.json + 页面 json Skyline 必需配置 | 低 | 小 |
| 1b | ~150 处 display:flex 加 flexDirection:'row' | 低 | 中（可脚本批量） |
| **2 — CSS 不兼容属性 + scroll-view type** | | | |
| 2a | 5 处 position:sticky → 替代方案 | 中 | 中 |
| 2b | 5 处 overflow:scroll/auto → XScrollView | 中 | 中 |
| 2c | 1 处 float → flex 布局 | 低 | 小 |
| 2d | ~10 处 XScrollView 加 type 属性 | 低 | 小 |
| **3 — 页面滚动体系迁移** | | | |
| 3a | window.scrollY → scroll-view onScroll | 高 | 中 |
| 3b | window.scrollTo() → ScrollViewContext | 中 | 小 |
| 3c | window.addEventListener('scroll') 移除 | 高 | 小 |
| **4 — 文本样式 + 验证** | | | |
| 4a | white-space:pre → 数据层处理 | 中 | 小 |
| 4b | overflow-wrap → word-break | 低 | 小 |
| 4c | text-overflow:ellipsis 在 view 上 → text 组件 | 低 | 中 |
| 4d | position:fixed 浮层真机验证 | 高 | 中 |
| 4e | Video/Map 原生组件真机验证 | 高 | 中 |
| 4f | 跨分包组件真机验证 | 中 | 小 |

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

1. 关掉 AB 实验
2. 发版回退
3. 如仅改 `.mini.*` 文件，可直接恢复

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
