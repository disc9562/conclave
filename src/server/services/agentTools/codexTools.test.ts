import { describe, it, expect } from 'bun:test'
import { parseCodexFeatures, mapCodexMcp } from './codexTools'

const FEATURES = `apply_patch_freeform                 removed            false
apps                                 stable             true
browser_use                          stable             true
artifact                             under development  false
fast_mode                            stable             true
`

const MCP_JSON = JSON.stringify([
  {
    name: 'atlassian',
    enabled: true,
    transport: { type: 'stdio', command: 'docker', env: { JIRA_API_TOKEN: 'SUPER-SECRET' } },
  },
  {
    name: 'weather',
    enabled: false,
    transport: { type: 'http', url: 'https://example.com' },
  },
])

describe('parseCodexFeatures', () => {
  it('keeps only stable-stage rows with their enabled bool', () => {
    const out = parseCodexFeatures(FEATURES)
    expect(out.map((f) => f.name)).toEqual(['apps', 'browser_use', 'fast_mode'])
    expect(out.find((f) => f.name === 'apps')).toEqual({ name: 'apps', enabled: true, summary: 'stable' })
  })
})

describe('mapCodexMcp', () => {
  it('maps name/enabled/transport and strips env secrets entirely', () => {
    const out = mapCodexMcp(MCP_JSON)
    expect(out).toEqual([
      { name: 'atlassian', enabled: true, summary: 'stdio' },
      { name: 'weather', enabled: false, summary: 'http' },
    ])
    expect(JSON.stringify(out)).not.toContain('SUPER-SECRET')
  })
})
