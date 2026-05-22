# Skyline 滚动控制 API

> 由 AI 基于微信官方 `skyline-scroll-api` 文档填充。记录项目滚动控制方式在 Skyline 下的兼容性。

## API 族谱

| API 族谱 | 获取方式 | 线程 | 适用场景 |
|----------|---------|------|---------|
| ScrollViewContext | `NodesRef.node()` + `enhanced` | 逻辑线程 | 程序化滚动、下拉刷新 |
| DraggableSheetContext | `NodesRef.node()` | 逻辑线程 | 半屏面板控制 |
| worklet.scrollViewContext | `NodesRef.ref()` + SharedValue | UI 线程 | 手势联动滚动 |

## 项目滚动方式扫描

| 滚动方式 | 使用情况 | 涉及文件 | Skyline 兼容性 | 注意事项 |
|---------|---------|---------|---------------|---------|
| — | — | — | — | — |
