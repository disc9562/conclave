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

  test('parses the FIRST object when the CLI repeats it concatenated', async () => {
    // Observed live: Claude emits {...}{...} (the 2nd often truncated). A greedy
    // brace match would span both and fail; we must take the first balanced one.
    const obj = JSON.stringify({ nextSpeaker: 'codex', reason: 'go first' })
    const m = new Moderator(async () => `${obj}${obj.slice(0, 20)}`, ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('codex')
    expect(d.reason).toBe('go first')
  })

  test('extracts a fenced object containing a brace inside a string value', async () => {
    const m = new Moderator(
      async () => '```json\n{"nextSpeaker":"claude","reason":"use {x} syntax"}\n```',
      ['claude', 'codex'],
    )
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('claude')
    expect(d.reason).toBe('use {x} syntax')
  })

  test('falls back to done when speaker is unknown', async () => {
    const m = new Moderator(async () => JSON.stringify({ nextSpeaker: 'grok' }), ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('done')
  })
})
