import { describe, it, expect } from 'bun:test'
import { patchCodexMcpEnabled } from './codexTomlPatch'

const SAMPLE = `[projects."/Users/x"]
trust_level = "trusted"

[mcp_servers.atlassian]
command = "docker"
args = ["run", "-i"]

[mcp_servers.atlassian.env]
JIRA_API_TOKEN = "secret-should-survive"

[notice.model_migrations]
seen = true
`

describe('patchCodexMcpEnabled', () => {
  it('inserts enabled = false under the header when disabling a default-enabled server', () => {
    const out = patchCodexMcpEnabled(SAMPLE, 'atlassian', false)
    expect(out).toContain('[mcp_servers.atlassian]\nenabled = false\n')
    expect(out).toContain('[mcp_servers.atlassian.env]')
    expect(out).toContain('secret-should-survive')
    expect(out).toContain('[notice.model_migrations]')
  })

  it('flips an existing enabled = true to false', () => {
    const withFlag = SAMPLE.replace(
      '[mcp_servers.atlassian]\n',
      '[mcp_servers.atlassian]\nenabled = true\n',
    )
    const out = patchCodexMcpEnabled(withFlag, 'atlassian', false)
    expect(out).toContain('[mcp_servers.atlassian]\nenabled = false\n')
    expect(out).not.toContain('enabled = true')
  })

  it('removes the enabled line when enabling (codex defaults to enabled)', () => {
    const disabled = patchCodexMcpEnabled(SAMPLE, 'atlassian', false)
    const out = patchCodexMcpEnabled(disabled, 'atlassian', true)
    expect(out).not.toContain('enabled =')
    expect(out).toContain('[mcp_servers.atlassian]\ncommand = "docker"')
  })

  it('enabling an already-enabled server is a no-op', () => {
    const out = patchCodexMcpEnabled(SAMPLE, 'atlassian', true)
    expect(out).toBe(SAMPLE)
  })

  it('does not match the .env sub-table as the server header', () => {
    const out = patchCodexMcpEnabled(SAMPLE, 'atlassian', false)
    expect(out.indexOf('enabled = false')).toBeLessThan(out.indexOf('[mcp_servers.atlassian.env]'))
  })

  it('throws when the section is missing', () => {
    expect(() => patchCodexMcpEnabled(SAMPLE, 'nope', false)).toThrow(/mcp_servers\.nope/)
  })
})
