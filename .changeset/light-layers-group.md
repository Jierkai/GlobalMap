---
'@globalmap/core': minor
---

LayerInitItem 支持 group 子图层集合：瓦片类图层项（tdt/baidu/amap/google/osm/bing/arcgis）的 options.group 存在且非空时，工厂展开为 LayerGroup（成员为同 type 多个瓦片图层，父项 token/show 等透传，子项可覆盖 id/show/zIndex），典型用于天地图影像+注记双层叠放。同时为各图层类型与瓦片类型补充逐值注释，UrlTemplate 系厂商图层透传 zIndex（修复 group 内排序失效）。
