# 迁移模式库

> 从 xtaro-hotel-detail-page 迁移实践中提取的可复用模式。

### 模式 1：display:flex 缺 flexDirection

**适用场景**：style.ts 或内联样式中使用 `display: 'flex'` 未设置 `flexDirection`

**迁移前（WebView）**：
```ts
container: {
  display: 'flex',
  alignItems: 'center',
}
```

**迁移后（Skyline）**：
```ts
container: {
  display: 'flex',
  flexDirection: 'row',
  alignItems: 'center',
}
```

**说明**：Skyline 下 `<view>` 默认 `flex-direction: column`（Web 标准为 `row`）。配置 `defaultDisplayBlock: true` 后变为 `row`，但**显式设置是最安全的做法**。

---

### 模式 2：XScrollView 加 type 属性

**适用场景**：所有 XScrollView/scroll-view 组件

**迁移前**：
```tsx
<XScrollView scrollY enhanced>
```

**迁移后**：
```tsx
<XScrollView type="list" scrollY enhanced>
```

**说明**：Skyline 下 scroll-view 必须指定 type（list/custom/nested），否则编译报错。

---

### 模式 3：overflow:scroll/auto → XScrollView

**适用场景**：`overflow-x: scroll` 或 `overflow: auto` 实现的局部滚动

**迁移前**：
```scss
.container {
  overflow-x: scroll;
  white-space: nowrap;
}
```

**迁移后**：
```tsx
<XScrollView scroll-x type="list" enable-flex>
  {/* 内容 */}
</XScrollView>
```

**说明**：Skyline 不支持 overflow:scroll/auto，必须用 scroll-view。横向滚动需 `enable-flex`。

---

### 模式 4：position:sticky 替代

**适用场景**：需要吸顶效果的元素

**方案 A — sticky-header**（推荐，scroll-view 内部）：
```tsx
<scroll-view type="nested" scroll-y>
  <nested-scroll-header>
    <sticky-header><View>吸顶内容</View></sticky-header>
  </nested-scroll-header>
  <nested-scroll-body>{/* 滚动内容 */}</nested-scroll-body>
</scroll-view>
```

**方案 B — position:fixed + 占位符**（简单场景）：
```tsx
<View style={{ position: 'fixed', top: 0, zIndex: 100 }}>吸顶内容</View>
<View style={{ height: stickyHeight }} />
```

---

### 模式 5：页面级滚动 API → scroll-view 事件

**适用场景**：依赖 `window.scrollY` / `window.scrollTo` / `window.addEventListener('scroll')` 的代码

**迁移前**：
```ts
useEffect(() => {
  const onScroll = () => {
    console.log(window.scrollY)
    onScrollRef.current(window.scrollY)
  }
  window.addEventListener('scroll', onScroll)
  return () => window.removeEventListener('scroll', onScroll)
}, [])
```

**迁移后**：
```tsx
<XScrollView
  type="list"
  scrollY
  onScroll={(e) => {
    const scrollTop = e.detail?.scrollTop || 0
    onScrollRef.current(scrollTop)
  }}
>
```

**说明**：Skyline 下页面级全局滚动不存在，所有滚动必须在 scroll-view 内。
