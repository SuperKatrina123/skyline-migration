# Worklet 动画系统

> 记录项目动画使用情况及 Skyline 下的迁移方案。

## 项目动画方式扫描

| 动画类型 | 使用情况 | Skyline 兼容性 | 说明 |
|---|---|---|---|
| CSS transition | 部分组件使用 | ✅ 支持 | 无迁移成本 |
| CSS animation | 未大量使用 | ✅ 支持 | — |
| Worklet 动画 | **未使用** | ❌ 不存在 | 新能力，可引入优化手势 |
| requestAnimationFrame | 首屏优化 | ⚠️ 行为可能有差异 | 需验证 |
| 下拉刷新动画 | 未使用 | — | ScrollViewContext.triggerRefresh() |
