import React from 'react';

const architectureData = {
  layers: [
    {
      name: 'UI Layer',
      color: '#efe9de',
      textColor: '#141413',
      borderColor: '#e6dfd8',
      items: ['会话多标签页', '可视化 Diff 面板', '集成终端 xterm.js'],
      icon: '🎨'
    },
    {
      name: 'Rust Core',
      color: '#181715',
      textColor: '#faf9f5',
      borderColor: '#cc785c',
      items: ['窗口状态持久化', '安全审批闸口', 'PTY 终端控制'],
      icon: '⚙️'
    },
    {
      name: 'Bun Runtime',
      color: '#1f1e1b',
      textColor: '#faf9f5',
      borderColor: '#5db8a6',
      items: ['AI Agent 引擎', 'Provider 路由', 'MCP 工具服务'],
      icon: '🚀'
    },
    {
      name: 'Cloud Providers',
      color: '#faf9f5',
      textColor: '#141413',
      borderColor: '#8e8b82',
      items: ['DeepSeek', 'Kimi', 'MiniMax', 'Claude', '通义千问'],
      icon: '☁️'
    }
  ],
  flows: [
    { from: 0, to: 1, label: 'HTTP / WebSocket' },
    { from: 1, to: 2, label: 'Sidecar IPC' },
    { from: 2, to: 3, label: '全模型直连' }
  ]
};

export default function ArchitectureGraph() {
  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: '32px'
    }}>
      {/* Architecture Layers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {architectureData.layers.map((layer, layerIdx) => (
          <div key={layerIdx} style={{
            background: layer.color,
            border: `2px solid ${layer.borderColor}`,
            borderRadius: '12px',
            padding: '24px 16px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '12px' }}>{layer.icon}</div>
            <h3 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '1.1rem',
              fontWeight: 500,
              color: layer.textColor,
              marginBottom: '16px',
              letterSpacing: '-0.3px'
            }}>
              {layer.name}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {layer.items.map((item, itemIdx) => (
                <li key={itemIdx} style={{
                  fontSize: '0.75rem',
                  color: layer.textColor,
                  opacity: 0.85,
                  marginBottom: '8px',
                  lineHeight: 1.4
                }}>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Connection Arrows */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '8px',
        marginBottom: '32px'
      }}>
        {architectureData.flows.map((flow, idx) => (
          <div key={idx} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: '#181715',
            padding: '8px 16px',
            borderRadius: '9999px'
          }}>
            <span style={{ color: '#cc785c', fontWeight: 500, fontSize: '0.8rem' }}>{flow.label}</span>
            <span style={{ color: '#5db8a6' }}>→</span>
          </div>
        ))}
      </div>

      {/* Key Features */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px'
      }}>
        {[
          { icon: '🔒', title: '本地安全沙盒', desc: '所有 API Key 和会话数据仅存储本地，不上传任何凭据到云端' },
          { icon: '⚡', title: '极速 IPC 直连', desc: 'Sidecar 进程通过管道传输，延迟 < 1ms，告别 WebSocket 双跳' },
          { icon: '🌐', title: '国内原生直连', desc: 'DeepSeek / Kimi / MiniMax 等主流模型，无需科学上网' }
        ].map((feature, idx) => (
          <div key={idx} style={{
            background: '#252320',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>{feature.icon}</div>
            <h4 style={{ color: '#faf9f5', fontSize: '0.95rem', fontWeight: 500, marginBottom: '6px' }}>
              {feature.title}
            </h4>
            <p style={{ color: '#a09d96', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}