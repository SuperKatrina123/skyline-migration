# Skyline Migration Project

## Slash Commands

### /skyline-check
对本次变更或指定 commit 进行 Skyline 快速兼容性校验，无需执行完整迁移流程。

适合日常开发中改完代码后一键检查，或 review 别人 MR 时校验 commit。

**用法：**

```
/skyline-check                    # 检查所有未提交变更（staged + unstaged）
/skyline-check --commit <hash>    # 检查某个 commit 的所有变更
/skyline-check <path>             # 检查单个文件或目录（备选）
```

**校验范围：**
1. Config 检查 — `navigationStyle: "custom"`、`disableScroll`
2. CSS 兼容性 — 不支持的属性/值（position:sticky、display:grid、overflow:auto 等）
3. 组件兼容性 — 检查 web-view、editor、movable-view 等不支持的组件
4. ScrollView 检查 — 是否缺少 `type` 属性

**局限性：** 无法覆盖运行时问题（手势交互、动画效果、原生组件表现），高风险的兼容性问题仍需真机验证。

**实现脚本：** `scripts/skyline-check.js`

---

### Issue Card 命令

Issue Card 闭环管理迁移问题。CLI 入口：`node scripts/issue-card.js <command>`

**核心规则：**
- create 阶段**不定位组件**
- enrich 阶段才做候选组件检索
- `reviewed=false` **不能**进入 fix
- `insufficient_code_evidence` **不生成**修复 prompt
- 截图只能作为 visual evidence，不能单独定位组件
- high confidence 需要至少 2 个 Code Evidence

**命令列表：**

| 命令 | 说明 |
|------|------|
| `create "<desc>" --page <name> --mode <mode>` | 创建 draft card |
| `list` | 列出 open/closed cards |
| `show <id>` | 展示 card 摘要 |
| `enrich <file> --repo <path>` | 检索候选组件 |
| `candidates <file>` | 查看候选组件 |
| `confirm <file> <name>` | 确认组件 |
| `reject <file> <name>` | 排除组件 |
| `more <file> --repo <path>` | 继续检索 |
| `plan <file>` | 生成验证计划 |
| `close <file> --result passed\|failed` | 关闭 card |

**详见：** `guides/issue-card-workflow.md`

---

## 项目背景

本仓库是 XTaro 小程序 WebView → Skyline 渲染引擎的迁移知识库。

### 核心原则

1. **AB 实验只控制 renderer 配置** — 不做两套代码共存
2. **不改 H5/CRN 代码** — 所有修改限定在小程序端
3. **回退 = AB 关掉 + 发版** — 不引入运行时条件分支

### 排查方法（关键）

XTaro 构建时会做包替换和路径重写，源码 `node_modules` 中的组件实现可能与 mini 端实际运行的不一致。排查时需检查：

- **XTaro 组件 mini 端真实实现**：`dist/mini/.../node_modules/@ctrip/*-mini/`
- **项目源码**：`src/`
- **源 node_modules**：仅作为参考

详见 `guides/workflow.md`。
