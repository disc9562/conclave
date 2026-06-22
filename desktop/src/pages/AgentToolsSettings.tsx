import { useState, useEffect } from 'react'
import { useTranslation } from '../i18n'
import { useAgentToolsStore } from '../stores/agentToolsStore'
import { McpSettings } from './McpSettings'
import type { ToolItem } from '../api/agentTools'

type SubTab = 'claude' | 'codex' | 'grok'

function ToggleRow({ item, onToggle }: { item: ToolItem; onToggle: (next: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 border-b border-white/5">
      <div>
        <div className="text-sm">{item.name}</div>
        <div className="text-xs text-gray-500">{item.summary}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={item.enabled}
        onClick={() => onToggle(!item.enabled)}
        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors cursor-pointer ${
          item.enabled ? 'bg-[var(--color-switch-checked-bg)]' : 'bg-[var(--color-border)]'
        }`}
      >
        <span
          className={`inline-block h-6 w-6 transform rounded-full bg-[var(--color-switch-thumb)] shadow-sm transition-transform ${
            item.enabled ? 'translate-x-7' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function Group({ title, items, kind, tool }: { title: string; items: ToolItem[]; kind: 'mcp' | 'features' | 'plugins'; tool: 'codex' | 'grok' }) {
  const setEnabled = useAgentToolsStore((s) => s.setEnabled)
  return (
    <div className="mb-6">
      <h3 className="text-xs uppercase text-gray-500 mb-1">{title}</h3>
      {items.length === 0
        ? <div className="text-sm text-gray-500 py-2">—</div>
        : items.map((it) => <ToggleRow key={it.name} item={it} onToggle={(next) => setEnabled(tool, kind, it.name, next)} />)}
    </div>
  )
}

export function AgentToolsSettings() {
  const t = useTranslation()
  const [tab, setTab] = useState<SubTab>('claude')
  const { codex, grok, load } = useAgentToolsStore()

  useEffect(() => {
    if (tab === 'codex' && !codex) load('codex')
    if (tab === 'grok' && !grok) load('grok')
  }, [tab, codex, grok, load])

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {(['claude', 'codex', 'grok'] as SubTab[]).map((id) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-3 py-1 text-sm rounded ${tab === id ? 'bg-white/10' : 'text-gray-400'}`}
          >
            {id === 'claude' ? 'Claude' : id === 'codex' ? 'Codex' : 'Grok'}
          </button>
        ))}
      </div>

      {tab === 'claude' && <McpSettings />}

      {tab === 'codex' && (
        codex && !codex.available
          ? <div className="text-sm text-gray-500">{t('agentTools.cliMissing', { tool: 'Codex' })}</div>
          : <>
              <Group tool="codex" kind="mcp" title="MCP Servers" items={codex?.mcp ?? []} />
              <Group tool="codex" kind="features" title="Features" items={codex?.features ?? []} />
            </>
      )}

      {tab === 'grok' && (
        grok && !grok.available
          ? <div className="text-sm text-gray-500">{t('agentTools.cliMissing', { tool: 'Grok' })}</div>
          : <>
              <Group tool="grok" kind="plugins" title="Plugins" items={grok?.plugins ?? []} />
              <Group tool="grok" kind="mcp" title="MCP Servers" items={grok?.mcp ?? []} />
            </>
      )}
    </div>
  )
}
