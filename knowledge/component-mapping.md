# XTaro 组件映射

> 记录项目中使用的 XTaro/Taro 组件在 Skyline 下的兼容情况。

## 基础组件

| XTaro 组件 | 微信组件 | Skyline | 注意事项 |
|---|---|---|---|
| `XView` / `XViewExposure` | view | ✅ 支持 | 曝光埋点封装，无样式影响 |
| `XScrollView` | scroll-view | ⚠️ 缺 type | Skyline 必须指定 type（list/custom/nested） |
| `XImage` / `Image` | image | ✅ 支持 | Skyline 仅 5 种缩放模式，fade-in 默认开启 |
| `XText` / `Text` | text | ✅ 支持 | text-overflow 仅在 text 组件生效 |

## 项目中使用的 XScrollView 实例

| 位置 | 方向 | enhanced | 是否缺 type |
|---|---|---|---|
| `PageContent/index.mini.tsx` | vertical | ✅ | ⚠️ |
| `TabList/TabListScroll/index.tsx` | horizontal | — | ⚠️ |
| `RoomList/RoomListLayer/index.tsx` | vertical | — | ⚠️ |
| `ReservationPop/index.tsx` | vertical | — | ⚠️ |
| `PresaleTime/index.tsx` | horizontal | — | ⚠️ |
| `RankList/index.tsx` | horizontal | ✅ | ⚠️ |
| `Tab/index.tsx`（ImmersiveHead） | horizontal | — | ⚠️ |
| `HighlightFloat/index.tsx` | vertical | — | ⚠️ |
| `PictureList/index.tsx` | horizontal | — | ⚠️ |
| `HotelRoomBedInfo/index.crn.tsx` | horizontal | ✅ | ⚠️（CRN 文件不受影响） |

## 原生组件

| 组件 | 使用场景 | 文件 | Skyline 注意事项 |
|---|---|---|---|
| Video | 视频播放 | CommonVideo, ImmersiveHead | ⚠️ 需真机验证 |
| Map | 酒店位置 | poiLayout.ts | ⚠️ 需真机验证 |
