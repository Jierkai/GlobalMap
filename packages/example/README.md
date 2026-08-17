# @globalmap/example

`@globalmap/core` **编译产物（dist）的冒烟测试工程**，同时是功能 demo 的脚手架。
`private: true`，不发版。

## 定位与目的

- 验证 `@globalmap/core` 的编译产物（ESM 入口 + `.d.ts` 类型声明）能被真实工程正常消费：
  模块解析、类型检查、Vite 打包、运行时初始化地球。
- 脚手架已就绪：**侧边导航 + 路由 + demo 注册表**。
  - 1.0 版本开发完毕前：内容上只维护首个冒烟 demo（地球初始化），
    其余功能直接改 demo 页代码手动验证；
  - 1.0 版本开发完毕后：按功能域逐个填充 demo——每个功能一个 demo 页，
    页内采用「左侧代码编辑器 + 右侧实时效果预览」布局。

## 目录结构

```
packages/example/
├── index.html              # 入口 HTML（#app 占满视口）
├── src/
│   ├── main.ts             # 应用入口：createApp + router
│   ├── App.vue             # 布局壳：左侧导航 + 右侧内容区（RouterView）
│   ├── env.d.ts            # vite/client 类型引用与 *.vue 模块声明
│   ├── router/
│   │   └── index.ts        # 路由：由 demos 注册表生成，无需手工维护
│   └── demos/
│       ├── index.ts        # demo 注册表（DemoEntry[]）：路由与导航的唯一数据源
│       └── hello-map/
│           └── index.vue   # Demo 1：配置项初始化一个地球（冒烟）
├── vite.config.ts          # vite + @vitejs/plugin-vue + vite-plugin-cesium
├── tsconfig.json           # 继承根 tsconfig.base.json
└── package.json            # 依赖：@globalmap/core(workspace:*) / cesium / vue / vue-router
```

## 新增功能 demo（后续填充功能只需这两步）

1. 新建目录 `src/demos/<demo-name>/index.vue`，编写 demo 页；
2. 在 `src/demos/index.ts` 的 `demos` 数组追加一条登记：

```ts
{
  name: 'layer-tile',
  title: '瓦片图层',
  description: 'layer 配置项加载多厂商瓦片',
  component: defineAsyncComponent(() => import('./layer-tile/index.vue')),
},
```

路由（`/demos/<demo-name>`）与侧边导航自动生成，无需改动其它文件。
demo 页内部如需「左编辑器 + 右预览」布局，在页内自行组织即可。

## 关键约定

1. **消费的是编译产物，不是源码**：`@globalmap/core` 为 workspace 依赖，其 `exports`
   指向 `dist/`。开发 / 构建 example **之前必须先构建 core**，否则找不到入口模块；
   example 的 dev server 不会感知 core 源码变化（它只认 dist）。
2. **一律走配置项初始化**：底图 / 图层 / 控件通过 `Map3DOptions` 的
   `basemapsLayer` / `layer` / `control` 等配置项传入，**不直接实例化图层等内部对象**
   ——配置项初始化是库的设计契约，example 验证的就是这条路径。
3. **Cesium 静态资源零配置**：由 `vite-plugin-cesium` 自动注入 `CESIUM_BASE_URL`，
   代码中不传 `cesiumBaseUrl`（core 侧自动识别）。
4. **脚手架最小化**：不引入 UI 组件库与状态管理；demo 按需懒加载拆包。

## 命令

```bash
# 仓库根目录（推荐）
pnpm install
pnpm build        # 整仓构建，等价 pnpm -r build（shared -> core -> example 拓扑序）
pnpm dev          # 启动 example 开发服务器，等价 pnpm --filter @globalmap/example dev

# 按需单独执行
pnpm --filter @globalmap/core build      # 先构建 core 产物（dist）
pnpm --filter @globalmap/example dev     # 开发服务器（http://localhost:5173）
pnpm --filter @globalmap/example build   # 构建冒烟产物到 packages/example/dist
pnpm --filter @globalmap/example preview # 本地预览构建产物
```

## 冒烟验证点

- 打开首页自动进入 `/demos/hello-map`，侧边导航高亮当前 demo；
- 页面正常渲染一个地球（默认 OSM 底图，免 key）；
- 控制台输出 `[example] Map3D ready`（`map3d:ready` 事件是就绪的唯一信号）；
- 从 `@globalmap/core` 导入 `Map3D` 及类型无模块解析 / 类型错误；
- 浏览器 Network 面板中 Cesium 静态资源（Workers/Assets/Widgets）无 404。
