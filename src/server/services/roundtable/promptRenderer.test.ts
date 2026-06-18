// src/server/services/roundtable/promptRenderer.test.ts
import { describe, expect, test } from 'bun:test'
import { renderTranscriptForPrompt } from './promptRenderer.js'
import type { SharedTranscript } from './types.js'

const t: SharedTranscript = {
  entries: [
    { author: 'user', text: 'How should we cache this?', timestamp: 1 },
    { author: 'claude', text: 'Use an LRU.', timestamp: 2 },
  ],
}

describe('renderTranscriptForPrompt', () => {
  test('labels each entry by author and addresses the speaker', () => {
    const out = renderTranscriptForPrompt(t, 'codex')
    expect(out).toContain('User: How should we cache this?')
    expect(out).toContain('Claude: Use an LRU.')
    expect(out).toContain('You are Codex')
  })

  test('appends the instruction when provided', () => {
    const out = renderTranscriptForPrompt(t, 'codex', 'Focus on eviction policy.')
    expect(out.trimEnd().endsWith('Focus on eviction policy.')).toBe(true)
  })
})
