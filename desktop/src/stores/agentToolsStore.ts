import { create } from 'zustand'
import { agentToolsApi, type CodexData, type GrokData, type ToolItem } from '../api/agentTools'
import { useUIStore } from './uiStore'

type Tool = 'codex' | 'grok'
type Kind = 'mcp' | 'features' | 'plugins'

type State = {
  codex: CodexData | null
  grok: GrokData | null
  loading: Partial<Record<Tool, boolean>>
  error: string | null
  load: (tool: Tool) => Promise<void>
  setEnabled: (tool: Tool, kind: Kind, name: string, enabled: boolean) => Promise<void>
}

function flip(data: CodexData | GrokData | null, kind: Kind, name: string, enabled: boolean) {
  if (!data) return data
  const group = (data as any)[kind] as ToolItem[] | undefined
  if (!group) return data
  return { ...data, [kind]: group.map((i) => (i.name === name ? { ...i, enabled } : i)) }
}

export const useAgentToolsStore = create<State>((set, get) => ({
  codex: null,
  grok: null,
  loading: {},
  error: null,

  load: async (tool) => {
    set((s) => ({ loading: { ...s.loading, [tool]: true }, error: null }))
    try {
      const data = tool === 'codex' ? await agentToolsApi.getCodex() : await agentToolsApi.getGrok()
      set(tool === 'codex' ? { codex: data as CodexData } : { grok: data as GrokData })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
    } finally {
      set((s) => ({ loading: { ...s.loading, [tool]: false } }))
    }
  },

  setEnabled: async (tool, kind, name, enabled) => {
    const key = tool === 'codex' ? 'codex' : 'grok'
    const prev = get()[key]
    set({ [key]: flip(prev, kind, name, enabled) } as any, false)
    try {
      const fresh = await agentToolsApi.toggle({ tool, kind, name, enabled })
      set({ [key]: fresh } as any)
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      set({ [key]: prev, error: message } as any) // revert
      useUIStore.getState().addToast({ type: 'error', message })
    }
  },
}))
