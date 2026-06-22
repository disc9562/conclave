import { describe, it, expect } from 'vitest'
import { reduceRoundtableEvent, emptyRoundtableSession, normalizeRehydrated } from './roundtableStore'
import type { RoundtableEvent } from '../types/chat'

describe('normalizeRehydrated', () => {
  it('resets a persisted running session to complete, keeps entries', () => {
    const out = normalizeRehydrated({
      s1: { entries: [{ id: 'x', kind: 'user', text: 'hi' }], status: 'running', seq: 1, activeSpeaker: 'codex' },
      s2: { entries: [], status: 'complete', seq: 0, activeSpeaker: null },
    })
    expect(out.s1.status).toBe('complete')
    expect(out.s1.activeSpeaker).toBe(null)
    expect(out.s1.entries).toHaveLength(1)
    expect(out.s2.status).toBe('complete')
  })
})

function run(events: RoundtableEvent[]) {
  return events.reduce((s, e) => reduceRoundtableEvent(s, e), emptyRoundtableSession())
}

describe('reduceRoundtableEvent', () => {
  it('merges consecutive text from the same speaker into one message', () => {
    const s = run([
      { kind: 'speaker-start', author: 'claude' },
      { kind: 'text', author: 'claude', text: 'Hello ' },
      { kind: 'text', author: 'claude', text: 'world' },
      { kind: 'speaker-end', author: 'claude' },
    ])
    const messages = s.entries.filter((e) => e.kind === 'message')
    expect(messages).toHaveLength(1)
    expect(messages[0]).toMatchObject({ kind: 'message', author: 'claude', text: 'Hello world' })
  })

  it('renders the moderator reason as a system entry', () => {
    const s = run([{ kind: 'speaker-start', author: 'codex', reason: 'Codex has shell expertise' }])
    expect(s.entries.find((e) => e.kind === 'system')).toMatchObject({
      kind: 'system',
      text: 'Codex has shell expertise',
    })
  })

  it('starts a fresh message when the speaker changes', () => {
    const s = run([
      { kind: 'speaker-start', author: 'claude' },
      { kind: 'text', author: 'claude', text: 'A' },
      { kind: 'speaker-start', author: 'codex' },
      { kind: 'text', author: 'codex', text: 'B' },
    ])
    const messages = s.entries.filter((e) => e.kind === 'message')
    expect(messages.map((m) => (m.kind === 'message' ? m.author : ''))).toEqual(['claude', 'codex'])
  })

  it('records a participant error as an error entry without ending the run', () => {
    const s = run([{ kind: 'participant-error', author: 'codex', error: 'codex not logged in' }])
    expect(s.entries.find((e) => e.kind === 'error')).toMatchObject({
      kind: 'error',
      author: 'codex',
      text: 'codex not logged in',
    })
    expect(s.status).not.toBe('complete')
  })

  it('marks the session complete on a complete event', () => {
    const s = run([{ kind: 'complete' }])
    expect(s.status).toBe('complete')
  })

  it('renders round-limit as a system entry and completes', () => {
    const s = run([{ kind: 'round-limit', rounds: 12 }])
    expect(s.entries.find((e) => e.kind === 'system')?.text).toContain('12')
    expect(s.status).toBe('complete')
  })

  it('assigns unique ids from the seq counter', () => {
    const s = run([
      { kind: 'speaker-start', author: 'claude', reason: 'x' },
      { kind: 'participant-error', author: 'codex', error: 'y' },
    ])
    const ids = s.entries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
})
