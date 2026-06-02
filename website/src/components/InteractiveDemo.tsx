import React, { useState, useEffect } from 'react';

const providers = [
  { id: 'deepseek', name: 'DeepSeek V3', type: 'OpenAI 兼容', latency: 12, color: '#5db8a6' },
  { id: 'claude', name: 'Claude 3.5 Sonnet', type: 'Anthropic', latency: 185, color: '#cc785c' },
  { id: 'minimax', name: 'MiniMax M2.7', type: 'MiniMax Proxy', latency: 45, color: '#e8a55a' },
  { id: 'qwen', name: '通义千问 Qwen', type: '阿里云', latency: 38, color: '#8e8b82' },
];

const demoSteps = [
  { type: 'info', text: '正在初始化 DreamCoder 本地运行时...', delay: 500 },
  { type: 'success', text: '✓ 加载配置文件 ~/.dreamcoder/config.json', delay: 200 },
  { type: 'success', text: '✓ 连接 Provider 端点...', delay: 150 },
  { type: 'success', text: '✓ 成功建立安全会话 (SID: abc123)', delay: 100 },
  { type: 'ai', text: '🤖 有什么可以帮你的？', delay: 300 },
  { type: 'user', text: '> 帮我写一个 Express REST API', delay: 200 },
  { type: 'info', text: '⚡ AI 正在分析需求并生成代码...', delay: 800 },
  { type: 'tool', text: '🔧 工具调用: write_file(src/routes/users.js)', delay: 200 },
  { type: 'tool', text: '🔧 工具调用: write_file(src/models/user.js)', delay: 150 },
  { type: 'success', text: '✓ 已生成 3 个文件，共 156 行代码', delay: 200 },
  { type: 'warning', text: '🛡️ 检测到高风险操作: git push --force', delay: 100 },
  { type: 'approval', text: '⚠️ 等待用户审批中...', delay: 0 },
];

export default function InteractiveDemo() {
  const [activeProvider, setActiveProvider] = useState(providers[0]);
  const [logs, setLogs] = useState<string[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [pendingApproval, setPendingApproval] = useState(false);

  useEffect(() => {
    if (currentStep < demoSteps.length) {
      const step = demoSteps[currentStep];
      const timer = setTimeout(() => {
        setLogs(prev => [...prev, step.text]);
        if (step.type === 'approval') {
          setPendingApproval(true);
        }
        setCurrentStep(c => c + 1);
      }, step.delay);
      return () => clearTimeout(timer);
    }
  }, [currentStep]);

  const handleProviderChange = (provider: typeof providers[0]) => {
    setActiveProvider(provider);
    setLogs([]);
    setCurrentStep(0);
    setPendingApproval(false);
  };

  const handleApprove = () => {
    setPendingApproval(false);
    setLogs(prev => [...prev, '✅ 用户已批准，执行命令...']);
    setTimeout(() => {
      setLogs(prev => [...prev, '✓ git push --force 完成']);
      setTimeout(() => {
        setLogs(prev => [...prev, '✓ 已同步到远程仓库']);
      }, 300);
    }, 500);
  };

  const handleReject = () => {
    setPendingApproval(false);
    setLogs(prev => [...prev, '❌ 用户已拒绝操作']);
    setTimeout(() => {
      setLogs(prev => [...prev, '🤖 AI 已收到反馈，调整策略中...']);
    }, 400);
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '300px 1fr',
      gap: '24px',
      maxWidth: '1100px',
      margin: '0 auto',
      padding: '32px'
    }}>
      {/* Left: Provider Panel */}
      <div style={{
        background: '#efe9de',
        borderRadius: '12px',
        padding: '24px'
      }}>
        <h3 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: '1.25rem',
          fontWeight: 500,
          color: '#141413',
          marginBottom: '20px'
        }}>
          选择模型供应��
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {providers.map((provider) => (
            <button
              key={provider.id}
              onClick={() => handleProviderChange(provider)}
              style={{
                background: activeProvider.id === provider.id ? `${provider.color}15` : 'transparent',
                border: `2px solid ${activeProvider.id === provider.id ? provider.color : 'transparent'}`,
                borderRadius: '8px',
                padding: '14px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '4px'
              }}>
                <span style={{
                  fontWeight: 500,
                  color: '#141413',
                  fontSize: '0.95rem'
                }}>{provider.name}</span>
                <span style={{
                  background: `${provider.color}20`,
                  color: provider.color,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '0.7rem',
                  fontWeight: 600
                }}>
                  {provider.latency}ms
                </span>
              </div>
              <span style={{ fontSize: '0.75rem', color: '#6c6a64' }}>{provider.type}</span>
            </button>
          ))}
        </div>

        {/* Current Status */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: '#141413',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '0.75rem', color: '#8e8b82', marginBottom: '8px' }}>当前状态</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#5db8a6',
              boxShadow: '0 0 8px #5db8a6'
            }} />
            <span style={{ color: '#faf9f5', fontSize: '0.9rem', fontWeight: 500 }}>
              已连接 {activeProvider.name}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Terminal Demo */}
      <div style={{
        background: '#181715',
        borderRadius: '16px',
        overflow: 'hidden',
        border: '1px solid #252320'
      }}>
        {/* Terminal Header */}
        <div style={{
          background: '#252320',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f56' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ffbd2e' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#27c93f' }} />
          </div>
          <span style={{
            color: '#8e8b82',
            fontSize: '0.8rem',
            fontFamily: "'JetBrains Mono', monospace"
          }}>
            DreamCoder — {activeProvider.name}
          </span>
        </div>

        {/* Terminal Body */}
        <div style={{
          padding: '20px',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.85rem',
          minHeight: '380px',
          maxHeight: '380px',
          overflowY: 'auto',
          lineHeight: 1.7
        }}>
          {logs.map((log, idx) => (
            <div key={idx} style={{
              marginBottom: '4px',
              color: log.includes('🤖') ? '#e8a55a' :
                     log.includes('>') ? '#faf9f5' :
                     log.includes('✓') ? '#5db8a6' :
                     log.includes('����️') || log.includes('⚠️') ? '#e8a55a' :
                     log.includes('❌') ? '#c64545' :
                     log.includes('🔧') ? '#5db8a6' :
                     '#a09d96'
            }}>
              {log}
            </div>
          ))}

          {/* Approval Card */}
          {pendingApproval && (
            <div style={{
              marginTop: '16px',
              padding: '16px',
              background: '#252320',
              border: '1px solid #e8a55a',
              borderRadius: '8px'
            }}>
              <div style={{
                fontSize: '0.8rem',
                color: '#e8a55a',
                fontWeight: 500,
                marginBottom: '12px'
              }}>
                🛡️ 高风险操作需要审批
              </div>
              <div style={{
                background: '#1f1e1b',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                color: '#a09d96',
                marginBottom: '12px',
                fontFamily: "'JetBrains Mono', monospace"
              }}>
                $ git push --force origin main
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleReject}
                  style={{
                    background: 'transparent',
                    border: '1px solid #c64545',
                    color: '#c64545',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500
                  }}
                >
                  拒绝
                </button>
                <button
                  onClick={handleApprove}
                  style={{
                    background: '#5db8a6',
                    border: 'none',
                    color: '#141413',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 600
                  }}
                >
                  批准执行
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}