import { runCli } from './spawn.js'
import type { ToolItem } from './codexTools.js'

export function parseGrokPlugins(text: string): ToolItem[] {
  if (/^No plugins installed/.test(text.trim())) return []
  const out: ToolItem[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^(\S+)\s+(enabled|disabled)\s*$/)
    if (!m) continue
    out.push({ name: m[1]!, enabled: m[2] === 'enabled', summary: 'plugin' })
  }
  return out
}

export async function listGrok(): Promise<{ plugins: ToolItem[]; mcp: ToolItem[] }> {
  const pluginsText = await runCli(['grok', 'plugin', 'list'])
  return { plugins: parseGrokPlugins(pluginsText), mcp: [] }
}

export async function setGrokPluginEnabled(name: string, on: boolean): Promise<void> {
  await runCli(['grok', 'plugin', on ? 'enable' : 'disable', name])
}

export async function setGrokMcpEnabled(name: string, on: boolean): Promise<void> {
  if (!on) {
    await runCli(['grok', 'mcp', 'remove', name])
    return
  }
  throw new Error('Re-enabling grok MCP is not supported yet (no servers configured)')
}
