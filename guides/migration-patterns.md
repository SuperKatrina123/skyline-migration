# 迁移模式库

> 从实际迁移案例中提取的可复用模式。每次完成一个页面的迁移后，将新的模式补充进来。

## 模式格式

```markdown
### 模式 N：<模式名称>

**适用场景**：什么样的代码需要用到这个模式

**迁移前 (WebView)**：
```tsx
// 代码示例
```

**迁移后 (Skyline)**：
```tsx
// 代码示例
```

**注意事项**：
- 此处列出边界情况和容易踩坑的点

**参考来源**：pages/xxx PR #xx
```

---

## 模式 1：fixed 定位 → annotation

**适用场景**：顶部导航栏、底部 TabBar、悬浮按钮等需要 fixed 定位的元素

**迁移前 (WebView)**：
```tsx
<View className="header" style="position: fixed; top: 0; z-index: 100">
  标题
</View>
```

**迁移后 (Skyline)**：
```tsx
<View className="header" annotation="{{ type: 'fixed', top: 0, zIndex: 100 }}">
  标题
</View>
```

**注意事项**：
- annotation 需要传入对象，不能传字符串
- 父容器需要设置 overflow: visible
- annotation 不支持动态更新位置，如需动态更新请用 worklet

**参考来源**：

---

## 更多模式（待补充）

<!-- 迁移完成后陆续添加：

- scroll-view onScroll 事件处理差异
- wx.createSelectorQuery → Skyline 下的替代方案
- CSS animation → worklet 动画
- 原生组件包裹器模式
- button open-type 替代方案
- webp 图片处理
- 三端组件在 Skyline 下的 fallback 方案

-->
