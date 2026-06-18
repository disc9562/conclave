// src/server/services/roundtable/Moderator.test.ts
import { describe, expect, test } from 'bun:test'
import { Moderator } from './Moderator.js'
import { createTranscript } from './transcript.js'

describe('Moderator', () => {
  test('returns the parsed decision when valid', async () => {
    const complete = async () => JSON.stringify({ nextSpeaker: 'codex', reason: 'codex knows CLIs' })
    const m = new Moderator(complete, ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('codex')
    expect(d.reason).toBe('codex knows CLIs')
  })

  test('falls back to done on invalid JSON', async () => {
    const m = new Moderator(async () => 'not json', ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('done')
  })

  test('falls back to done when speaker is unknown', async () => {
    const m = new Moderator(async () => JSON.stringify({ nextSpeaker: 'grok' }), ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('done')
  })
})
