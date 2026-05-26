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

**WebView 影响**：✅ 无影响。Web 标准默认值即为 `row`，显式指定不会改变行为。

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

**WebView 影响**：✅ 无影响。WebView 忽略未知属性 `type`，行为不变。

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

**WebView 影响**：⚠️ 有影响。从 CSS 布局改为 scroll-view 组件，DOM 结构调整，两端都需要回归。

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

**WebView 影响**：⚠️ 有影响。DOM 结构调整或布局方式改变，两端都需要回归验证。

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

**WebView 影响**：⚠️ 有影响。这是架构级改动，改变页面滚动体系，两端都需要完整回归。

---

### 模式 6：XScrollView type="list" + 固定高度

**适用场景**：Skyline 下 XScrollView 内容无法滚动（滚动容器没有显式高度约束）

**迁移前**：
```tsx
<XScrollView
  type="list"
  scrollY
  style={{ minHeight, maxHeight }}
>
```

**迁移后**：
```tsx
<XScrollView
  type="list"
  scrollY
  style={{ minHeight, maxHeight, ...(IS_MINI ? { height: 0.6 * WindowHeight } : {}) }}
>
```

**说明**：Skyline 下 `type="list"` 的 scroll-view 需要固定的 `height`（或明确的视口约束）来确定滚动范围。仅 `minHeight`/`maxHeight` 不足以让 scroll-view 知道何时开始滚动。WebView 下 `minHeight`/`maxHeight` 足以让内容撑开滚动容器。使用 `...(IS_MINI ? { height: value } : {})` 模式避免影响 H5/CRN。

**WebView 影响**：✅ 无影响。条件守卫只在小程序端生效。

---

### 模式 7：text-overflow: ellipsis 兼容写法

**适用场景**：Skyline 下文字省略（单行/多行）

**迁移前**：
```ts
title: {
  width: 200,
  overflow: 'hidden',
  whiteSpace: 'nowrap' as const,
  textOverflow: 'ellipsis',
}
```

**迁移后**（三属性必须同元素设置）：
```ts
title: {
  width: 200,
  overflow: 'hidden',
  whiteSpace: 'nowrap' as const,
  textOverflow: 'ellipsis',
}
```

**说明**：Skyline 下 `text-overflow: ellipsis` **仅在 `<text>` 组件上生效**，且必须 `overflow:hidden` + `white-space:nowrap` 设在同一元素上。`word-break:break-word` 在 Skyline 下映射为 `normal`（不支持），需改用 `break-all`。推荐使用 text 组件的 `overflow="ellipsis"` 和 `max-lines="N"` 属性实现多行省略。

**WebView 影响**：✅ 无影响。标准 CSS 属性在不同渲染引擎下行为一致。

---

### 模式 8：flex column + alignItems:flex-start 子元素宽度继承

**适用场景**：flex column 布局中文字或其他子元素宽度未撑满容器

**迁移前**：
```ts
container: {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
}
childText: {
  // 未指定宽度，期望继承容器宽度
}
```

**迁移后**：
```ts
childText: {
  alignSelf: 'stretch',
  // 或父容器加 width: '100%'
}
```

**说明**：Skyline 下 flex column + `alignItems:flex-start` 时，子元素不自动继承容器宽度（Web 标准下 stretch 是默认行为）。这是因为 Skyline 的 flex 实现更严格地遵循了 `align-items` 对交叉轴的影响。文字的默认 `align-self` 不会自动拉伸。

**WebView 影响**：✅ 无影响。显式 `alignSelf: 'stretch'` 在 WebView 下也是合法值，行为不变。

---

### 模式 9：absolute 元素 shrink-to-fit 替代

**适用场景**：absolute 定位容器需要被子内容撑开宽度

**迁移前**：
```ts
container: {
  position: 'absolute',
  left: 16,
  // 期望内容撑开宽度
}
```

**迁移后**（方案 A — JS 动态计算宽度）：
```tsx
const [contentWidth, setContentWidth] = useState(0)
useEffect(() => {
  // 根据子元素数量和尺寸计算宽度
  setContentWidth(calculatedWidth)
}, [children])
// ...
<View style={{ position: 'absolute', left: 16, width: contentWidth }}>
```

**迁移后**（方案 B — 非 absolute 布局）：
```tsx
<View style={{ flexDirection: 'row' }}>
  <View style={{ width: 16 }} />
  <View style={{ flex: 1 }}>
    {/* 内容自动撑开 */}
  </View>
</View>
```

**说明**：Skyline 不支持 absolute 元素的 shrink-to-fit（即内容撑开宽度）。WebView 下 absolute 元素在 `left` + `right` 均未设置时会根据内容 intrinsic sizing 计算宽度。Skyline 下需显式指定宽度，或通过 JS 动态计算。

**WebView 影响**：⚠️ 方案 A 需要回归验证 JS 计算的宽度是否匹配原 shrink-to-fit 行为。

---

### 模式 10：Atom → Local State 同步时序

**适用场景**：Jotai atom 更新后通过 `useEffect` 同步到组件 local state，在 Skyline 下偶发不生效

**迁移前**：
```tsx
const currentImgVideoIndex = useAtomValue(imgVideoIndexAtom)
const [swiperIndex, setSwiperIndex] = useState(0)
const transitionEnabled = useAtomValue(transitionEnabledAtom)

useEffect(() => {
  if (transitionEnabled) {
    setSwiperIndex(currentImgVideoIndex)
  }
}, [currentImgVideoIndex, transitionEnabled])
```

**迁移后**：
```tsx
const currentImgVideoIndex = useAtomValue(imgVideoIndexAtom)
const [swiperIndex, setSwiperIndex] = useState(0)

useEffect(() => {
  setSwiperIndex(currentImgVideoIndex)
}, [currentImgVideoIndex])
```

**说明**：Skyline 渲染管道的时序与 WebView 不同，可能导致 `useEffect` 在依赖条件（如 `transitionEnabled`）为 false 时跳过执行，即使 atom 已经更新。移除不必要的条件守卫，让 local state 无条件跟随 atom 是最安全的做法。如果需要在特定时机阻止更新，应在 atom 层面（而非 effect 层面）控制。

**WebView 影响**：✅ 无影响。移除条件守卫只是去掉了不必要的跳过逻辑，WebView 下状态同步行为不变。
