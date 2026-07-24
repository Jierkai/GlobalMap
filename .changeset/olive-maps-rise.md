---
'@globalmap/core': patch
'@globalmap/shared': patch
---

初始化 monorepo 骨架：core 提供 EventBus 强类型事件总线、BaseLayer/BaseGraphic 基类、Map3D 组合根（13 能力域 Manager 骨架、map3d:ready/destroyed 生命周期）、setCesiumBaseUrl 工具；shared 提供数学/格式化/校验/下载纯函数工具集。
