# Issue Card 工作流

## 概述

Migration Issue Card 是 Skyline 迁移问题的闭环管理协议。每个迁移问题对应一张 Card，从问题描述到知识沉淀形成完整链路。

## 状态流转

```
draft → enriched → reviewed → fixing → verifying → closed
```

- **draft**: 问题已录入，尚未检索组件
- **enriched**: 已完成组件候选检索
- **reviewed**: 人工已确认目标组件
- **fixing**: Claude Code 修复中
- **verifying**: 修复完成，等待验证
- **closed**: 验证通过或标记为 failed

## 核心流程

```
粗糙问题描述 + 可选截图/日志/页面入口
    ↓
create → Draft Migration Issue Card
    ↓
enrich → 检索 knowledge/、guides/、repo 代码
    ↓
生成 visual_context、risk types、search queries、candidate components
    ↓
人工 review：confirm / reject / more
    ↓
生成 Claude Code 修复 prompt
    ↓
plan → 生成 Verification Plan
    ↓
人工验证
    ↓
close → 移动到 closed/，生成 Migration Case 草案
```

## 证据等级规则

### Level 1: User Report

- 用户一句话描述
- 只能作为弱证据
- 用途：生成初始 risk.types 和 knowledge.queries

### Level 2: Visual Evidence

- 截图/录屏证明现象存在
- 可以用于生成 visual_context 和 search_queries
- **不能单独证明根因**
- **不能单独作为 high-confidence component evidence**

### Level 3: Runtime Evidence

- 日志、报错、元素位置变化、自动化运行结果
- 可以辅助判断现象和复现稳定性
- 可作为中等证据

### Level 4: Code Evidence

- `route_match`: 页面路由匹配到组件所在目录
- `text_match`: 组件渲染文案与描述/截图文案匹配
- `import_relation`: 页面直接或间接引用该组件
- `style_signal`: 组件样式包含风险信号（fixed、sticky、z-index 等）
- `code_signal`: 组件代码包含风险 API（ScrollView、onScroll 等）
- 是**组件定位的强证据**

### Level 5: Verification Evidence

- WebView/Skyline 对比
- iOS/Android 对比
- 人工或自动化验证结果
- 是**关闭 Issue 的必要证据**

## 强制规则

1. `visual_match` + `name_match` **不能**给 high confidence
2. high confidence 至少需要 `route_match` / `text_match` / `import_relation` / `style_signal` 中的**两个及以上**
3. 如果只有 visual evidence，`component_retrieval.status` 必须是 `insufficient_code_evidence`
4. `reviewed=false` 时**不能**生成 fix prompt
5. `confirmed_component` 为空时**不能**进入 fixing
6. close 时必须有 `verification.result`（passed 或 failed）

## Candidate Components 数据结构

每个 candidate 必须包含：

```yaml
- name: ComponentName
  file: src/path/to/file.tsx
  role: likely_source | affected_area | container_context | unknown
  confidence: high | medium | low
  evidence:
    route_match: true/false
    text_match: true/false
    import_relation: true/false
    style_signal: true/false
    code_signal: true/false
    visual_match: true/false
    name_match: true/false
  reason: "定位原因说明"
  missing_evidence: []
```

### Role 说明

- `likely_source`: 最可能是问题根因的组件
- `affected_area`: 被影响的区域，但不是根因
- `container_context`: 容器/上下文组件，提供布局信息
- `unknown`: 尚不确定角色

### Confidence 判定

- **high**: 至少 2 个 Level 4 代码证据 + route_match
- **medium**: 1 个 Level 4 代码证据 + 其他辅助证据
- **low**: 仅有 visual_match / name_match 或推测

## 人工 Review 机制

Review 成本要低，开发者只需要：

- `confirm <component>`: 确认某个组件是目标
- `reject <component>`: 排除某个组件
- `more`: 要求继续检索

不要求开发者手动提供组件文件名。

## 风险类型

| 类型 | 典型关键词 | 典型 CSS 信号 |
|------|-----------|--------------|
| fixed-bottom | bottom, footer, fixed, safe-area | position: fixed, bottom: 0 |
| sticky | sticky, filter, tab, nav | position: sticky, top: 0 |
| scroll | scroll-view, ScrollView, onScroll | overflow: scroll/auto |
| swiper | swiper, Swiper, carousel | - |
| popup | popup, modal, dialog, overlay | position: fixed, z-index |

## CLI 命令速览

```bash
# 创建 Issue Card
node scripts/issue-card.js create "问题描述" --page "页面名" --mode skyline

# 列出所有 Card
node scripts/issue-card.js list

# 查看 Card
node scripts/issue-card.js show <id>

# 检索组件候选
node scripts/issue-card.js enrich <file> --repo /path/to/project

# 查看候选组件
node scripts/issue-card.js candidates <file>

# 确认/排除组件
node scripts/issue-card.js confirm <file> <componentName>
node scripts/issue-card.js reject <file> <componentName>

# 继续检索
node scripts/issue-card.js more <file> --repo /path/to/project

# 生成验证计划
node scripts/issue-card.js plan <file>

# 关闭 Card
node scripts/issue-card.js close <file> --result passed|failed
```
