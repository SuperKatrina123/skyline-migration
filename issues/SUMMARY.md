# Skyline Migration Issue 汇总

## Open Issues

| ID | 标题 | 优先级 | 不兼容 API/特性 | 影响范围 | 状态 |
|----|------|--------|----------------|----------|------|
| 004 | 订房优惠领券点击无法唤起浮层 | **P0** | `wx.createAnimation` | 7 处 PopLayer 浮层全部失效 | enriched / ready_for_review |
| 001 | AlbumTab scroll-view 宽度未撑开 | **P1** | absolute 元素 shrink-to-fit | 图片 gallery tab 栏 | enriched / ready_for_review |
| 003 | 设施区域 scrollview 滚动条明显 | **P2** | `overflow: scroll`（疑似） | 设施推荐横向滚动 | enriched / insufficient_code_evidence |

## Closed Issues

| ID | 标题 | 不兼容 API/特性 | 修复方案 |
|----|------|----------------|----------|
| 002 | 评分区域评论文字超出容器未换行 | flex column + `alignItems:'start'` 不继承宽度 | 文字元素加 `alignSelf: 'stretch'` |

---

## 不兼容 API / 特性清单

| 不兼容项 | Skyline 表现 | 替代方案 | 关联 Issue |
|----------|-------------|----------|-----------|
| `wx.createAnimation` | 动画不执行，依赖它的组件停留在初始状态 | 1) 升级依赖版本 2) page-container/draggable-sheet 3) CSS transition / worklet 动画 | #004 |
| `position: sticky` | 不支持，需要原生组件替代 | scroll-view 内使用 `sticky-header` 组件 | Batch 1a（已修复 B 类 3 处） |
| absolute 元素 shrink-to-fit | 不支持内容撑开宽度（intrinsic sizing） | JS 动态计算宽度 | #001 |
| `overflow: scroll` | 可能产生原生滚动条 / 行为不一致 | 使用 scroll-view 组件控制滚动 | #003 |
| flex column + `alignItems:'start'` | 子元素不继承容器宽度，文字不换行 | 子元素加 `alignSelf: 'stretch'` | #002 (closed) |
| `wx.getSystemInfoSync` | deprecated 警告 | `wx.getWindowInfo()` | #004 附带 |

---

## 优先级说明

- **P0**: 功能完全不可用，用户核心路径阻断（如领券浮层无法弹出）
- **P1**: 视觉明显异常，影响用户体验但不阻断功能
- **P2**: 视觉细节问题，不影响功能使用
