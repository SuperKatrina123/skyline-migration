# Skyline 迁移测试指南

> 适用于 `xtaro-hotel-detail-page` 项目从 WebView 到 Skyline 的迁移测试。
>
> 测试策略：静态扫描 → 开发者工具预览 → 真机验证，三层逐级递进。

---

## 一、测试架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│  第一层: 静态扫描 (Static Analysis)          🟢 全自动, CI 可集成    │
│                                                                     │
│  skyline-check.js  ── 源码级快速检查 (TSX/SCSS)                     │
│  TypeScript 编译   ── tsc --noEmit                                  │
│  项目构建          ── npm run build:mini                            │
├─────────────────────────────────────────────────────────────────────┤
│  第二层: 开发者工具预览 (DevTools Preview)    🟡 半自动, 人工确认     │
│                                                                     │
│  Skyline 模式渲染  ── 模拟器中检查布局/样式                          │
│  Console Warning   ── 检查不兼容日志                                 │
│  WXML 面板         ── 选中节点查看样式/盒模型                        │
├─────────────────────────────────────────────────────────────────────┤
│  第三层: 真机验证 (Real Device)              🔴 必需, 人工操作       │
│                                                                     │
│  iOS / Android 真机 ── 扫码预览                                        │
│  AB 实验开关       ── 分别验证 WebView 和 Skyline 模式               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 二、第一层：静态扫描

### 2.1 skyline-check.js（源码级，推荐 pre-commit）

```bash
# 检查未提交的变更（默认模式）
node scripts/skyline-check.js

# 检查指定 commit
node scripts/skyline-check.js --commit abc123

# 检查指定文件/目录
node scripts/skyline-check.js src/pages/hoteldetail/detail
```

检查范围：

| 类别 | 检查项 | 级别 |
|------|--------|------|
| Config | `navigationStyle: "custom"` 是否配置 | ERROR |
| Config | `disableScroll: true` 是否配置 | WARN |
| CSS | `position: sticky` 不支持 | ERROR |
| CSS | `overflow: auto/scroll` 需用 scroll-view | ERROR |
| CSS | `float` 不支持 | ERROR |
| CSS | `white-space: pre/pre-wrap/pre-line` 不支持 | ERROR |
| CSS | `overflow-wrap` 改用 `word-break` | ERROR |
| CSS | `text-overflow: ellipsis` 仅在 text 组件生效 | WARN |
| 组件 | 使用了不支持的组件（web-view, editor, movable-view 等） | ERROR |
| 组件 | scroll-view 缺少 `type` 属性 | ERROR |
| 内联样式 | `display: flex` 未设 `flexDirection` | WARN |

### 2.2 编译检查

```bash
# TypeScript 类型检查
npx tsc --noEmit

# 项目构建
npm run build:mini
```

### 2.3 集成到 CI / pre-commit

> 以下流程需要在**应用仓库**（`xtaro-hotel-detail-page`）中配置，不是本知识库。

#### 2.3.1 前置准备

将检查脚本复制到应用仓库：

```bash
# 在应用仓库根目录执行
mkdir -p scripts/
cp /Users/sakura/Desktop/DDU/skyline-migration/scripts/skyline-check.js scripts/
```

添加 npm scripts 到 `package.json`：

```json
{
  "scripts": {
    "skyline:check": "node scripts/skyline-check.js",
    "skyline:test": "npm run skyline:check && npx tsc --noEmit && npm run build:mini"
  }
}
```

#### 2.3.2 Pre-commit 钩子（推荐，提交前拦截）

使用 husky 在 `git commit` 前自动检查变更文件：

```bash
npm install husky --save-dev
npx husky install
npx husky add .husky/pre-commit "node scripts/skyline-check.js"
```

效果：每次 `git commit` 前自动扫描，有 ERROR 则阻断提交。

#### 2.3.3 GitHub Actions CI（PR 自动门禁）

在应用仓库创建 `.github/workflows/skyline-check.yml`：

```yaml
name: Skyline Compatibility Check

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  skyline-check:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # 需要完整 git 历史来 diff

      - uses: actions/setup-node@v4
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Skyline check (changed files)
        run: node scripts/skyline-check.js

      - name: TypeScript type check
        run: npx tsc --noEmit

      - name: Build
        run: npm run build:mini
```

效果：PR 提交或推送时自动运行，ERROR 会在 GitHub 上显示为 check failure，阻止合入。

#### 2.3.4 推荐组合

```
日常开发   node scripts/skyline-check.js       人工触发, <5s
提交代码   husky pre-commit hook               自动触发, 阻断 ERROR
PR 合入    GitHub Actions                      自动触发, CI 门禁
```

三个环节覆盖"改完立刻查 → 提交时拦截 → 合入前兜底"。

---

## 三、第二层：开发者工具预览

### 3.1 开启 Skyline 模式

```
微信开发者工具
  → 详情 → 本地设置 → 开启 Skyline 渲染调试
  → 调试基础库 ≥ 3.8.0（确保全部 rendererOptions 生效）
  → 模拟器左上角会显示当前 renderer 为 "skyline"
```

需要在 `app.json` 中配置：

```json
{
  "renderer": "skyline",
  "componentFramework": "glass-easel",
  "lazyCodeLoading": "requiredComponents",
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

> 详细配置说明见 `knowledge/renderer-options.md`
>
> 如果模拟器左上角仍显示 `webview`，检查：页面级 json 是否覆盖了 renderer、基础库版本是否低于 sdkVersionBegin、是否有不支持的组件导致 fallback。

### 3.2 检查清单

每批迁移完成后，在开发者工具中逐项确认：

#### 通用检查（每批必做）

- [ ] **Console 面板** 无新增 Skyline 不兼容 warning
- [ ] **WXML 面板** 选中改动过的节点，样式正确渲染
- [ ] **布局** 无错乱、重叠、溢出
- [ ] **文字** 无缺失、乱码、换行异常

#### Batch 1 专项（flexDirection / sticky / overflow / float）

- [ ] 所有改动过的 flex 容器方向正确（与原 WebView 表现一致）
- [ ] sticky 替代方案（fixed + 占位符 / sticky-header）吸顶行为正常
- [ ] overflow → scroll-view 替换后滚动正常（水平/垂直）
- [ ] float → flex 替换后位置正确

#### Batch 2 专项（文本样式）

- [ ] `white-space` 改动后文字换行/缩进与原来一致
- [ ] `overflow-wrap` → `word-break` 改动后断词位置合理
- [ ] `text-overflow: ellipsis` 改为 text 组件后省略生效

#### Batch 3 专项（滚动体系）

- [ ] XScrollView 加 `type="list"` 后滚动正常
- [ ] 移除 `window.scrollY` 后滚动位置跟踪正常
- [ ] `ScrollBoundary` 中 `window.scrollTo()` 替换为 `ScrollViewContext.scrollTo()` 工作正常
- [ ] 页面滚动流畅度无明显下降

### 3.3 已知限制

| 问题 | 影响 | 应对 |
|------|------|------|
| Skyline 热重载不支持 | 改代码需重新编译 | 改完后手动 Ctrl+S 触发编译 |
| WXML 面板样式不显示（部分基础库版本） | 不方便调试 | 切到基础库 3.7.12+ 或 3.6.6 |
| 原生组件（map/video/canvas）渲染失败 | 无法在工具中预览 | 跳过，直接真机验证 |
| 部分 worklet 行为与真机不一致 | 动画效果可能偏差 | worklet 相关改动必须真机验证 |

---

## 四、第三层：真机验证

### 4.1 环境准备

```
开发者工具 → 预览 → 扫码（选择 Skyline 模式）
要求:
  - Android: 微信 8.0.33+
  - iOS: 微信 8.0.34+
  - 基础库 ≥ 3.0.0
```

### 4.2 真机验证清单

#### Batch 3 真机检查（滚动）

- [ ] 页面滚动流畅，无明显卡顿 / 掉帧
- [ ] 滚动位置在页面切换后保持正确
- [ ] 列表滚动时吸顶模块行为正常
- [ ] 下拉/上拉交互手感正常

#### Batch 4 真机检查（必需）

- [ ] **fixed 浮层层级**：51 处 fixed 定位弹层/浮层显示正常，无被遮挡、层级错乱
- [ ] **Video 组件**（CommonVideo / ImmersiveHead）：播放、暂停、全屏正常
- [ ] **Map 组件**：酒店地图位置显示正常，交互无异常
- [ ] **跨分包组件**（detail-third-screen-list, pricelayer 等）：加载正常，交互无延迟
- [ ] **z-index 层叠**：同层级 z-index 按预期工作

#### AB 实验验证

- [ ] **AB 实验开（Skyline）**：所有核心功能正常
- [ ] **AB 实验关（WebView）**：回退后表现与迁移前一致，无退化
- [ ] 开关实验无需重新发版

### 4.3 真机测试记录模板

```markdown
## 真机测试记录

| 日期 | 机型 | 微信版本 | 基础库 | 测试人 | 结果 |
|------|------|---------|--------|--------|------|
|      |      |         |        |        |      |

### 问题记录

| 编号 | 模块 | 问题描述 | 严重程度 | 状态 |
|------|------|---------|---------|------|
|      |      |         |         |      |
```

---

## 五、逐批测试矩阵

| 批次 | 内容 | 静态扫描 | 开发者工具 | 真机 |
|------|------|---------|-----------|------|
| Batch 1 | CSS 机械修复（flexDirection/sticky/overflow/float） | ✅ 必做 | ✅ 必做 | — |
| Batch 2 | 文本样式（white-space/text-overflow/overflow-wrap） | ✅ 必做 | ✅ 必做 | — |
| Batch 3 | 滚动体系迁移 | ✅ 必做 | ✅ 必做 | ✅ 建议 |
| Batch 4 | fixed 浮层 + 原生组件 + 分包 | ✅ 必做 | — | ✅ **必需** |

---

## 六、常见问题处理

### 6.1 静态扫描通过但开发者工具渲染异常

```
可能原因:
  - skyline-check.js 检查的是 TSX/SCSS 源码，编译产物可能有差异
  - XTaro 编译过程可能引入或改变了样式

处理方法:
  → 检查编译后的 dist/mini/weapp/ 中对应的 WXSS 文件
  → 在开发者工具中查看实际渲染的 WXML 节点
```

### 6.2 开发者工具正常但真机异常

```
可能原因:
  - 开发者工具基础库版本与真机不一致
  - 原生组件（video/map）在工具中模拟不准确
  - fixed 层叠行为在真机上有差异

处理方法:
  → 先确认真机上基础库版本（wx.getSkylineInfoSync）
  → fixed 浮层问题尝试加 z-index 或调整节点层级
  → 原生组件问题对照微信官方文档检查使用方式
```

### 6.3 回退验证

```bash
# 如果某个 batch 改出问题，需要确认回退后是否正常
# 方案：关掉 AB 实验，切换到 WebView 模式验证

# 或使用 git 暂存
git stash
npm run build:mini  # 构建回退后的版本
# 验证 WebView 下正常
git stash pop
```

---

## 七、测试通过标准

一个 batch **测试通过**必须满足：

```
□ 静态扫描:
  □ skyline-check.js ERROR = 0
  □ tsc --noEmit 通过
  □ npm run build:mini 通过

□ 开发者工具预览:
  □ Console 无新增 Skyline warning
  □ 改动过的组件布局/样式正常
  □ 本 batch 专项检查项全部通过

□ 真机验证（如果适用）:
  □ 核心功能正常
  □ AB 实验回退后无退化
  □ 无新增 bug

□ 知识库:
  □ 本 batch 发现的新问题已补充到 compatibility-matrix.md
  □ 新迁移模式已补充到 migration-patterns.md
```
