import { describe, expect, test } from 'bun:test'
import { RoundtableOrchestrator } from './RoundtableOrchestrator.js'
import type { RoundtableEvent } from './RoundtableOrchestrator.js'
import { Moderator, RotationModerator } from './Moderator.js'
import type { Participant } from './Participant.js'
import { createTranscript, appendEntry } from './transcript.js'
import type { CapabilityMode, ParticipantEvent, ParticipantId } from './types.js'

function fakeParticipant(id: ParticipantId, line: string): Participant {
  return {
    id,
    async *send(): AsyncIterable<ParticipantEvent> {
      yield { kind: 'text', text: line }
      yield { kind: 'done' }
    },
  }
}

function scriptedModerator(seq: Array<ParticipantId | 'done'>, ids: ParticipantId[]) {
  let i = 0
  const complete = async () => JSON.stringify({ nextSpeaker: seq[i++] ?? 'done' })
  return new Moderator(complete, ids)
}

describe('RoundtableOrchestrator', () => {
  test('routes turns in moderator order and tags author on appended entries', async () => {
    const participants = new Map<ParticipantId, Participant>([
      ['claude', fakeParticipant('claude', 'from claude')],
      ['codex', fakeParticipant('codex', 'from codex')],
    ])
    const orch = new RoundtableOrchestrator({
      participants,
      moderator: scriptedModerator(['claude', 'codex', 'done'], ['claude', 'codex']),
      modes: new Map<ParticipantId, CapabilityMode>([['claude', 'discuss'], ['codex', 'discuss']]),
      maxRounds: 12,
    })
    const events: RoundtableEvent[] = []
    const start = appendEntry(createTranscript(), { author: 'user', text: 'go', timestamp: 1 })
    const final = await orch.run(start, (e) => events.push(e))

    const authored = final.entries.filter((e) => e.author !== 'user')
    expect(authored.map((e) => e.author)).toEqual(['claude', 'codex'])
    expect(authored.map((e) => e.text)).toEqual(['from claude', 'from codex'])
    expect(events.at(-1)).toEqual({ kind: 'complete' })
  })

  test('emits participant-error and continues when a participant throws', async () => {
    const boom: Participant = {
      id: 'codex',
      async *send(): AsyncIterable<ParticipantEvent> { throw new Error('cli down') },
    }
    const participants = new Map<ParticipantId, Participant>([
      ['claude', fakeParticipant('claude', 'ok')],
      ['codex', boom],
    ])
    const orch = new RoundtableOrchestrator({
      participants,
      moderator: scriptedModerator(['codex', 'claude', 'done'], ['claude', 'codex']),
      modes: new Map<ParticipantId, CapabilityMode>([['claude', 'discuss'], ['codex', 'discuss']]),
      maxRounds: 12,
    })
    const events: RoundtableEvent[] = []
    await orch.run(createTranscript(), (e) => events.push(e))
    expect(events.some((e) => e.kind === 'participant-error')).toBe(true)
    expect(events.some((e) => e.kind === 'text' && e.text === 'ok')).toBe(true)
  })

  test('forces the opener to speak when the moderator says "done" before anyone has', async () => {
    // The lightweight moderator can dismiss a short message with an immediate
    // "done"; the opener (first roster participant) must still answer.
    const participants = new Map<ParticipantId, Participant>([
      ['claude', fakeParticipant('claude', 'planner reply')],
      ['codex', fakeParticipant('codex', 'unused')],
    ])
    const orch = new RoundtableOrchestrator({
      participants,
      moderator: scriptedModerator(['done', 'done'], ['claude', 'codex']),
      modes: new Map<ParticipantId, CapabilityMode>([['claude', 'discuss'], ['codex', 'discuss']]),
      maxRounds: 12,
    })
    const events: RoundtableEvent[] = []
    const start = appendEntry(createTranscript(), { author: 'user', text: 'hi', timestamp: 1 })
    const final = await orch.run(start, (e) => events.push(e))

    const authored = final.entries.filter((e) => e.author !== 'user')
    expect(authored.map((e) => e.author)).toEqual(['claude'])
    expect(events.some((e) => e.kind === 'text' && e.text === 'planner reply')).toBe(true)
    // Second "done" (now that claude has spoken) is honored → completes.
    expect(events.at(-1)).toEqual({ kind: 'complete' })
  })

  test('RotationModerator walks the roster once in order, then done (no LLM)', async () => {
    const participants = new Map<ParticipantId, Participant>([
      ['claude', fakeParticipant('claude', 'plan')],
      ['codex', fakeParticipant('codex', 'build')],
      ['grok', fakeParticipant('grok', 'review')],
    ])
    const orch = new RoundtableOrchestrator({
      participants,
      moderator: new RotationModerator(['claude', 'codex', 'grok']),
      modes: new Map<ParticipantId, CapabilityMode>([
        ['claude', 'discuss'], ['codex', 'discuss'], ['grok', 'discuss'],
      ]),
      maxRounds: 12,
    })
    const events: RoundtableEvent[] = []
    const start = appendEntry(createTranscript(), { author: 'user', text: 'go', timestamp: 1 })
    const final = await orch.run(start, (e) => events.push(e))

    const authored = final.entries.filter((e) => e.author !== 'user')
    expect(authored.map((e) => e.author)).toEqual(['claude', 'codex', 'grok'])
    expect(events.at(-1)).toEqual({ kind: 'complete' })
  })

  test('stops at maxRounds and emits round-limit', async () => {
    const never = new Moderator(async () => JSON.stringify({ nextSpeaker: 'claude' }), ['claude'])
    const orch = new RoundtableOrchestrator({
      participants: new Map([['claude', fakeParticipant('claude', 'x')]]),
      moderator: never,
      modes: new Map<ParticipantId, CapabilityMode>([['claude', 'discuss']]),
      maxRounds: 3,
    })
    const events: RoundtableEvent[] = []
    await orch.run(createTranscript(), (e) => events.push(e))
    const turns = events.filter((e) => e.kind === 'speaker-end').length
    expect(turns).toBe(3)
    expect(events.some((e) => e.kind === 'round-limit')).toBe(true)
  })
})
