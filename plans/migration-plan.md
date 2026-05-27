# Skyline 迁移方案

> 目标：将 `xtaro-hotel-detail-page` 小程序端从 WebView 迁移至 Skyline。
> XTaro 2.7.15 | Taro 3.5.12 | 单页面 pages/hoteldetail/detail

---

## 一、整体策略

1. **配置优先** — 能通过 rendererOptions 对齐 WebView 的差异，优先用配置消除，不改代码
2. **不改 H5/CRN 代码** — 所有修改限定在 `.mini.*` 文件或 mini-only 路径
3. **回退 = 关 AB 即回退，无需发版**（分流机制待定）

---

## 二、迁移阶段与当前状态

| 阶段 | 定位 | 当前状态 | 进入/退出标准 |
|---|---|---|---|
| **阶段 1 — 兼容** | 让 Skyline 页面主链路稳定可用，处理配置、滚动、样式、文本、浮层、路由等基础差异 | **收尾中，暂不 Done**。页面总体 OK，但测试点仍多；文字截断、文字换行计算仍是兼容阶段瓶颈 | 页面主链路通过；P0 阻断清零；P1 有明确 owner/结论；文字、浮层、滚动等高风险点完成真机抽检 |
| **阶段 2 — 专项优化** | 针对高风险高收益能力单独优化，不混入普通兼容修复 | **已启动：sticky/吸顶专项进行中** | 每个专项有方案、影响面、验收截图/视频和回退策略 |
| **阶段 3 — 查漏补缺** | 灰度前后补齐边界场景、机型差异、监控、回滚和知识沉淀 | 未启动 | 灰度数据稳定；遗留 issue 归档；可复用 case 写入 knowledge |

### 阶段 1 兼容收口重点

- 继续保持“页面总体 OK，但不标 Done”的状态，直到测试矩阵跑完。
- 文字兼容单独收口：长标题、标签、价格说明、房型名、套餐描述等高密度文本区必须抽检。
- `textOverflow`、`whiteSpace`、`wordBreak`、`flex column + alignItems:flex-start` 不能只依赖 agent 扫描，需要结合真机截图/视频。
- 兼容阶段只解决“能稳定跑”的问题；体验类滚动优化进入阶段 2。

### 阶段 2 专项优化队列

| 专项 | 状态 | 说明 | 关联 |
|---|---|---|---|
| sticky/吸顶优化 | **进行中** | 优先评估 `scroll-view type="custom"` + `sticky-section/sticky-header`，同时处理导航栏 offset、tab 锚定、快速滚动抖动和掉帧 | #014、#012、#007 |
| 长列表/按需渲染 | 待启动 | 验证 `type="list"`、直接子节点、测量 API 与分页加载表现 | #003、#011、4d |
| 滚动联动/锚点 | 待启动 | 统一 scrollTop、ScrollViewContext.scrollTo 偏移和 tab active 计算 | #012 |
| 动画/手势 | 待启动 | onScroll 高频 setState 改为 worklet 或低频状态同步 | #014 |

---

## 三、前置条件（Batch 0 — 已完成 ✅）

> **目标：** Skyline 页面正常打开，rendererOptions 全量配置生效，低版本用户自动 fallback WebView。
>
> **验证结果：** 基础库 3.8.12，模拟器正常启动 Skyline 渲染，布局无大面积错乱。

- [x] `renderer: "skyline"` + `componentFramework: "glass-easel"`
- [x] `disableScroll: true`（禁用页面级原生滚动，由 XScrollView 接管）
- [x] `disableABTest: true`（关闭微信侧灰度，由我方 AB SDK 控制分流）
- [x] `sdkVersionBegin: "3.8.0"` / `sdkVersionEnd: "15.255.255"`（低于 3.8.0 自动 fallback WebView）
- [x] `defaultDisplayBlock: true`（view 默认 block，消除 ~150 处 flexDirection 改动）
- [x] `defaultContentBox: false`（保持 Skyline 默认 border-box）
- [x] `tagNameStyleIsolation: "legacy"`（tag 选择器跨组件生效，对齐 WebView）
- [x] `enableScrollViewAutoSize: true`（scroll-view 自动根据内容撑开）
- [x] `keyframeStyleIsolation: "legacy"`（@keyframe 跨组件生效，对齐 WebView）

---

## 四、配置已消除的问题（无需代码改动）

| 原计划项 | 原工作量 | 配置项 |
|---------|---------|--------|
| ~150 处 display:flex 加 flexDirection:'row' | 中 | `defaultDisplayBlock: true` |
| box-sizing 差异导致尺寸不一致 | 未知 | `defaultContentBox: true` |
| tag/id 选择器跨组件样式不生效 | 未知 | `tagNameStyleIsolation: "legacy"` |
| @keyframe 动画跨组件不生效 | 未知 | `keyframeStyleIsolation: "legacy"` |

---

## 五、阶段 1：兼容收口计划（仅配置无法覆盖的）

> **WebView 影响**列标注该项变更对 WebView 渲染是否有副作用。标注「无影响」的项可提前并行到日常需求中完成。

| 批次 | 内容 | 风险 | 工作量 | WebView 影响 | 进度 |
|---|---|---|---|---|---|
| **1 — CSS 不兼容属性 + scroll-view type** | | | | | |
| 1a | 8 处 position:sticky → transform:translateY + transition（#007 PhysicalRoomCard + IncapableHeader） | 中 | 中 | ⚠️ 有影响（布局调整） | ✅ #007 已修复（transform:translateY + transition:0.02s 替代 position:fixed） |
| 1b | 5 处 overflow:scroll/auto → scroll-view | 中 | 中 | ⚠️ 有影响（布局结构调整） | ❌ Issue #003 open，首次修复失败 |
| 1c | 1 处 float → position:absolute 布局 | 低 | 小 | ⚠️ 有影响（布局改变） | ✅ 验证通过 |
| 1d | scroll-view 加 type 属性 | 低 | 小 | ✅ 无影响 | ⏳ 部分修复（#015 HighlightFloat XScrollView 已加 type="list"，其余待统一排查） |
| **2 — 页面滚动体系迁移** | | | | | |
| 2a | onScroll 使用 e.detail.scrollTop 替代 getBoundingClientRect | 高 | 中 | ⚠️ 有影响 | ✅ 已修复 |
| 2b | scroll-view 添加 type="list" | 低 | 小 | ✅ 无影响 | ✅ 已修复 |
| 2c | 模块测量改用 createSelectorQuery（xDOMUtils 在 Skyline 要求 node 有 id/class） | 中 | 小 | ⚠️ 有影响（测量逻辑改动） | ✅ 已验证 |
| 2d | 清理 usePageScroll/mini 死代码 | 低 | 小 | ✅ 无影响 | ✅ 已修复 |
| **3 — 文本样式** | | | | | |
| 3a | white-space:pre/pre-wrap → 数据层处理或 text 组件 | 中 | 小 | ⚠️ 有影响 | ⏳ 代码修复已做，待长文本/真机抽检收口 |
| 3b | overflow-wrap:break-word → word-break:break-all | 中 | 小 | ✅ 无影响（行为接近） | ⏳ 代码修复已做，待断词位置抽检 |
| 3c | text-overflow:ellipsis 在 view 上 → `<text overflow="ellipsis" max-lines="N">` | 中 | 中 | ⚠️ 有影响（DOM 改动） | ⏳ 代码修复已做，待单行/多行打点抽检 |
| 3d | 多段文本内联 → text/span 组件或 flex 布局 | 低 | 中 | ⚠️ 有影响 | 未开始 |
| 3e | flex column + alignItems:flex-start 子文本不继承宽度 | 中 | 小 | ✅ 无影响 | ⏳ 已沉淀规则，需补扫 style.ts + 真机验证 |
| **4 — 验证** | | | | | |
| 4a | position:fixed 浮层真机验证（z-index 仅兄弟节点生效） | 高 | 中 | ✅ 无影响（仅验证） | 未开始 |
| 4b | Video/Map 原生组件真机验证 | 中 | 中 | ✅ 无影响（仅验证） | 未开始 |
| 4c | 跨分包组件真机验证 | 中 | 小 | ✅ 无影响（仅验证） | 未开始 |
| 4d | scroll-view 子节点按需渲染验证（getBoundingClientRect） | 中 | 小 | ✅ 无影响（仅验证） | 未开始 |

### 阻塞项

具体见 [Issues 汇总](../issues/SUMMARY.md)

| Issue | 现象 | 优先级 | 阻塞内容 | 状态 |
|-------|------|--------|----------|------|
| #001 | absolute 元素不能自动收缩包裹内容 | P1 | absolute shrink-to-fit 不支持 | 需 JS 动态计算宽度 |
| #005 | 筛选浮层无法显示 | P0 | 筛选浮层不可见 | z-index fix 无效，疑似 FilterProvider 状态未更新，待排查 |
| #003 | scroll-view 无滚动条 | P2 | overflow:scroll 滚动条 | 证据不足，需 more search |
| #011 | 整个页面经常卡死不动 | P0 | Skyline type=list 渲染阻塞 / 无限重绘 | draft / pending，待真机 profile |
| #012 | 页面 tab 锚定依然不准确 | P1 | ScrollViewContext.scrollTo() 偏移量偏差 | 暂未修复 |
| #013 | 首屏相册 tab 切换无效 | P0 | Skyline click 事件 / Swiper current prop 不同步 | enriched / ready_for_review，需真机确认调用链 |
| #014 | scroll 滚动显隐 + 吸顶掉帧 | P1 | onScroll 逻辑线程 → setState re-render 帧率不足 | draft / pending，需 worklet 迁移 |
| #015 | 首屏相册亮点浮层无法滚动 | P0 | XScrollView 缺少 type 属性 | enriched / ready_for_review，已加 type="list" 待验证 |
| #016 | 文本溢出/截断多处不生效 | P1 | 文字截断、换行计算、ellipsis 同元素规则 | enriched / ready_for_fix，兼容阶段收口重点 |

---

## 六、阶段 2：sticky/吸顶专项计划（进行中）

> 目标：把吸顶从兼容修补中拆出来，作为滚动体验专项优化；优先保证稳定，再优化性能。

### 当前结论（2026-05-27）

- **不直接全量切 `scroll-view type="custom"`。** 当前项目真实 mini 构建产物中，`@ctrip/xtaro-mini/component/XScrollView` 只是透传到 Taro `ScrollView`；项目内未发现已验证的内部 `Sticky` / `SkylineScroll` 封装，也未发现 `sticky-section` / `sticky-header` 的落地 demo。
- **当前主页面继续使用 `XScrollView type="list"`。** 这符合 Skyline 下 `scroll-view` 必须声明 `type` 的边界，同时避免把详情页大量普通业务节点一次性重组为 `custom + sticky-section/list-view` 结构。
- **`type="custom" + sticky-section/sticky-header` 作为后续 POC，不作为当前直接改造入口。** 只有 xtaro-mcp / 内部 demo / 真机验证确认后，才考虑迁移顶部 Tab/Calendar 或房型 header。
- **阶段 2 当前策略：先减少 JS 滚动消费和布局抖动，再评估 native sticky。** 第一阶段、第二阶段 A/B/C 已完成；房型卡吸顶仍有真机抖动反馈，当前进入临时诊断日志阶段，先定位原因再继续改。

### 分阶段路线

| 阶段 | 目标 | 状态 | 说明 |
|---|---|---|---|
| 第一阶段 | 减少高频测量 + 顶部吸顶状态收口 + 顶部显隐不改布局 | ✅ 已完成 | 主滚动优先用 `event.detail.scrollTop`；顶部 `TabList + Calendar + Shadow` 合并到同一吸顶生命周期；显隐改为 `opacity + transform + pointerEvents` |
| 第二阶段 A | `roomListScrollPhaseAtom` 收口 BottomBar / MoveTop / ThirdScreen | ✅ 已完成，持续验证 | 统一房型区域顶部/底部 phase；修复 BottomBar 初始进入页面不显示；MoveTop 常驻显隐尝试因白屏撤回 |
| 第二阶段 B | `currentSectionAtom` 收口 tab 高亮 | ✅ 已完成 | 新增 `currentSectionAtom` / `sectionPhaseAtom`；`TabItem`、`TabListScroll` 改为消费统一 section 读口；点击 tab、埋点、业务阈值保持不变 |
| 第二阶段 C | `roomStickyPhaseAtom` 为房型 sticky POC 做准备 | ✅ 已完成，诊断中 | 新增 `roomStickyPhaseAtom`；房型 header / 房型卡 sticky 共享高度和 header 状态收口；房型卡仍保留 JS `translateY`，未迁 native sticky |
| 第二阶段 C-诊断 | 房型卡吸顶抖动定位 | 🔎 真机日志验证中 | 已移除 scroll-linked `transform transition`，补齐 `Sticky -> Pushed -> None` 状态机；仍有抖动反馈，已加 `[DEBUG-room-sticky-a9c4]` 临时日志定位状态跳变 / 测量漂移 / 高度变化 |
| 第三阶段 | 只对房型 header 做 native sticky POC | ⏳ 待启动 | 在隔离分支验证 `type="custom"` + `sticky-section/sticky-header`；不直接进入主链路 |
| 第四阶段 | 评估房型卡 sticky 是否值得迁移，或继续保留 JS `translateY` | ⏳ 待评估 | 房型卡涉及动态展开、售卖房型高度、手动 `setScrollTop`，最后决策 |

### 阶段细化

| 阶段 | 内容 | 修改范围 | 风险 | 进度 |
|---|---|---|---|---|
| 第一阶段 | 主滚动源优化 | `PageContent/index.mini.tsx` | 中 | ✅ `XScrollView` 补 `id="detail-scroll-view"`、`type="list"`；优先使用 `event.detail.scrollTop`，仅在缺失时 fallback 到 `getBoundingClientRect` |
| 第一阶段 | 顶部吸顶生命周期收口 | `scrollAtom/index.ts`、`DetailHead/index.tsx`、`DetailHead/style.ts` | 中 | ✅ 新增 `topStickyStateAtom`，`DetailHead` 不再分散订阅 4 个 sticky atom |
| 第一阶段 | 顶部 Tab/Calendar 显隐稳定化 | `DetailHead/index.tsx`、`DetailHead/style.ts` | 中 | ✅ `TabList + Calendar + Shadow` 合并到同一吸顶容器；shadow 改为零高度覆盖层，修复日历 bar gap |
| 第二阶段 A | 房型区域滚动 phase 收口 | `scrollAtom/index.ts`、`BottomBar/index.tsx`、`MoveTop/index.tsx`、`ThirdScreen/index.tsx` | 低 | ✅ 新增 `roomListScrollPhaseAtom`，收口 BottomBar / MoveTop / ThirdScreen 对房型顶部/底部阈值的重复消费 |
| 第二阶段 A | BottomBar 初始展示修正 | `scrollAtom/index.ts` | 低 | ✅ `isShowRoomListFloatBar` 加 `scrollY > 0` 门槛，避免初始测量完成后 BottomBar 露出 |
| 第二阶段 A | MoveTop 显隐验证 | `MoveTop/index.tsx` | 中 | ⚠️ 常驻隐藏态挂载 `XImageWithTrace` 后出现无 error 白屏；已恢复隐藏态轻量 `<XView />`，保留 phase 收口 |
| 第二阶段 B | tab 高亮/currentSection 收口 | `scrollAtom/index.ts`、`TabItem/index.tsx`、`TabListScroll/index.tsx` | 中 | ✅ 新增 `currentSectionAtom` / `sectionPhaseAtom`；直接消费 `activeTabItemAtomFamily(undefined)` 的 Tab 组件已切到统一读口；点击 tab 的 `isTabClickScroll` 逻辑保持不变 |
| 第二阶段 C | 房型 sticky phase 建模 | `scrollAtom/index.ts`、`IncapableHeader/index.tsx`、`PhysicalRoomCard/index.tsx` | 中 | ✅ 新增 `roomStickyPhaseAtom`；房型 header 与房型卡共享 sticky 高度/状态入口；不改接口、埋点、业务判断，不迁 native sticky |
| 第二阶段 C | 房型卡抖动诊断 | `PhysicalRoomCard/index.tsx` | 中 | 🔎 已加临时日志 `[DEBUG-room-sticky-a9c4]`，记录 `measure-top-change` / `metrics-change` / `state-change`；等待真机日志确认是状态边界抖、测量漂移、售卖房型高度变化，还是 Skyline 渲染层抖 |
| 第三阶段 | 房型 header native sticky POC | 隔离分支 | 中高 | ⏳ 只验证 header，不碰房型卡；确认 xTaro mini 对 `custom + sticky-header` 的真实支持后再决策 |
| 第四阶段 | 房型卡 sticky 迁移评估 | 隔离分支 | 高 | ⏳ 比较 native sticky 与现有 JS `translateY` 的稳定性、收益和回退成本 |

### 当前滚动链路状态

| 链路 | 当前状态 | 后续处理 |
|---|---|---|
| 主滚动值 | `XScrollView onScroll -> event.detail.scrollTop -> setScrollYAtom`；测量兜底保留 | 继续观察真机快速滚动稳定性 |
| 顶部吸顶 | `topStickyStateAtom -> DetailHead` 单点消费；Tab/Calendar 保持同一吸顶容器 | 已完成第一阶段；后续 native sticky 只做 POC，不直接切 `custom` |
| BottomBar / MoveTop / ThirdScreen | `roomListScrollPhaseAtom` 统一输出 show phase | 已完成第二阶段 A；MoveTop 暂不做常驻视觉显隐 |
| tab 高亮 / currentSection | `currentSectionAtom` / `sectionPhaseAtom` 统一输出；底层仍复用原 `activeTabItemAtomFamily` 阈值 | 第二阶段 B 已完成；后续如需进一步降频，再评估“只在 section 变化时更新”的写 atom 方案 |
| 房型 sticky 状态 | `roomStickyPhaseAtom` 统一输出房型 sticky 高度与 incapable header 状态；房型卡本地 layout / 状态机仍保留 | 第二阶段 C 已完成；当前重点是真机诊断抖动来源 |
| 房型 header 吸顶 | 仍为 JS 判断 + Skyline `transform:translateY`；消费 `roomStickyPhaseAtom` | 第三阶段单独 native sticky POC |
| 房型卡吸顶 | 仍为 JS 判断 + Skyline `transform:translateY`；已移除 transition，并补 `StickyState.Pushed`；临时日志观察中 | 第四阶段再评估是否迁移；先等真机日志定位 |

### 下一步最小计划

1. **真机采集房型卡吸顶日志**：过滤 `[DEBUG-room-sticky-a9c4]`，重点看抖动瞬间是否出现 `state-change` 反复跳、`metrics-change` 中 `stickyStart/stickyEnd` 漂移、或 `saleRoomListHeight` 变化。
2. **根据日志决定下一刀**：如果是状态边界抖，增加明确滞回/phase 锁；如果是测量漂移，收紧 `onMeasureLayout` 更新条件；如果 transform 值稳定但画面抖，优先进入 native sticky POC 或 worklet 方案评估。
3. **房型 header native sticky POC**：在隔离分支验证 `XScrollView type="custom"` + `sticky-section/sticky-header` 是否能在 xTaro mini 真机稳定渲染；未验证前不进入主链路。
4. **房型卡吸顶继续保守处理**：动态展开高度、售卖房型高度和手动 `setScrollTop` 耦合较重，第四阶段再评估是否值得迁移。
5. **MoveTop 显隐后续单独验证**：如需视觉显隐，先验证普通容器/普通图片，再验证 `XImageWithTrace`，不要和 phase 收口混在同一改动。

### 验收清单

- [x] 主滚动源不再每帧优先测量节点
- [x] 顶部 Tab/Calendar 吸顶生命周期已收口
- [x] 日历 bar 与上方吸顶区域无 gap
- [x] BottomBar 初始进入页面不显示
- [x] MoveTop 常驻显隐白屏问题已定位并撤回
- [x] tab 高亮已收口到 `currentSectionAtom` / `sectionPhaseAtom`
- [x] 房型 sticky 共享状态已收口到 `roomStickyPhaseAtom`
- [ ] 房型卡吸顶抖动日志已真机采集并归因
- [ ] 单吸顶、多吸顶、分组吸顶表现正确
- [ ] 快速滚动不抖动、不闪烁、不掉帧（持续真机观察）
- [ ] 吸顶层级不被导航栏、弹窗、原生组件遮挡
- [ ] `offset-top` 与自定义导航栏高度一致
- [ ] tab 锚定和 `ScrollViewContext.scrollTo()` 偏移正确
- [ ] 数据变化、筛选切换、返回恢复后吸顶状态正确
- [ ] iOS / Android 真机表现一致
- [ ] AB 回退路径明确

---

## 七、运行时条件兼容（少量场景备用）

对于无法通用解决的差异，可按 renderer 条件兼容：

```javascript
// page.js
onLoad() { this.setData({ renderer: this.renderer }) }
```
```html
<view class="box {{renderer}}"></view>
```
```css
.box { position: fixed; }
.box.skyline { position: absolute; }
```

> 仅限少量无法通用的场景使用，不作为主要策略。

---

## 八、风险清单

| 风险 | 等级 | 缓解 |
|---|---|---|
| position:fixed 浮层层级错乱（z-index 无层叠上下文） | 高 | 真机验证；z-index 只对兄弟节点生效 |
| 滚动迁移导致位置丢失 | 高 | scrollTop 状态保持；AB 可回退 |
| position:absolute 相对坐标偏移（所有节点默认 relative） | 中 | 检查 absolute 元素的定位上下文 |
| scroll-view 子节点按需渲染 | 中 | getBoundingClientRect 需逐个获取 |
| 原生组件（Video/Map）行为差异 | 中 | 真机验证（开发者工具不支持） |
| 分包组件加载时序 | 中 | 真机验证 |
| animate 动画接口不支持 | 中 | 改用 worklet 动画 |
| 多段文本无法内联（不支持 inline） | 低 | 用 text/span 组件 |
| 文字截断/换行计算与 WebView 不一致 | 高 | 静态扫描 + 长文本 mock + 真机截图/视频抽检 |
| 吸顶与滚动联动耦合导致掉帧或锚点偏移 | 高 | sticky 专项拆分；优先原生 sticky-header；必要时 worklet 化 |

---

## 九、回滚方案

**目标：关掉 AB 实验即可回退，无需发版。**

具体分流机制待定（双页面路由 / 动态跳转等），兼容改造先行。

---

## 十、阶段 1 兼容验证清单

- [ ] 酒店详情页完整渲染
- [ ] scroll-view 滚动正常
- [ ] 吸顶替代方案正确
- [ ] fixed 浮层/弹窗正常（z-index 兄弟节点）
- [ ] 视频播放正常（真机）
- [ ] 地图展示正常（真机）
- [ ] 路由跳转正常
- [ ] 分包组件正常（真机）
- [ ] AB 实验回退正常
- [ ] absolute 定位元素位置正确
- [ ] 文本省略/换行正常（长标题、标签、价格说明、房型名、套餐描述）
- [ ] 动画效果正常

---

## 十一、阶段 3：查漏补缺计划（待启动）

- [ ] 灰度问题按 P0/P1/P2 归档，P0 当日闭环
- [ ] iOS / Android / HarmonyOS / 低端机差异回归
- [ ] 空态、弱网、登录失效、数据刷新、返回恢复、分享进入等边界场景回归
- [ ] 白屏率、JS 错误率、页面卡死、首屏耗时、滚动帧率纳入观察
- [ ] 可复用案例写入 `knowledge/cases/`
- [ ] 未解决问题进入遗留池，标明是否影响全量
