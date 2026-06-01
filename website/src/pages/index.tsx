import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import { useBaseUrlUtils } from '@docusaurus/useBaseUrl';
import styles from './index.module.css';
import ProviderSpeedTest from '../components/ProviderSpeedTest';

const features = [
  {
    title: '🖥️ 原生桌面体验',
    description: (
      <>
        多标签页管理会话，内置 PTY 终端（PowerShell/Bash/Zsh），集成 xterm.js。
        窗口状态与大小自动记忆，拖拽即用。
      </>
    ),
  },
  {
    title: '⚡ 完美对接核心能力',
    description: (
      <>
        完整支持 Computer Use 模式（截图模式）及创新的 UIA Tree 文本辅助模式。
        工具调用全程可视化，AI 读写文件、执行命令过程一览无余。
      </>
    ),
  },
  {
    title: '🔌 高级 Provider 系统',
    description: (
      <>
        一键切换 Anthropic, OpenAI, DeepSeek, 通义千问, MiniMax, Azure, Google Vertex 等。
        首创延迟一键可视化测试，拒绝等待。
      </>
    ),
  },
  {
    title: '🛡️ 安全与隐私',
    description: (
      <>
        API Key 本地加密存储。危险操作（文件删除、命令执行）集中审批流，
        用户逐条确认，多级权限模式（自动批准 / 逐条确认 / 计划模式）。
      </>
    ),
  },
];

function Feature({title, description}: {title: string, description: JSX.Element}) {
  return (
    <div className={clsx('col col--6')}>
      <div className="padding-horiz--md padding-vert--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function Home(): JSX.Element {
  const { withBaseUrl } = useBaseUrlUtils();

  return (
    <main>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className="container">
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>DreamCoder</h1>
            <p className={styles.heroSubtitle}>
              Claude Code 的开源桌面 GUI 工作台 —— 面向国内创造者的 AI 编程利器
            </p>
            <div className={styles.buttons}>
              <Link
                className="button button--primary button--lg"
                to="https://github.com/GoDiao/dreamcoder/releases">
                🚀 立即下载 (Windows/macOS)
              </Link>
              <Link
                className="button button--secondary button--lg"
                style={{marginLeft: '1rem'}}
                to="/docs/intro">
                快速开始 →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Simulator Section */}
      <section className={styles.section}>
        <div className="container">
          <div className="text--center margin-bottom--xl">
            <h2>⚡ 极致性能与多模型支持</h2>
            <p className="hero__subtitle">
              告别单一模型选择困难。点击下方模型，体验 DreamCoder 的极速响应与智能代理工作流。
            </p>
          </div>
          <ProviderSpeedTest />
        </div>
      </section>

      {/* Feature Grid */}
      <section className={styles.section}>
        <div className="container">
          <div className="row">
            {features.map((props, idx) => (
              <Feature key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}