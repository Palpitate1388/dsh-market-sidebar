# dsh-market-sidebar

把 `dshmarket`（第三方插件市场）的入口放进 DSH Web 左侧边栏底部，位置在
Agents-Anywhere 的「远程控制」**右侧**。

## 为什么需要它

`dshmarket` 自己只注册了设置页相关的槽位（`settings.section`、
`settings.plugins.tab`、`plugins.bundle.config`、`settings.plugin.item`）和一个只用
于安装提示的 `shell.overlay`，**没有**注册 `sidebar.footer.action`，所以侧边栏里
看不到它。官方内置的 `dsh-community-market` 自带侧边栏入口，但一个 profile 里的
市场提供方由桌面端强制二选一。

本包是一个独立的配套插件，不改动 `dshmarket` 本体的任何文件，因此市场自我更新
（`dshmarket -> dshmarket@x.y.z`）不会影响它。

## 它怎么工作

- 槽位锚点由宿主用**内联** `display: contents` 渲染，条目默认撑满整行宽度，于是多个
  条目会被压成多行、每行表面横铺整行。本包先把锚点重新声明成真正的横向 flex 行，
  并让条目回到内容宽度，两个条目这才并排在同一行。
- 排序按 `(priority, order)` 升序：Agents-Anywhere 用 `order: 26` 注册「远程控制」，
  本包用 `order: 27` —— 比 26 大，所以落在它**右边**。
- 最后用一条 `:has()` 规则给本条目加 `margin-left: auto`，把它推到那一行的最右端。
  这条规则靠注册项自己的 `data-icon="market-sidebar"` 匹配，不依赖宿主的 CSS 模块类名。
- 点击入口打开一个浮层，内容来自市场自己发布的服务：
  `ctx.provide("market", marketControl)` → `market.render()`。市场源码里写明这个
  方法就是「给宿主把整个市场面板嵌进自己容器」用的，并且因为所有 bundle 都通过宿主
  模块表解析 React，返回的元素与调用方共享同一个 React 实例。
- 注册包在 `ctx.inject(["market"], ...)` 里：市场不存在时（未安装、被禁用，或桌面端
  切到了官方社区市场）就什么都不注册，不会留下一个点不动的按钮。

## 宿主端为什么是空的

profile bundle 会先挂到宿主，其客户端 bundle 才会被投递给浏览器。本包的宿主端
（`lib/index.js`）只有一个空的 `apply`，是刻意的：DSH 启动是全有全无，宿主端抛错会
让整个 profile 起不来。全部功能都在客户端。

## 文件

| 文件 | 作用 |
|---|---|
| `package.json` | 声明 `dsh.bundle.patch` 与 `dsh.client.platform`，并把 `./client` 指向客户端 bundle |
| `cordis.patch.yml` | 把本插件 `insert` 进 profile 的层栈 |
| `lib/index.js` | 宿主端，空实现 |
| `lib/client.js` | 客户端 bundle（`window.__ModuleLoader__.load`），注册侧边栏入口与浮层 |

`lib/client.js` 是手写的，没有构建步骤：客户端模块表里的 `react`、
`@deepseek-ai/dsh-client-store`、`@deepseek-ai/dsh-client-ui-primitives` 都是平台
seed，直接 `require` 即可。

## 安装

把本包放进目标 profile 的 `local-plugins/` 下，然后在 profile 的 `package.json`
里声明 `file:` 依赖，并把包名加进 `dsh.profile.bundles`：

```json
{
  "dependencies": {
    "dsh-market-sidebar": "file:./local-plugins/dsh-market-sidebar"
  },
  "dsh": {
    "profile": {
      "bundles": ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "dsh-market-sidebar"]
    }
  }
}
```

`reconcile()` 只保留「在 dependencies 里且有 bundle patch」或「完全不在
dependencies 里」的 bundle；带 `cordis.patch.yml` 的 `file:` 依赖满足前者，
`pnpm install` 也不会把它当成多余包清掉。

改动 profile 后重启 DSH 生效。

## 调整位置

改 `lib/client.js` 里的 `ORDER` 常量：

| `ORDER` | 位置 |
|---|---|
| 小于 26 | 「远程控制」左侧 |
| 大于 26 | 「远程控制」右侧 |

想让它紧贴「远程控制」而不是贴到行尾，删掉 `STYLE_TEXT` 里最后那条
`[data-slot="sidebar.footer.action"]>:has(...)` 规则即可。

客户端 bundle 的改动要重启 DSH 才会进入模块图。

## 卸载

删掉 profile `package.json` 里的 `dsh-market-sidebar` 依赖、`dsh.profile.bundles`
里的同名条目，以及 `local-plugins/dsh-market-sidebar/` 目录，然后重启。

## License

MIT
