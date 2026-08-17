# @globalmap/example

`@globalmap/core` **编译产物（dist）的冒烟测试工程**，形态对齐 ECharts 在线示例：
主页是案例画廊，点进案例页「左侧代码编辑器 + 右侧实时预览」。`private: true`，不发版。

## 定位与目的

- 验证 `@globalmap/core` 的编译产物（ESM 入口 + `.d.ts` 类型声明）能被真实工程正常消费：
  模块解析、类型检查、Vite 打包、运行时初始化地球。
- 冒烟方式：案例页左侧编辑器直接修改代码并运行，右侧实时看效果——
  编辑的每一步都在消费 core 的编译产物。
- 当前只内置一个最简示例（地球初始化）；1.0 版本开发完毕后按功能域逐个填充案例。

## 目录结构

```
packages/example/
├── index.html                # 入口 HTML（#app 占满视口）
├── src/
│   ├── main.ts               # 应用入口：createApp + router
│   ├── App.vue               # 布局壳：仅 RouterView
│   ├── env.d.ts              # vite/client 类型引用与 *.vue 模块声明
│   ├── router/
│   │   └── index.ts          # / 案例画廊；/demos/:name 通用案例页
│   ├── views/
│   │   ├── Home.vue          # 案例画廊：卡片由 demos 注册表生成
│   │   └── Playground.vue    # 通用案例页：左编辑器 + 右预览 + 运行引擎
│   ├── components/
│   │   ├── CodeEditor.vue    # CodeMirror 6 封装（JS 高亮 / one-dark / 换行）
│   │   └── PreviewPanel.vue  # 预览容器 + 状态徽标（运行中/就绪/失败）
│   └── demos/
│       ├── index.ts          # demo 注册表（DemoEntry[]）：画廊与路由的唯一数据源
│       └── hello-map/
│           └── code.ts       # 示例默认代码（可编辑运行、可重置）
├── vite.config.ts            # vite + @vitejs/plugin-vue + vite-plugin-cesium
├── tsconfig.json             # 继承根 tsconfig.base.json
└── package.json              # 依赖：core(workspace:*) / cesium / vue / vue-router / codemirror
```

## 运行引擎契约（Playground）

案例代码经 `new Function('GM', 'Cesium', 'container', code)` 执行，注入：

- `GM`：`@globalmap/core` 全部导出（即编译产物，冒烟对象）；
- `Cesium`：`cesium` 全部导出；
- `container`：预览面板的 `HTMLDivElement`。

地图捕获规则（引擎据此销毁/重建，三选一）：返回 `Map3D` 实例 /
返回 resolve 为 `Map3D` 的 Promise / 赋值 `window.__map`。
重新运行或离开页面时自动 `destroy()` 上一个地图。

## 新增功能 demo（后续填充功能只需这两步）

1. 新建 `src/demos/<demo-name>/code.ts`，导出示例默认代码字符串；
2. 在 `src/demos/index.ts` 的 `demos` 数组追加一条登记：

```ts
{
  name: 'layer-tile',
  title: '瓦片图层',
  description: 'layer 配置项加载多厂商瓦片',
  code: layerTileCode,
},
```

主页卡片与 `/demos/<demo-name>` 案例页自动生成，无需改动其它文件。

## 关键约定

1. **消费的是编译产物，不是源码**：`@globalmap/core` 为 workspace 依赖，其 `exports`
   指向 `dist/`。开发 / 构建 example **之前必须先构建 core**，否则找不到入口模块；
   example 的 dev server 不会感知 core 源码变化（它只认 dist）。
2. **示例代码一律走配置项初始化**：底图 / 图层 / 控件通过 `Map3DOptions` 的
   `basemapsLayer` / `layer` / `control` 等配置项传入，**不直接实例化图层等内部对象**
   ——配置项初始化是库的设计契约，example 验证的就是这条路径。
3. **Cesium 静态资源零配置**：由 `vite-plugin-cesium` 自动注入 `CESIUM_BASE_URL`，
   代码中不传 `cesiumBaseUrl`（core 侧自动识别）。
4. **编辑器代码在页面上下文执行**（非 iframe 沙箱）：冒烟工具定位，勿运行不可信代码。

## 命令

```bash
# 仓库根目录（推荐）
pnpm install
pnpm build        # 整仓构建，等价 pnpm -r build（shared -> core -> example 拓扑序）
pnpm dev          # 启动 example 开发服务器，等价 pnpm --filter @globalmap/example dev

# 按需单独执行
pnpm --filter @globalmap/core build      # 先构建 core 产物（dist）
pnpm --filter @globalmap/example dev     # 开发服务器（http://localhost:5173）
pnpm --filter @globalmap/example build   # 构建产物到 packages/example/dist
pnpm --filter @globalmap/example preview # 本地预览构建产物
```

> 改了 core 源码后，需重新 `pnpm --filter @globalmap/core build` 再到 example 验证。

## 冒烟验证点

- 主页出现案例卡片，点击进入 `/demos/hello-map` 并自动运行；
- 右侧正常渲染一个地球，状态徽标显示「运行成功」（`map3d:ready`）；
- 控制台输出 `[hello-map] Map3D ready`；
- 修改代码点「运行」：旧地图销毁、新代码生效；语法/运行错误落入底部错误栏；
- 「重置」恢复示例默认代码；离开页面地图被销毁；
- 浏览器 Network 面板中 Cesium 静态资源（Workers/Assets/Widgets）无 404。
