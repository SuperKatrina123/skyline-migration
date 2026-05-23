# 自定义路由与页面转场

> 记录项目路由/导航方式在 Skyline 下的兼容性。

## 项目路由方式扫描

| 路由方式 | 使用情况 | Skyline 兼容性 | 注意事项 |
|---|---|---|---|
| Taro 路由（基于 wx.navigateTo） | 列表→详情跳转 | ✅ 支持 | — |
| Taro 路由（基于 wx.navigateBack） | 返回列表 | ✅ 支持 | — |
| 跨分包组件（5 个） | 分包引用 | ⚠️ 需验证 | 分包异步化在 Skyline 下需真机测试 |
| 自定义路由/页面转场 | 未使用 | — | Skyline 支持 routeType 和 open-container |
| 自定义导航栏 | 已通过 navigationStyle:custom | ✅ 已配置 | — |
