import { describe, it, expect } from 'bun:test'
import { parseGrokPlugins } from './grokTools'

describe('parseGrokPlugins', () => {
  it('returns [] for the empty-state message', () => {
    expect(parseGrokPlugins('No plugins installed. Run `grok plugin install --help` to get started.')).toEqual([])
  })

  it('parses name + enabled/disabled rows', () => {
    const text = `my-plugin    enabled
other-tool   disabled`
    expect(parseGrokPlugins(text)).toEqual([
      { name: 'my-plugin', enabled: true, summary: 'plugin' },
      { name: 'other-tool', enabled: false, summary: 'plugin' },
    ])
  })
})
