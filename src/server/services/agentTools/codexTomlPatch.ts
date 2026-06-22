export function patchCodexMcpEnabled(toml: string, name: string, on: boolean): string {
  const header = `[mcp_servers.${name}]`
  const lines = toml.split('\n')
  const headerIdx = lines.findIndex((l) => l.trim() === header)
  if (headerIdx === -1) {
    throw new Error(`codex config.toml has no section [mcp_servers.${name}]`)
  }

  let enabledIdx = -1
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const t = lines[i]!.trim()
    if (t.startsWith('[')) break // next section
    if (/^enabled\s*=/.test(t)) { enabledIdx = i; break }
  }

  if (on) {
    if (enabledIdx !== -1) lines.splice(enabledIdx, 1)
  } else if (enabledIdx !== -1) {
    lines[enabledIdx] = 'enabled = false'
  } else {
    lines.splice(headerIdx + 1, 0, 'enabled = false')
  }

  return lines.join('\n')
}
