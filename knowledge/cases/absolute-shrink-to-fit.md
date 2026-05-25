# Skyline 不支持 absolute 元素 shrink-to-fit

## 问题

WebView 下，`position: absolute` 元素没有显式 width 时，宽度由内容决定（CSS intrinsic sizing / shrink-to-fit）。

Skyline **不支持**此行为，absolute 元素必须有明确的宽度来源。

## 验证过的无效方案

| 方案 | 为何无效 |
|------|---------|
| `left + right` 隐式计算宽度 | Skyline 不通过 left+right 推算 width |
| 父容器加 `display:flex + flexDirection:row` | absolute + flex 容器在 Skyline 同样不 shrink-to-fit |
| 子元素加 `flex: 1` | 父容器本身无宽度，flex:1 无法撑开 |
| `enableScrollViewAutoSize: true` 配置 | 只影响 scroll-view 非滚动方向的尺寸，不解决外层容器宽度 |

## 正确方案

**动态计算宽度**：在 JS 层根据子元素数量/内容计算出实际需要的宽度，通过 state 设置到容器 style 上。

适用于内容数量不固定（服务端下发）的场景，不能写死固定值。

## 适用场景

- `position: absolute` 容器内放 scroll-view / 动态列表
- 容器宽度需要随内容收缩（有 maxWidth 上限）
- 子元素数量由服务端控制

## 关联 Issue

- skyline-issue-001: AlbumTab scroll-view 宽度未撑开
