import React, { useState, useEffect } from 'react';
import BrowserOnly from '@docusaurus/BrowserOnly';

const providers = [
  { id: 'deepseek', name: 'DeepSeek V3', type: 'OpenAI 兼容', latency: 12, color: 'text-green-400' },
  { id: 'claude', name: 'Claude 3.5 Sonnet', type: 'Anthropic 官方', latency: 185, color: 'text-yellow-400' },
  { id: 'minimax', name: 'MiniMax M2.7', type: 'MiniMax Proxy', latency: 45, color: 'text-green-400' },
];

const mockLogs = [
  { type: 'info', text: '正在连接 provider...' },
  { type: 'success', text: 'Connected to endpoint' },
  { type: 'info', text: 'Sending request (42 tokens)' },
  { type: 'info', text: 'Streaming response...' },
  { type: 'success', text: 'ToolUse: ReadFile /src/main.ts' },
  { type: 'success', text: 'ToolResult: 124 lines read' },
];

function ProviderSpeedTestComponent() {
  const [activeProvider, setActiveProvider] = useState(providers[0]);
  const [logs, setLogs] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const handleProviderChange = (provider: any) => {
    setActiveProvider(provider);
    setLogs([]);
    simulateSession(provider);
  };

  const simulateSession = (provider: any) => {
    setIsTyping(true);
    // 模拟打字机效果
    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < mockLogs.length) {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${mockLogs[currentLogIndex].text}`]);
        currentLogIndex++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, provider.latency * 2); // 延迟根据 provider 速度调整
  };

  useEffect(() => {
    simulateSession(providers[0]);
  }, []);

  return (
    <div className="dc-simulator w-full max-w-4xl mx-auto my-8">
      <div className="dc-simulator-header">
        <div className="flex items-center space-x-2">
          <span className="dc-window-dot bg-[#ff5f56]"></span>
          <span className="dc-window-dot bg-[#ffbd2e]"></span>
          <span className="dc-window-dot bg-[#27c93f]"></span>
          <span className="text-xs text-[#8e8e93] ml-2 font-mono">DreamCoder - Provider Settings</span>
        </div>
        <div className="text-xs bg-[#2e2e38] text-[#00ddff] px-2 py-0.5 rounded font-mono">v0.3.0</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
        {/* 左侧：Provider 列表 */}
        <div className="col-span-1 border-r border-[var(--dc-border)] p-4 bg-[var(--dc-bg-secondary)]">
          <div className="text-xs font-bold text-[var(--dc-text-muted)] uppercase tracking-wider mb-4">模型供应商</div>
          <div className="space-y-2">
            {providers.map((provider) => (
              <div
                key={provider.id}
                onClick={() => handleProviderChange(provider)}
                className={`dc-provider-card p-3 rounded-lg flex justify-between items-center ${
                  activeProvider.id === provider.id ? 'active' : ''
                }`}
              >
                <div>
                  <div className="text-sm font-semibold text-[var(--dc-text-primary)]">{provider.name}</div>
                  <div className="text-xs text-[var(--dc-text-muted)]">{provider.type}</div>
                </div>
                <span className={`dc-latency-badge ${provider.color} bg-opacity-10`}>
                  {provider.latency}ms
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 右侧：模拟日志输出 */}
        <div className="col-span-2 p-4 bg-[var(--dc-bg-primary)] min-h-[300px] flex flex-col">
          <div className="text-xs font-bold text-[var(--dc-text-muted)] mb-2 flex justify-between items-center">
            <span>⚡ 实时工具执行与响应日志</span>
            {isTyping && <span className="animate-pulse text-[var(--dc-accent)]">Streaming...</span>}
          </div>

          <div className="flex-1 bg-[var(--dc-bg-secondary)] rounded p-3 font-mono text-xs overflow-y-auto max-h-[240px] border border-[var(--dc-border)]">
            {logs.length === 0 && !isTyping && (
              <div className="text-[var(--dc-text-muted)] italic">等待连接...</div>
            )}
            {logs.map((log, index) => (
              <div key={index} className="mb-1 text-[var(--dc-text-secondary)] border-b border-[var(--dc-border)] pb-1 last:border-0">
                {log}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProviderSpeedTest() {
  return (
    <BrowserOnly fallback={<div>Loading simulator...</div>}>
      {() => <ProviderSpeedTestComponent />}
    </BrowserOnly>
  );
}