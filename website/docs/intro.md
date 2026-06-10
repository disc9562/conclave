---
sidebar_position: 1
---

# 快速开始

DreamCoder 是 **Claude Desktop 的开源桌面版工作台**，面向国内开发者设计，让你可以用自然语言完成编程任务，无需科学上网。

## 环境要求

| 工具 | 版本要求 | 备注 |
|------|---------|------|
| Windows | 10/11 (64位) | 当前仅支持 Windows |
| [Bun](https://bun.sh/) | >= 1.0 | 本地开发运行时 |
| [Rust](https://www.rust-lang.org/tools/install) | 最新稳定版 | 桌面端编译 |

## 安装步骤

### 方式一：下载安装包（推荐）

前往 [GitHub Releases](https://github.com/GoDiao/dreamcoder/releases) 下载最新版本：

| 安装包 | 说明 |
|--------|------|
| `DreamCoder_x.x.x_x64-setup.exe` | Windows 安装向导 |
| `DreamCoder_x.x.x_x64_en-US.msi` | MSI 静默安装包 |

下载后双击运行，按提示完成安装即可。

### 方式二：从源码编译

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

1. 打开 DreamCoder，进入 **设置 → Provider (模型供应商)**
2. 添加你的 API Key（支持 Anthropic、OpenAI、DeepSeek、通义千问、Kimi、Claude 等）
3. 选择默认模型，即可开始编程

## 环境变量配置

DreamCoder 支持通过环境变量进行配置，适用于高级用户或 CI/CD 场景。

### 常用变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `ANTHROPIC_API_KEY` | Anthropic API Key | - |
| `OPENAI_API_KEY` | OpenAI API Key | - |
| `DEEPSEEK_API_KEY` | DeepSeek API Key | - |
| `DREAMCODER_SERVER_PORT` | 本地服务端口 | `3456` |
| `DREAMCODER_LOG_LEVEL` | 日志级别 (`debug`/`info`/`warn`) | `info` |

### 配置示例

```powershell
# PowerShell 示例
$env:ANTHROPIC_API_KEY = "sk-ant-..."
$env:DEEPSEEK_API_KEY = "sk-..."
$env:DREAMCODER_LOG_LEVEL = "debug"

# 然后启动 DreamCoder
dreamcoder
```

### 使用 .env 文件

在项目根目录创建 `.env` 文件：

```bash
# .env 示例
ANTHROPIC_API_KEY=sk-ant-your-key-here
DEEPSEEK_API_KEY=sk-your-key-here
DREAMCODER_SERVER_PORT=3456
DREAMCODER_LOG_LEVEL=info
```

:::tip
生产环境建议使用 UI 设置界面管理 API Key，DreamCoder 会将凭据加密存储在本地。
:::

## 核心功能

### 🖥️ 原生桌面体验
- 多标签页会话管理，每个会话绑定独立项目目录
- 内置 PTY 终端（PowerShell / bash / zsh）
- 窗口位置和大小自动记忆

### 🤖 Computer Use 模式
- 支持截图视觉模式
- 全新 UIA Tree 文本模式，成本更低、速度更快

### 🔌 全模型支持
- 一键切换 8+ 模型供应商
- 首创延迟可视化测试

### 🛡️ 安全审批流
- 危险操作（文件删除、终端命令）逐条确认
- API Key 本地加密存储
- 多级权限模式：自动批准 / 逐条确认 / 计划模式