import { homedir } from 'node:os'
import { join } from 'node:path'
import { readFile, writeFile } from 'node:fs/promises'
import { runCli } from './spawn.js'
import { patchCodexMcpEnabled } from './codexTomlPatch.js'

export type ToolItem = { name: string; enabled: boolean; summary: string }

const CODEX_CONFIG = join(homedir(), '.codex', 'config.toml')

export function parseCodexFeatures(text: string): ToolItem[] {
  const out: ToolItem[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^(\S+)\s+(.+?)\s+(true|false)\s*$/)
    if (!m) continue
    const [, name, stage, bool] = m
    if (stage!.trim() !== 'stable') continue // MVP: stable only
    out.push({ name: name!, enabled: bool === 'true', summary: 'stable' })
  }
  return out
}

export function mapCodexMcp(json: string): ToolItem[] {
  const arr = JSON.parse(json) as Array<{
    name: string
    enabled?: boolean
    transport?: { type?: string }
  }>
  return arr.map((s) => ({
    name: s.name,
    enabled: s.enabled !== false,
    summary: s.transport?.type ?? 'unknown',
  }))
}

export async function listCodex(): Promise<{ mcp: ToolItem[]; features: ToolItem[] }> {
  const [mcpJson, featuresText] = await Promise.all([
    runCli(['codex', 'mcp', 'list', '--json']),
    runCli(['codex', 'features', 'list']),
  ])
  return { mcp: mapCodexMcp(mcpJson), features: parseCodexFeatures(featuresText) }
}

export async function setCodexMcpEnabled(name: string, on: boolean): Promise<void> {
  const toml = await readFile(CODEX_CONFIG, 'utf8')
  await writeFile(CODEX_CONFIG, patchCodexMcpEnabled(toml, name, on))
}

export async function setCodexFeatureEnabled(name: string, on: boolean): Promise<void> {
  await runCli(['codex', 'features', on ? 'enable' : 'disable', name])
}
