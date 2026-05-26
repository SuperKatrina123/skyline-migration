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

## 配置优先策略

能通过 `rendererOptions` 配置对齐 WebView 的差异，优先用配置消除，不改代码：

```json
"rendererOptions": {
    "skyline": {
        "disableABTest": true,
        "defaultDisplayBlock": true,
        "defaultContentBox": false,
        "tagNameStyleIsolation": "legacy",
        "enableScrollViewAutoSize": true,
        "keyframeStyleIsolation": "legacy",
        "sdkVersionBegin": "3.8.0",
        "sdkVersionEnd": "15.255.255"
    }
}
```

| 配置 | 消除的问题 |
|------|-----------|
| `disableABTest: true` | 关闭微信侧灰度，由我方 AB SDK 控制分流 |
| `defaultDisplayBlock: true` | view 默认 flex+column → 改为 block（消除 ~150 处 flexDirection） |
| `defaultContentBox: false` | 保持 Skyline 默认 border-box（项目已适配） |
| `tagNameStyleIsolation: "legacy"` | tag 选择器跨组件不生效 → 对齐 WebView |
| `enableScrollViewAutoSize: true` | scroll-view 需显式宽高 → 自动根据内容撑开 |
| `keyframeStyleIsolation: "legacy"` | @keyframe 跨组件不生效 → 对齐 WebView |
| `sdkVersionBegin: "3.8.0"` | 低于 3.8.0 自动 fallback WebView（覆盖所有配置项最低要求） |
| `sdkVersionEnd: "15.255.255"` | 不设上限 |

## 迁移策略

**配置优先 + AB 实验控制回退**：

```
rendererOptions 配置对齐 WebView（消除大量兼容改动）
       │
       ▼
仅改配置无法覆盖的 CSS/组件/API 差异
       │
       ▼
AB 实验控制灰度（关 AB 即回退，无需发版）
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

## Migration Issue Card 闭环

Issue Card 是迁移问题的结构化管理协议，把问题描述、组件定位、验证计划、经验沉淀串成闭环。

### 解决的问题

- **问题描述成本高** → 一行描述即可创建 Card，自动推断风险类型
- **组件定位不稳定** → 基于代码证据的 candidate 机制，不允许凭空猜测
- **验证手动遗漏** → 自动生成 checklist，覆盖 WebView/Skyline/iOS/Android/非微信端
- **经验难沉淀** → close 时自动生成 knowledge case 草案

### 基本流程

```
create → enrich → confirm → plan → 人工验证 → close
```

### CLI 使用示例

```bash
# 创建
node scripts/issue-card.js create "底部按钮遮挡内容" --page "订单确认页" --mode skyline

# 检索候选组件
node scripts/issue-card.js enrich issues/open/skyline-issue-001.yaml --repo /path/to/project

# 查看候选
node scripts/issue-card.js candidates issues/open/skyline-issue-001.yaml

# 确认/排除
node scripts/issue-card.js confirm issues/open/skyline-issue-001.yaml OrderSubmitBar
node scripts/issue-card.js reject issues/open/skyline-issue-001.yaml OrderContent

# 生成验证计划
node scripts/issue-card.js plan issues/open/skyline-issue-001.yaml

# 关闭
node scripts/issue-card.js close issues/open/skyline-issue-001.yaml --result passed
```

### 证据等级

| Level | 类型 | 能力 |
|-------|------|------|
| 1 | User Report | 弱证据，只能推断 risk types |
| 2 | Visual Evidence | 不能单独证明根因 |
| 3 | Runtime Evidence | 辅助判断 |
| 4 | Code Evidence | 组件定位的强证据 |
| 5 | Verification Evidence | 关闭 Issue 的必要证据 |

### Candidate Review 机制

- `confirm`: 确认目标组件（需要足够 Code Evidence）
- `reject`: 排除组件，保留历史
- `more`: 继续检索

详见 `guides/issue-card-workflow.md`。

## 文件结构

```
skyline-migration/
├── README.md                           # 本文件
├── CLAUDE.md                           # Claude Code 斜杠命令配置
├── knowledge/                          # 项目知识（AI 基于 Skyline 官方文档采集）
│   ├── component-mapping.md            # XTaro 组件 → 原生组件映射
│   ├── compatibility-matrix.md         # CSS/组件/JS API 兼容性矩阵
│   ├── project-scan-summary.md         # 项目扫描总览（含滚动/动画/路由数据）
│   ├── renderer-options.md             # rendererOptions 配置参考
│   ├── scroll-api-guide.md             # Skyline 滚动控制 API
│   ├── worklet-animation.md            # Worklet 动画系统
│   ├── route-guide.md                  # 自定义路由与页面转场
│   └── cases/                          # 迁移案例沉淀
├── guides/                             # 迁移参考
│   ├── migration-patterns.md           # 迁移模式示例库
│   ├── issue-card-workflow.md          # Issue Card 工作流与证据规则
│   ├── team-workflow.md                # 团队日常维护流程（面向人）
│   ├── workflow.md                     # 三步骤工作流
│   └── testing-guide.md                # 三层测试指南
├── issues/                             # Migration Issue Cards
│   ├── SUMMARY.md                      # Issue 汇总表（优先级 + 不兼容 API 清单）
│   ├── assets/                         # Issue 相关截图/视频
│   ├── templates/                      # Card 模板
│   ├── open/                           # 进行中的 Card
│   └── closed/                         # 已关闭的 Card
├── prompts/                            # LLM Prompt 模板
│   ├── generate-issue-card.md
│   ├── enrich-issue-card.md
│   ├── generate-fix-prompt.md
│   ├── generate-verification-plan.md
│   └── summarize-migration-case.md
├── plans/                              # 迁移方案
│   └── migration-plan.md               # 分阶段迁移计划（含 AB 开关、CSS 规则、多端兼容）
├── reports/verification/               # 验证报告（真机截图、WebView/Skyline 对比）
├── scripts/
│   ├── skyline-check.js                # Skyline 兼容性快速检查脚本
│   ├── issue-card.js                   # Issue Card CLI
│   └── scan-knowledge.js               # 知识扫描脚本
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
