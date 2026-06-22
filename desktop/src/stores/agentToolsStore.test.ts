import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../api/agentTools', () => ({
  agentToolsApi: {
    getCodex: vi.fn(),
    getGrok: vi.fn(),
    toggle: vi.fn(),
  },
}))

import { useAgentToolsStore } from './agentToolsStore'
import { agentToolsApi } from '../api/agentTools'

beforeEach(() => {
  useAgentToolsStore.setState({ codex: null, grok: null, loading: {}, error: null })
  vi.clearAllMocks()
})

describe('agentToolsStore', () => {
  it('load(codex) stores the fetched data', async () => {
    ;(agentToolsApi.getCodex as any).mockResolvedValue({ available: true, mcp: [{ name: 'a', enabled: true, summary: 'stdio' }], features: [] })
    await useAgentToolsStore.getState().load('codex')
    expect(useAgentToolsStore.getState().codex?.mcp[0]?.name).toBe('a')
  })

  it('setEnabled flips optimistically then reconciles with server response', async () => {
    useAgentToolsStore.setState({ codex: { available: true, mcp: [{ name: 'a', enabled: true, summary: 'stdio' }], features: [] } })
    ;(agentToolsApi.toggle as any).mockResolvedValue({ available: true, mcp: [{ name: 'a', enabled: false, summary: 'stdio' }], features: [] })
    const p = useAgentToolsStore.getState().setEnabled('codex', 'mcp', 'a', false)
    expect(useAgentToolsStore.getState().codex?.mcp[0]?.enabled).toBe(false)
    await p
    expect(useAgentToolsStore.getState().codex?.mcp[0]?.enabled).toBe(false)
  })

  it('setEnabled reverts the optimistic flip on error', async () => {
    useAgentToolsStore.setState({ codex: { available: true, mcp: [{ name: 'a', enabled: true, summary: 'stdio' }], features: [] } })
    ;(agentToolsApi.toggle as any).mockRejectedValue(new Error('boom'))
    await useAgentToolsStore.getState().setEnabled('codex', 'mcp', 'a', false)
    expect(useAgentToolsStore.getState().codex?.mcp[0]?.enabled).toBe(true) // reverted
    expect(useAgentToolsStore.getState().error).toContain('boom')
  })
})
