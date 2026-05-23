# Skyline Migration Knowledge Base

将 XTaro 小程序项目从 WebView 迁移至 Skyline 的知识库。

## 核心原则

> ⚠️ **关键教训**：XTaro API/组件在 mini 端的兼容性不能仅靠表面判断。
> - `xDOMUtils` 底层是 `wx.createSelectorQuery()`（源码确认无 Skyline 分支）
> - `XPageContainer`/`PageContainer` 是空实现（Taro mini 端无映射，Stencil 版 `notSupport()`）
> - `XPoplayer` 在源 `@ctrip/xtaro` 中也不是空实现——源包甚至不含此组件
> - **必须查 `dist/mini/.../node_modules/@ctrip/xtaro-mini/` 确认真正的 mini 端实现**，因为 XTaro CLI 构建时会将组件路径重写为 `@ctrip/xtaro/platform/mini/`（此处 XPoplayer 为 `BaseComponent render null`）
> - 最可靠的方式：查 `dist/mini/weapp/` 的编译后 JS，确认组件是否出现在运行时包中

1. **AB 实验只控制 renderer 配置** — 不做两套代码共存，减少包体积
2. **CSS 属性不影响 H5/CRN 则直接改** — 属性影响 H5/CRN 则用 `IS_MINI` 条件分支保护
3. **大部分改动双向兼容** — `xDOMUtils`、`XPageContainer`、scroll-view `type` 等不改动即兼容
4. **不改 H5/CRN 代码** — 所有修改限定在小程序端
5. **回退 = AB 关掉 + 发版** — 不引入运行时条件分支

## 使用方式

### 首次迁移前：知识采集

**重要**：知识采集应基于**微信官方 Skyline 文档**，而不是先采集再修正。

```
1. 把项目路径告诉 AI
2. 调用微信官方 skill 获取兼容性数据：
   - skyline-components → 组件兼容性
   - skyline-wxss → WXSS 样式兼容性
   - skyline-config → 配置规范
   - skyline-scroll-api → scroll-view API
   - skyline-worklet → 动画系统
3. 通过 XTaro MCP 获取 XTaro 组件/API 信息
4. 扫描项目源码 + dist/mini/.../node_modules/@ctrip/*-mini/ 下的真实 mini 实现
   ⚠️ XTaro CLI 构建时会将 @ctrip/xtaro 重写为 @ctrip/xtaro/platform/mini/，源 node_modules 中的组件实现可能与实际构建结果不同
5. 填充 knowledge/ 下的文件
```

### 迁移中

```
1. AI 读 knowledge/ 下的现有数据理解项目
2. AI 读 guides/migration-patterns.md 参考迁移模式
3. AI 读 plans/migration-plan.md 了解迁移策略
4. 针对目标文件输出：分析 → diff → 注意事项
5. 迁移完成后，把新的迁移模式补充进 patterns.md
```

### 新对话继续使用时

直接把本项目录下的文件路径给 AI，AI 可以快速恢复上下文。

## CSS 样式改动规则

| 场景 | 做法 |
|------|------|
| 文件是 `.mini.scss` / `.mini.tsx` / `.mini.ts` | **直接改，不受限制** |
| 共享 style.ts，属性**影响 H5/CRN** | 用 `IS_MINI` 条件分支保护 |
| 共享 style.ts，属性**只影响小程序** | 直接改 |
| `position: fixed` / `@keyframes` | **先保留**，Skyline 下测试后决定是否需要改 |
| `overflow: auto/scroll` | 改 `.mini.*` 或用 `IS_MINI` 保护 |
| `display: flex`（默认 direction 差异） | `IS_MINI` 条件分支加 `flexDirection` |

## 迁移策略

**AB 实验只控制 `renderer: "skyline"` 配置**，代码只维护一份，不做两套代码：

```
AB 实验 (HTL_Skyline_Migration)
       │
       ▼
app.json renderer: "skyline"
       │
       ▼
同一份代码 → WebView 或 Skyline 渲染引擎
      （回退 = 关 AB + 发版）
```

详见 `plans/migration-plan.md`。

## 工作流概览

迁移分为 3 个步骤（详见 `guides/workflow.md` 和 `guides/testing-guide.md`）：

```
Step 1 ── 知识采集
  ├─ 加载微信 Skyline Skills + 官方文档
  ├─ 扫描源码 + dist/ 编译器产物确认真实实现
  ├─ 输出 6 个知识文件
  └─ 🔴 人工审核 → 进入 Step 2

Step 2 ── 分批次迁移
  ├─ Batch 1: 配置与 CSS 机械修复 (flexDirection/sticky/overflow/float)
  ├─ Batch 2: 文本与样式修复 (white-space/text-overflow/overflow-wrap)
  ├─ Batch 3: 滚动体系迁移 (window.scrollY 消除 / ScrollBoundary)
  └─ Batch 4: fixed浮层 + 原生组件 + 分包 (📱 真机验证)

Step 3 ── 验证与沉淀
  ├─ 🟢 静态扫描 (skyline-check.js + tsc + build)
  ├─ 🟡 开发者工具预览
  ├─ 🔴 AB 实验双场景验证 (Skyline + WebView)
  ├─ 📱 真机验证
  └─ 更新 knowledge/ + migration-patterns.md
```

## 文件结构

```
skyline-migration/
├── README.md                           # 本文件
├── CLAUDE.md                           # Claude Code 斜杠命令配置
├── knowledge/                          # 项目知识（AI 基于 Skyline 官方文档采集）
│   ├── component-mapping.md            # XTaro 组件 → 原生组件映射
│   ├── compatibility-matrix.md         # CSS/组件/JS API 兼容性矩阵
│   ├── project-scan-summary.md         # 项目扫描总览（含滚动/动画/路由数据）
│   ├── scroll-api-guide.md             # Skyline 滚动控制 API
│   ├── worklet-animation.md            # Worklet 动画系统
│   └── route-guide.md                  # 自定义路由与页面转场
├── guides/                             # 迁移参考
│   ├── migration-patterns.md           # 迁移模式示例库
│   ├── workflow.md                     # 三步骤工作流
│   └── testing-guide.md                # 三层测试指南
├── plans/                              # 迁移方案
│   └── migration-plan.md               # 分阶段迁移计划（含 AB 开关、CSS 规则、多端兼容）
├── scripts/
│   └── skyline-check.js                # Skyline 兼容性快速检查脚本
```

## 相关技能

| 技能 | 用途 | 对应知识文件 |
|------|------|------------|
| `skyline-components` | 官方组件兼容性 | `knowledge/component-mapping.md` |
| `skyline-wxss` | 官方 WXSS 样式支持 | `knowledge/compatibility-matrix.md` |
| `skyline-config` | 官方配置规范 | `knowledge/compatibility-matrix.md` |
| `skyline-scroll-api` | scroll-view API | `knowledge/scroll-api-guide.md` |
| `skyline-worklet` | Worklet 动画系统 | `knowledge/worklet-animation.md` |
| `skyline-route` | 自定义路由与页面转场 | `knowledge/route-guide.md` |
| `xtaro-skyline-switch` | XTaro 迁移工作流 | 工作流方法和决策
| XTaro MCP | XTaro 组件/API 信息 | 组件映射参考
