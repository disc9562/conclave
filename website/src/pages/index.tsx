import React, { useState, useEffect } from 'react';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const features = [
  {
    icon: '🖥️',
    title: '原生桌面体验',
    description: '多标签页会话管理，内置 PTY 终端，窗口状态自动记忆',
  },
  {
    icon: '🤖',
    title: 'Computer Use 模式',
    description: '支持截图视觉模式 + UIA Tree 文本模式，成本更低速度更快',
  },
  {
    icon: '🔌',
    title: '全模型支持',
    description: 'DeepSeek、通义千问、Kimi、MiniMax、Claude、GPT 一键切换',
  },
  {
    icon: '🛡️',
    title: '安全审批流',
    description: '危险操作逐条确认，API Key 本地加密，隐私零风险',
  },
  {
    icon: '🔧',
    title: 'MCP 扩展',
    description: 'Model Context Protocol 原生支持，插件生态无限扩展',
  },
  {
    icon: '⚡',
    title: '极致性能',
    description: '14 项深度��化，会话元数据缓存 24.8x 提升',
  },
];

const benchmarks = [
  { metric: '元数据扫描', before: '2.02s', after: '81ms', improvement: '24.8x' },
  { metric: 'Elapsed Timer', before: '10.91ms', after: '6.74ms', improvement: '1.6x' },
  { metric: 'Markdown 渲染', before: '阻塞主线程', after: '异步不卡顿', improvement: '∞' },
];

const codeLines = [
  { text: '$ dreamcoder init my-project', color: '#8e8e93' },
  { text: '✓ Initializing DreamCoder...', color: '#27c93f' },
  { text: '✓ Loading Claude 3.5 Sonnet...', color: '#27c93f' },
  { text: '✓ Connected to DeepSeek V3 (12ms)', color: '#00ddff' },
  { text: '', color: '#8e8e93' },
  { text: '🤖 What would you like to build?', color: '#ffbd2e' },
  { text: '> Build me a REST API with Express', color: '#e3e3e6' },
  { text: '', color: '#8e8e93' },
  { text: '⚡ Analyzing project structure...', color: '#00ddff' },
  { text: '✓ Generated: src/routes/users.js', color: '#27c93f' },
  { text: '✓ Generated: src/models/user.js', color: '#27c93f' },
  { text: '✓ Generated: tests/users.test.js', color: '#27c93f' },
];

export default function Home(): JSX.Element {
  const [typedLines, setTypedLines] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(0);
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(v => !v), 500);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    if (currentLine < codeLines.length) {
      const timer = setTimeout(() => {
        setTypedLines(prev => [...prev, codeLines[currentLine].text]);
        setCurrentLine(c => c + 1);
      }, currentLine === 0 ? 800 : 150);
      return () => clearTimeout(timer);
    }
  }, [currentLine]);

  return (
    <main className={styles.main}>
      {/* Hero Section with Terminal Animation */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <div className={styles.gridPattern}></div>
          <div className={styles.glowOrb1}></div>
          <div className={styles.glowOrb2}></div>
        </div>

        <div className={styles.heroContent}>
          <div className={styles.badge}>
            <span className={styles.badgeDot}></span>
            开源免费 · MIT 许可证
          </div>

          <h1 className={styles.heroTitle}>
            <span className={styles.titleLine1}>DreamCoder</span>
            <span className={styles.titleLine2}>Claude Code 的桌面版</span>
          </h1>

          <p className={styles.heroSubtitle}>
            把强大的 AI 编程能力，装进漂亮的桌面应用。<br/>
            面向国内开发者的原生体验，无需科学上网。
          </p>

          <div className={styles.heroCta}>
            <a href="https://github.com/GoDiao/dreamcoder/releases" className={styles.primaryBtn}>
              <span>🚀</span> 立即下载 (Windows/macOS)
            </a>
            <Link to="/docs/intro" className={styles.secondaryBtn}>
              查看文档 →
            </Link>
          </div>

          <div className={styles.heroStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>14</span>
              <span className={styles.statLabel}>项性能优化</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>8+</span>
              <span className={styles.statLabel}>模型供应商</span>
            </div>
            <div className={styles.statDivider}></div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>本地隐私</span>
            </div>
          </div>
        </div>

        {/* Terminal Visual */}
        <div className={styles.terminalContainer}>
          <div className={styles.terminal}>
            <div className={styles.terminalHeader}>
              <div className={styles.terminalDots}>
                <span className={styles.dotRed}></span>
                <span className={styles.dotYellow}></span>
                <span className={styles.dotGreen}></span>
              </div>
              <span className={styles.terminalTitle}>DreamCoder — powered by Claude</span>
            </div>
            <div className={styles.terminalBody}>
              {typedLines.map((line, idx) => (
                <div key={idx} className={styles.terminalLine} style={{ color: codeLines[idx]?.color || '#e3e3e6' }}>
                  {line}{idx === typedLines.length - 1 && showCursor && <span className={styles.cursor}>▋</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why DreamCoder Section */}
      <section className={styles.whySection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>
            ���什么选择 <span className={styles.highlight}>DreamCoder</span>？
          </h2>
          <p className={styles.sectionSubtitle}>
            对比纯命令行和其他 GUI 方案，DreamCoder 为国��开发者量身打造
          </p>

          <div className={styles.compareTable}>
            <div className={styles.compareHeader}>
              <div className={styles.compareCell}></div>
              <div className={styles.compareCell}>纯 CLI</div>
              <div className={styles.compareCell}>浏览器插件</div>
              <div className={`${styles.compareCell} ${styles.compareCellHighlight}`}>DreamCoder</div>
            </div>
            <div className={styles.compareRow}>
              <div className={styles.compareCell}>国内网络</div>
              <div className={styles.compareCell}>❌ 需翻墙</div>
              <div className={styles.compareCell}>⚠️ 不稳定</div>
              <div className={`${styles.compareCell} ${styles.compareCellHighlight}`}>✅ 原生直连</div>
            </div>
            <div className={styles.compareRow}>
              <div className={styles.compareCell}>模型切换</div>
              <div className={styles.compareCell}>❌ 手动配置</div>
              <div className={styles.compareCell}>⚠️ 单一绑定</div>
              <div className={`${styles.compareCell} ${styles.compareCellHighlight}`}>✅ 一键切换</div>
            </div>
            <div className={styles.compareRow}>
              <div className={styles.compareCell}>可视化 Diff</div>
              <div className={styles.compareCell}>❌ 终端查看</div>
              <div className={styles.compareCell}>⚠️ 无法同步</div>
              <div className={`${styles.compareCell} ${styles.compareCellHighlight}`}>✅ 侧边栏对比</div>
            </div>
            <div className={styles.compareRow}>
              <div className={styles.compareCell}>安全审批</div>
              <div className={styles.compareCell}>❌ 无</div>
              <div className={styles.compareCell}>⚠️ 弱</div>
              <div className={`${styles.compareCell} ${styles.compareCellHighlight}`}>✅ 逐条确认</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className={styles.featuresSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>核心功能</h2>
          <div className={styles.featuresGrid}>
            {features.map((feature, idx) => (
              <div key={idx} className={styles.featureCard}>
                <div className={styles.featureIcon}>{feature.icon}</div>
                <h3 className={styles.featureTitle}>{feature.title}</h3>
                <p className={styles.featureDesc}>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Performance Benchmarks */}
      <section className={styles.benchmarkSection}>
        <div className="container">
          <h2 className={styles.sectionTitle}>极致性能优化</h2>
          <p className={styles.sectionSubtitle}>
            14 项深度优化，让大项目也能丝滑运行
          </p>

          <div className={styles.benchmarkGrid}>
            {benchmarks.map((item, idx) => (
              <div key={idx} className={styles.benchmarkCard}>
                <div className={styles.benchmarkMetric}>{item.metric}</div>
                <div className={styles.benchmarkComparison}>
                  <span className={styles.benchmarkBefore}>{item.before}</span>
                  <span className={styles.benchmarkArrow}>→</span>
                  <span className={styles.benchmarkAfter}>{item.after}</span>
                </div>
                <div className={styles.benchmarkImprovement}>{item.improvement} 提升</div>
              </div>
            ))}
          </div>

          <p className={styles.benchmarkNote}>
            * 更多优化细节见 <Link to="/docs/security">性能优化专题</Link>
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className={styles.ctaSection}>
        <div className="container">
          <h2 className={styles.ctaTitle}>准备好升级你的编程体验了吗？</h2>
          <p className={styles.ctaSubtitle}>
            完全开源，MIT 许可证，企业和个人均可免费使用
          </p>
          <div className={styles.ctaButtons}>
            <a href="https://github.com/GoDiao/dreamcoder/releases" className={styles.primaryBtn}>
              <span>🚀</span> 立即下载
            </a>
            <a href="https://github.com/GoDiao/dreamcoder" className={styles.secondaryBtn}>
              ⭐ Star on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className="container">
          <p>
            © 2024-{new Date().getFullYear()} GoDiao & DreamCoder Contributors ·
            <Link to="/docs/intro"> 文档</Link> ·
            <Link to="https://github.com/GoDiao/dreamcoder"> GitHub</Link>
          </p>
          <p className={styles.footerLicense}>MIT License · Open Source Forever</p>
        </div>
      </footer>
    </main>
  );
}