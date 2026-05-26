# Migration Case: 房型浮层回退按钮和底部预订栏不可见（position:fixed 在 XScrollView 内失效）

## 问题现象

房型浮层打开后，回退按钮（LayerHeader 内 BackButton）和底部预订栏（price-bottom-wrapper）均不可见

## 风险类型

fixed-bottom, scroll

## 根因

LayerHeader（回退按钮）和 price-bottom-wrapper（底部预订栏）使用了 position:fixed，但位于 XScrollView 内部。WebView 下 position:fixed 相对于视口固定不受滚动影响，但 Skyline 下 scroll-view 内的 position:fixed 元素会随内容滚动，导致按钮和预订栏不可见。

## 目标组件

RoomListLayer

## 修复方案

- 将 LayerHeader 移到 XScrollView 外部（正常流顶部）
- 将 price-bottom-wrapper 移到 XScrollView 外部（正常流底部）
- room_layer_wrapper 改用 display:flex; flex-direction:column 布局
- room_layer_section 改用 flex:1 填充中间空间
- 移除 LayerHeader 的 position:fixed（改为 relative）
- 移除 price-bottom-wrapper 的 position:fixed

## 可复用规则

Skyline 下 position:fixed 元素不能放在 scroll-view 内部。如需在浮层中固定头部/底部，应将其移出 scroll-view 并用 flex 布局调整剩余滚动空间。

## 验证方法

- [ ] 浮层打开时回退按钮可见且在顶部
- [ ] 浮层打开时底部预订栏可见且在底部
- [ ] 滚动浮层内容时回退按钮保持可见（不随内容滚动）
- [ ] 滚动浮层内容时底部预订栏保持可见（不随内容滚动）
- [ ] 浮层可正常关闭（回退按钮点击）
- [ ] 底部预订栏按钮可正常点击
- [ ] H5 端浮层表现正常（回归）

## 适用条件

- 渲染引擎: WebView → Skyline
- 平台: weapp
- 风险类型: fixed-bottom, scroll
