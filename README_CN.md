# OpenSpec Task Viewer

[English](README.md) | **中文**

一个 Visual Studio Code 扩展插件，用于在侧边栏可视化展示 [OpenSpec](https://github.com/openspec) 变更提案、文档和任务进度。

## 这是什么？

**OpenSpec Task Viewer** 在 VS Code 活动栏中添加了一个 **OpenSpec** 面板。它会扫描工作区中的 `openspec/changes/` 目录，将所有变更提案、相关文档和任务清单以交互式树形视图呈现。

你可以直接在编辑器中浏览提案、设计文档、规格说明，并追踪任务完成进度。

![VSCode Extension](https://img.shields.io/badge/VSCode-Extension-blue?logo=visualstudiocode)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?logo=typescript)
![License](https://img.shields.io/badge/License-MIT-green)

## 截图预览

| 插件整体预览 | 悬停查看变更信息 |
|:---:|:---:|
| ![插件整体预览](imgs/screen_shot_1_preview.png) | ![悬停查看变更信息](imgs/screen_shot_2_show_info.png) |

## 功能特性

- **变更列表** — 扫描 `openspec/changes/` 目录，将每个变更显示为树节点
- **文档预览** — 点击 `proposal.md`、`design.md`、`tasks.md` 等文件即可打开 Markdown 预览
- **任务进度** — 解析 Markdown 复选框（`- [x]` / `- [ ]`），以 `[n/m]` 格式显示完成统计
- **嵌套任务树** — 支持任意层级的复选框嵌套，基于缩进自动构建父子关系
- **行号跳转** — 点击任务项可跳转到 `tasks.md` 中的对应行，并同时打开 Markdown 并排预览
- **归档变更** — `archive/` 目录下的变更单独归为「Archived Changes」分组
- **多工作区支持** — 多工作区时按工作区文件夹分组，单工作区时省略分组层级
- **实时文件监听** — 监听 `openspec/**` 的文件变化，自动刷新树视图（300ms 防抖）
- **手动刷新** — 树视图标题栏提供刷新按钮
- **主题适配** — 使用 VS Code 原生 ThemeIcon/Codicons，自动适配任意亮色/暗色主题

## 树视图结构

```
OpenSpec（活动栏）
└── Task Viewer
    ├── openspec-task-viewer-plugin        ← 活跃变更
    │   ├── proposal.md
    │   ├── design.md
    │   ├── tasks.md
    │   ├── specs/
    │   │   ├── file-watcher
    │   │   ├── multi-workspace
    │   │   ├── task-parser
    │   │   └── tree-view-panel
    │   └── Tasks [20/20]                  ← 任务汇总
    │       ├── 1. 项目初始化 [5/5]
    │       │   ├── ✅ 1.1 创建目录 ...
    │       │   └── ...
    │       └── ...
    └── Archived Changes
        └── 2026-02-26-origin-clash-...    ← 归档变更
```

## 使用方法

### 通过 VSIX 安装

1. 从 [Releases](https://github.com/user/openspec-task-viewer/releases) 页面下载 `.vsix` 文件
2. 在 VS Code 中打开命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）
3. 执行 **Extensions: Install from VSIX...**，选择下载的文件
4. 当工作区包含 `openspec/changes/` 目录时，扩展会自动激活

### 日常使用

- 点击活动栏中的 **OpenSpec** 图标打开面板
- 展开变更节点查看文档和任务进度
- 点击任意 `.md` 文件打开 Markdown 预览
- 点击任务项跳转到 `tasks.md` 中的对应行
- 使用面板标题栏的刷新按钮（↻）手动刷新

## 手动编译

### 前置条件

- [Node.js](https://nodejs.org/)（v18+）
- [npm](https://www.npmjs.com/)
- [Visual Studio Code](https://code.visualstudio.com/)（v1.74.0+）

### 编译步骤

```bash
# 克隆仓库
git clone https://github.com/user/openspec-task-viewer.git
cd openspec-task-viewer

# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 打包为 VSIX（需要 vsce）
npx @vscode/vsce package
```

### 开发模式

```bash
# 监听模式 — 文件变化时自动重新编译
npm run watch
```

然后在 VS Code 中按 `F5` 启动 **扩展开发宿主** 进行调试。

## 项目结构

```
src/
├── extension.ts              # 入口：activate / deactivate
├── nodes.ts                  # TreeItem 子类（10 种节点类型）
├── openspecScanner.ts        # 扫描 openspec/changes/ 目录
├── openspecTreeProvider.ts   # TreeDataProvider 核心实现
├── taskParser.ts             # 解析 tasks.md 中的复选框
└── watcher.ts                # FileSystemWatcher（含防抖）
```

## 环境要求

- VS Code `^1.74.0`
- 工作区中包含 `openspec/changes/` 目录

## 许可证

MIT
