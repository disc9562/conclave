import React from 'react';

const benchmarks = [
  {
    name: '会话元数据缓存',
    before: 2020,
    after: 81,
    unit: 'ms',
    improvement: '24.8x',
    color: '#cc785c'
  },
  {
    name: 'Elapsed Timer 外置',
    before: 10.91,
    after: 6.74,
    unit: 'ms',
    improvement: '1.6x',
    color: '#5db8a6'
  },
  {
    name: 'Markdown 渲染',
    before: 105,
    after: 0,
    unit: 'μs',
    improvement: '主线程解放',
    color: '#e8a55a',
    note: 'useDeferredValue'
  }
];

export default function PerfDashboard() {
  const maxBefore = Math.max(...benchmarks.map(b => b.before));

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {benchmarks.map((item, idx) => (
          <div key={idx} style={{
            background: '#252320',
            borderRadius: '12px',
            padding: '24px'
          }}>
            {/* Metric Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <h3 style={{
                color: '#faf9f5',
                fontSize: '1rem',
                fontWeight: 500,
                margin: 0
              }}>{item.name}</h3>
              <span style={{
                background: `${item.color}20`,
                color: item.color,
                padding: '4px 12px',
                borderRadius: '9999px',
                fontSize: '0.8rem',
                fontWeight: 600
              }}>{item.improvement}</span>
            </div>

            {/* Visual Bar - Before */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: '#8e8b82',
                marginBottom: '6px'
              }}>
                <span>Before</span>
                <span>{item.before}{item.unit}</span>
              </div>
              <div style={{
                height: '24px',
                background: '#1f1e1b',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: item.before === 0 ? '0%' : `${(item.before / maxBefore) * 100}%`,
                  height: '100%',
                  background: '#6c6a64',
                  borderRadius: '6px',
                  transition: 'width 0.8s ease'
                }} />
              </div>
            </div>

            {/* Visual Bar - After */}
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: item.color,
                marginBottom: '6px'
              }}>
                <span>After</span>
                <span style={{ fontWeight: 600 }}>
                  {item.after === 0 ? item.note : `${item.after}${item.unit}`}
                </span>
              </div>
              <div style={{
                height: '24px',
                background: '#1f1e1b',
                borderRadius: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: item.after === 0 ? '15%' : `${Math.max((item.after / maxBefore) * 100, 8)}%`,
                  height: '100%',
                  background: item.color,
                  borderRadius: '6px',
                  transition: 'width 0.8s ease',
                  boxShadow: `0 0 20px ${item.color}40`
                }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginTop: '32px'
      }}>
        {[
          { value: '14', label: '项深度优化', icon: '⚡' },
          { value: '100%', label: '本地隐私保护', icon: '🔒' },
          { value: '∞', label: '主线程自由', icon: '🚀' }
        ].map((stat, idx) => (
          <div key={idx} style={{
            background: '#181715',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '4px' }}>{stat.icon}</div>
            <div style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: '2rem',
              fontWeight: 600,
              color: '#faf9f5'
            }}>{stat.value}</div>
            <div style={{ fontSize: '0.8rem', color: '#a09d96' }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}