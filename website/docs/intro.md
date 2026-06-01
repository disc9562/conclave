---
sidebar_position: 1
---

# 快速开始

DreamCoder 是一个开箱即用的 AI 编程助手桌面应用。它把 AI 对话、代码编辑、终端操作和项目管理整合到一个窗口里，让你用自然语言描述需求，AI 帮你写代码、改文件、跑命令。

## 环境要求

- [Bun](https://bun.sh/) >= 1.0
- [Rust](https://www.rust-lang.org/tools/install) (桌面端编译)
- Node.js >= 18

## 安装与运行

```bash
# 1. 克隆仓库
git clone https://github.com/GoDiao/dreamcoder.git
cd dreamcoder

# 2. 安装依赖
bun install

# 3. 启动桌面端开发模式
cd desktop && bun run dev
```

## 配置 AI 模型

1. 打开 DreamCoder，进入 **设置 -> Provider (模型供应商)**。
2. 添加你的 API Key (例如：Anthropic, OpenAI, 或 DeepSeek)。
3. 选择默认模型，即可开始编程。

## 核心功能一览

* **多会话标签页**：每个会话绑定独立项目目录。
* **实时流式输出**：支持 Markdown 渲染（代码高亮、Mermaid 图表）。
* **内置终端**：支持 PowerShell / bash / zsh。
* **可视化 Diff**：直观查看 AI 对文件的每一步修改。