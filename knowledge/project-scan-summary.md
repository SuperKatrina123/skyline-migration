# 项目扫描总览

> 基于 skyline-wxss / skyline-components / skyline-config 官方规则，独立扫描脚本生成。

## 基本信息

- **项目路径**：`/Users/sakura/Desktop/daydayup/application/xtaro-hotel-detail-page`
- **页面总数**：1（`pages/hoteldetail/detail/index`）
- **子分包页面**：pages/hoteldetail 作为独立分包
- **自定义组件数**：~50（components/）+ 2 个功能模块（modules/）
- **XTaro**：`@ctrip/xtaro@2.7.15` / `@ctrip/xtaro-cli@2.8.16`
- **Taro 版本**：3.5.12（通过 @ctrip/xtaro 依赖）
- **当前渲染引擎**：WebView（dist 已验证无 Skyline 配置残留）

## 代码统计

| 维度 | 数量 |
|---|---|
| 页面入口文件（tsx/ts） | 1,306 |
| 样式文件（scss/css/less） | 65 |
| style.ts 样式对象文件 | 290 |
| 配置 .config 文件 | 2（共用 + mini） |
| 总源码文件 | 1,376 |

## Skyline 迁移范围

| 问题类别 | 出现次数 | 影响范围 | 风险等级 |
|---|---|---|---|
| display:flex 缺 flexDirection | ~150 | 76 style.ts + 77 内联样式 | P0 |
| XScrollView 缺 type 属性 | ~10 | 全部 scroll-view 组件 | P0 |
| position:sticky | 5 | 5 个组件 | P0 |
| overflow-x:scroll/auto | 3 | 3 个组件 | P0 |
| overflow:scroll/auto | 2 | 2 个组件 | P0 |
| float | 1 | 1 个组件 | P0 |
| 页面级滚动 API（window.scrollY） | 11 | 4 个文件 | P0 |
| postion:fixed（需验证层级） | 18 | 多组件浮层/弹窗 | P1 |
| white-space:pre/pre-wrap/pre-line | 6 | 6 个文本组件 | P1 |
| overflow-wrap | 3 | 3 个组件 | P1 |
| background-clip | 1 | 1 个文件 | P1 |
| text-overflow:ellipsis（view 上） | 25 | 多组件 | P2 |
| backdrop-filter | 1 | BlurView 组件 | P2 |

## 建议的迁移顺序

| 批次 | 内容 | 原因 | 预估工作量 |
|---|---|---|---|
| Batch 1 | 配置 + flexDirection 批量修复 | 纯机械替换 | 小 |
| Batch 2 | overflow/sticky/float + scroll-view type | 中等复杂度 | 中 |
| Batch 3 | 页面滚动迁移（window.scrollY 替换） | 高风险 | 高 |
| Batch 4 | 文本样式 + 浮层验证 | 需真机测试 | 中 |
