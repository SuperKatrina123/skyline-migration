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
