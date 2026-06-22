import { api } from './client'

export type ToolItem = { name: string; enabled: boolean; summary: string }
export type CodexData = { available: boolean; mcp: ToolItem[]; features: ToolItem[] }
export type GrokData = { available: boolean; plugins: ToolItem[]; mcp: ToolItem[] }

export const agentToolsApi = {
  getCodex: () => api.get<CodexData>('/api/agent-tools/codex'),
  getGrok: () => api.get<GrokData>('/api/agent-tools/grok'),
  toggle: (body: { tool: 'codex' | 'grok'; kind: 'mcp' | 'features' | 'plugins'; name: string; enabled: boolean }) =>
    api.post<CodexData | GrokData>('/api/agent-tools/toggle', body),
}
