# rendererOptions.skyline 配置项

配置位置：`app.json` 或页面 `.json` 中的 `rendererOptions.skyline` 字段。

## 开启 Skyline 模式（开发调试）

在微信开发者工具中启用 Skyline 渲染：

1. **详情 → 本地设置** → 勾选「开启 Skyline 渲染调试」
2. **调试基础库** ≥ 3.0.0
3. 开启后模拟器左上角会显示当前 renderer 为 `skyline`

同时需要在 `app.json` 中配置：

```json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "lazyCodeLoading": "requiredComponents"
}
```

> 如果模拟器左上角仍显示 `webview`，检查：页面级 json 是否覆盖了 renderer、基础库版本是否过低、是否有不支持的组件导致 fallback。

## 完整配置示例

```json
{
  "rendererOptions": {
    "skyline": {
      "sdkVersionBegin": "3.8.0",
      "sdkVersionEnd": "15.255.255",
      "defaultDisplayBlock": true,
      "defaultContentBox": true,
      "tagNameStyleIsolation": "legacy",
      "enableScrollViewAutoSize": true,
      "keyframeStyleIsolation": "legacy",
      "disableABTest": true
    }
  }
}
```

## 配置项详解

### sdkVersionBegin / sdkVersionEnd

| 属性 | 值 |
|------|-----|
| 类型 | string（语义化版本号） |
| 默认值 | 无 |

指定 Skyline 渲染生效的**基础库版本范围**。只有用户基础库版本在 `[sdkVersionBegin, sdkVersionEnd]` 区间内时，才启用 Skyline 渲染；区间外的用户自动 fallback 到 WebView。

```json
"sdkVersionBegin": "3.8.0",
"sdkVersionEnd": "15.255.255"
```

- `sdkVersionBegin`：最低基础库版本，低于此版本的用户不走 Skyline
- `sdkVersionEnd`：最高基础库版本，一般设为一个极大值（如 `"15.255.255"`）表示不设上限

**推荐值**：如果全部 rendererOptions 属性都开启，`sdkVersionBegin` 应设为 `"3.8.0"`（取所有属性中最高要求 `keyframeStyleIsolation` 的 3.8.0），确保进入 Skyline 的用户所有配置项都能生效。

**核心价值**：解决"用户基础库版本不可控"的问题。通过设置合理的 `sdkVersionBegin`，可确保只有支持完整 rendererOptions 的用户才进入 Skyline，低版本用户安全地留在 WebView，无需防御性编码。

---

### defaultDisplayBlock

| 属性 | 值 |
|------|-----|
| 类型 | boolean |
| 默认值 | false |
| 最低基础库 | 2.31.1 |

Skyline 下节点默认为 **flex 布局**，设为 `true` 后切换为默认 **block 布局**，对齐 WebView 行为。

迁移时必开：WebView 中元素默认 `display: block`，不开启此项从 WebView 迁移过来的页面布局会大面积错乱。

---

### defaultContentBox

| 属性 | 值 |
|------|-----|
| 类型 | boolean |
| 默认值 | false |
| 最低基础库 | 3.1.0 |

Skyline 下节点默认为 **border-box** 盒模型，设为 `true` 后切换为默认 **content-box**，对齐 CSS 标准行为。

迁移时必开：CSS 标准和 WebView 默认 `box-sizing: content-box`，Skyline 默认 `border-box` 会导致已有尺寸计算不一致。

---

### tagNameStyleIsolation

| 属性 | 值 |
|------|-----|
| 类型 | string |
| 可选值 | `"legacy"` / `"isolated"` |
| 默认值 | `"isolated"` |
| 最低基础库 | 3.6.0 |

控制 tag 选择器（如 `view {}`, `text {}`）是否受组件样式隔离约束。

- `"legacy"` — tag 选择器**不受**样式隔离限制，可跨自定义组件匹配（对齐 WebView）
- `"isolated"` — tag 选择器**受**样式隔离限制，不跨组件匹配（Skyline 默认行为）

迁移时推荐设为 `"legacy"`：WebView 中 tag/id 选择器可穿透自定义组件边界生效，Skyline 默认不支持，设为 legacy 可兼容旧代码。

---

### enableScrollViewAutoSize

| 属性 | 值 |
|------|-----|
| 类型 | boolean |
| 默认值 | false |
| 最低基础库 | 3.7.2 |

Skyline 下 `scroll-view` 默认需要**显式指定宽高**才能撑开，设为 `true` 后可根据子节点内容**自动撑开**。

迁移时推荐开启：Skyline 没有全局页面滚动，必须用 `scroll-view`。不开启此项，每个 scroll-view 都要手动设置高度。

---

### keyframeStyleIsolation

| 属性 | 值 |
|------|-----|
| 类型 | string |
| 可选值 | `"legacy"` / `"isolated"` |
| 默认值 | `"isolated"` |
| 最低基础库 | 3.8.0 |

控制 `@keyframes` 规则是否受组件样式隔离约束。

- `"legacy"` — @keyframes **不受**样式隔离限制，可跨组件引用（对齐 WebView）
- `"isolated"` — @keyframes **受**样式隔离限制（Skyline 默认行为）

迁移时推荐设为 `"legacy"`：WebView 中父组件定义的 @keyframes 可被子组件引用，Skyline 默认隔离会导致动画失效。

---

### disableABTest

| 属性 | 值 |
|------|-----|
| 类型 | boolean |
| 默认值 | false |

关闭 Skyline AB 灰度实验。设为 `true` 后不经过 AB 实验，直接全量开启 Skyline 渲染。

适用于已完成迁移适配、希望所有用户统一使用 Skyline 的场景。

---

## 版本兼容策略

**用户基础库版本不可控**，低版本客户端会忽略不识别的 rendererOptions 字段（不会报错，但也不会生效）。需要注意：

### 各属性生效的最低版本

| 配置项 | 最低基础库 | 最低客户端 |
|--------|-----------|-----------|
| `defaultDisplayBlock` | 2.31.1 | Android 8.0.34 / iOS 8.0.36 |
| `defaultContentBox` | 3.1.0 | Android 8.0.42 / iOS 8.0.42 |
| `tagNameStyleIsolation` | 3.6.0 | Android 8.0.51 / iOS 8.0.51 |
| `enableScrollViewAutoSize` | 3.7.2 | Android 8.0.54 / iOS 8.0.54 |
| `keyframeStyleIsolation` | 3.8.0 | Android 8.0.57 / iOS 8.0.57 |
| `disableABTest` | 未明确标注 | — |

### 低版本 fallback 行为

当用户基础库版本低于上述要求时：

1. **renderer fallback**：基础库不支持 Skyline 时，整个页面会 fallback 到 WebView 渲染，此时 `rendererOptions.skyline` 全部无效（因为根本不走 Skyline）
2. **单项不生效**：基础库支持 Skyline 但版本低于某个属性要求时，该属性被忽略，页面仍用 Skyline 默认行为（flex 布局 / border-box 等）

### 防御性编码建议

由于不能假设所有用户都在高版本，迁移代码中**不应完全依赖 rendererOptions 来保证布局正确**：

```css
/* 不要只靠 defaultDisplayBlock，关键容器显式声明 */
.container {
  display: block;
}

/* 不要只靠 defaultContentBox，关键尺寸显式声明 */
.box {
  box-sizing: content-box;
}

/* 不要只靠 enableScrollViewAutoSize，给 scroll-view 设兜底高度 */
.scroll-wrapper {
  height: 100vh;
}
```

### 推荐做法

1. **rendererOptions 全部开启** — 作为高版本用户的优化，减少重复样式声明
2. **关键布局显式写样式** — 不依赖 rendererOptions 的隐式默认值，确保低版本也正常
3. **设置 `app.json` 的 `"renderer": "skyline"` 同时保留 WebView 兼容** — 低版本自动 fallback
4. **通过 `wx.getSystemInfoSync().environment` 或基础库版本判断做运行时降级**（仅在极端情况下使用）

## 迁移建议

官方推荐迁移时全部开启（boolean 设为 `true`，string 设为 `"legacy"`），核心目的是**让 Skyline 的默认行为对齐 WebView**，降低迁移成本，同时保证在低版本微信或 PC 端 fallback 到 WebView 时表现一致。

## 参考

- [官方迁移起步文档](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/migration/)
- [WXSS 样式差异](https://developers.weixin.qq.com/miniprogram/dev/framework/runtime/skyline/wxss.html)
- [官方参考模板](https://developers.weixin.qq.com/s/PnHHivmz8614)
