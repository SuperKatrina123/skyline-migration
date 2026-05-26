# PopLayer/XPoplayer CSS 动画替代 wx.createAnimation

## 场景

Skyline 下 PopLayer/XPoplayer 浮层无法弹出，原因是内部使用 `Taro.createAnimation()`（即 `wx.createAnimation`），Skyline 不支持此 API。

## 方案

禁用组件内置动画 + CSS `@keyframes` 替代进入动画。

### 步骤

1. **禁用内置动画**：设置 `animationType="none"`
2. **添加 CSS class**：`className="pop-layer-animated"`
3. **定义 @keyframes**：在页面级 `.mini.scss` 中定义弹出动画
4. **关闭延迟**：`setTimeout` 延迟 200ms 卸载组件（避免退出动画被截断）

### 核心代码

```scss
// page-level .mini.scss
@keyframes popLayerIn {
    from {
        transform: translateY(100%);
        opacity: 0;
    }
    to {
        transform: translateY(0);
        opacity: 1;
    }
}
.pop-layer-animated {
    animation: popLayerIn 0.3s ease;
}
```

```tsx
<PopLayer
    visible
    animationType="none"
    className="pop-layer-animated"
    // ...
>
```

```tsx
// 关闭时延迟卸载，避免动画被截断
const onClose = (): void => {
    setTimeout(() => {
        props.onClose()
    }, 200)
}
```

### 适用范围

所有使用 PopLayer / XPoplayer 的场景均可统一采用此方案。

### 验证

- Chrome 模拟器（WebView mini）：动画正常
- Skyline 模拟器（Skyline renderer）：动画正常
- 双端 @keyframes 完全兼容

### 局限性

- 只有进入动画（弹出），退出动画因 Skyline 对 `animation-fill-mode` 的支持问题需要更复杂的 worklet 方案
- 关闭时 200ms 延迟是硬编码，若调整动画时长需同步修改
