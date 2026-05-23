# 团队日常维护流程

> 开发中遇到 Skyline 兼容问题时的处理步骤。

---

## 流程

```
改需求 → npm run skyline-check  →  通过 ✅  → 提交
                               ↓ 不通过
                   查 compatibility-matrix 确认问题
                               ↓
                   查 migration-patterns 找改法
                               ↓
                   修，重新校验，通过后提交
```

## 操作步骤

### 1. 改代码后跑检查

在应用项目（`xtaro-hotel-detail-page`）根目录执行：

```bash
cp skyline-migration/scripts/skyline-check.js scripts/
node scripts/skyline-check.js
```

三个模式：

```bash
node scripts/skyline-check.js                    # 检查未提交变更
node scripts/skyline-check.js --commit <hash>    # 检查某个 commit
node scripts/skyline-check.js <path>             # 检查单个文件
```

### 2. 检查不通过时

| 问题类型 | 去哪里查解法 |
|----------|-------------|
| CSS 不兼容（sticky、overflow、flexDirection 等） | `knowledge/compatibility-matrix.md` |
| scroll-view 缺 type | `guides/migration-patterns.md` 模式 2 |
| 页面滚动 API（window.scrollY 等） | `guides/migration-patterns.md` 模式 5 |
| 文本样式（white-space、text-overflow） | `knowledge/compatibility-matrix.md` |

### 3. 修完重新校验

改完再跑一次 `node scripts/skyline-check.js`，报错消失后提交。

---

## 遇到新问题怎么贡献

发现扫描脚本没覆盖到的兼容性问题：

1. `knowledge/compatibility-matrix.md` 加一行
2. 改法有通用性 → `guides/migration-patterns.md` 加一个新模式
3. 提 PR 合入 skyline-migration 仓库

---

## 改动原则

| 场景 | 做法 |
|------|------|
| 文件是 `.mini.scss` / `.mini.tsx` / `.mini.ts` | 直接改，不影响其他端 |
| 共享 style.ts，属性影响 H5/CRN | 用 `IS_MINI` 条件分支保护 |
| 共享 style.ts，属性只影响小程序 | 直接改 |
| `overflow: auto/scroll` | 改 `.mini.*` 或用 `IS_MINI` 保护 |
| `display: flex` 缺方向 | `IS_MINI` 条件分支加 `flexDirection` |
