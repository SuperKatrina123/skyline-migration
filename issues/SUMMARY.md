# Skyline Migration Issue 汇总

## Open Issues

| ID | 标题 | 优先级 | 不兼容 API/特性 | 影响范围 | 状态 |
|----|------|--------|----------------|----------|------|
| 001 | AlbumTab scroll-view 宽度未撑开 | **P1** | absolute 元素 shrink-to-fit | 图片 gallery tab 栏 | enriched / ready_for_review |
| 003 | 设施区域 scrollview 滚动条明显 | **P2** | `overflow: scroll`（疑似） | 设施推荐横向滚动 | enriched / insufficient_code_evidence |
| 005 | 筛选浮层点击后不显示 | **P0** | Skyline z-index 兄弟节点作用域 | 筛选快速浮层 | enriched / insufficient_code_evidence |

## Closed Issues

| ID | 标题 | 不兼容 API/特性 | 修复方案 |
|----|------|----------------|----------|
| 002 | 评分区域评论文字超出容器未换行 | flex column + `alignItems:'start'` 不继承宽度 | 文字元素加 `alignSelf: 'stretch'` |
| 004 | 订房优惠领券点击无法唤起浮层 | `wx.createAnimation` | 禁用 PopLayer 内置动画 + CSS @keyframes 替代 |
| 006 | 货架价格浮层高度异常且缺少蒙层 | `wx.createAnimation`（PriceLayer 未传 isSkyline） | PriceLayerContainer 补传 `isSkyline` prop |
| 007 | 物理房型吸顶失效 | `position: sticky` 不支持 | PhysicalRoomCard/IncapableHeader 改用 transform:translateY + transition:0.02s |
| 008 | 页面 tab 锚定偏移 + 滚动范围异常 | Skyline type="list" scroll-top 定位不准 + 无 cache-extent | useScrollTo 改用 ScrollViewContext.scrollTo() + XScrollView 加 cacheExtent={2000} |

---

## 不兼容 API / 特性清单

| 不兼容项 | Skyline 表现 | 替代方案 | 关联 Issue |
|----------|-------------|----------|-----------|
| `wx.createAnimation` | 动画不执行，依赖它的组件停留在初始状态 | 禁用组件内置动画 + CSS @keyframes 替代 | #004 (closed) |
| `position: sticky` | 不支持，需要原生组件替代 | scroll-view 内使用 `sticky-header` 组件 | Batch 1a（已修复 B 类 3 处）、#007（物理房型） |
| absolute 元素 shrink-to-fit | 不支持内容撑开宽度（intrinsic sizing） | JS 动态计算宽度 | #001 |
| `overflow: scroll` | 可能产生原生滚动条 / 行为不一致 | 使用 scroll-view 组件控制滚动 | #003 |
| flex column + `alignItems:'start'` | 子元素不继承容器宽度，文字不换行 | 子元素加 `alignSelf: 'stretch'` | #002 (closed) |
| z-index 兄弟节点作用域 | 嵌套在无 z-index 容器中的 absolute 元素无法穿透层层级 | 在外层容器设置 position:relative + z-index | #005 |
| `wx.getSystemInfoSync` | deprecated 警告 | `wx.getWindowInfo()` | #004 |
| `scroll-top` prop in type="list" | 程序化滚动定位不准，偏移量计算与实际渲染不符 | `ScrollViewContext.scrollTo()` | #008 |
| type="list" 无 cache-extent | 只渲染可见节点，总内容高度估算偏小导致滚动范围异常 | 使用 `cache-extent` 预渲染 off-screen 内容 | #008 |

---

## 优先级说明

- **P0**: 功能完全不可用，用户核心路径阻断（如领券浮层无法弹出）
- **P1**: 视觉明显异常，影响用户体验但不阻断功能
- **P2**: 视觉细节问题，不影响功能使用
