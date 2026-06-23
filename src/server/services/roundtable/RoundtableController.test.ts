import { describe, expect, test } from 'bun:test'
import { RoundtableController } from './RoundtableController.js'
import type { Participant } from './Participant.js'
import type { ModeratorLike } from './Moderator.js'
import type { CapabilityMode, ParticipantEvent, ParticipantId } from './types.js'

function fake(id: ParticipantId, line: string): Participant {
  return { id, async *send(): AsyncIterable<ParticipantEvent> { yield { kind: 'text', text: line }; yield { kind: 'done' } } }
}

describe('RoundtableController', () => {
  test('emits roundtable_event ServerMessages with stamped timestamps', async () => {
    const emitted: Array<{ type: string }> = []
    const controller = new RoundtableController({
      buildParticipants: (_sessionId) => new Map<ParticipantId, Participant>([
        ['claude', fake('claude', 'a')],
        ['codex', fake('codex', 'b')],
      ]),
      buildModerator: (): ModeratorLike => {
        let i = 0
        const seq: Array<ParticipantId | 'done'> = ['claude', 'codex', 'done']
        return { decide: async () => ({ nextSpeaker: seq[i++] ?? 'done' }) }
      },
      now: () => 999,
      maxRounds: 12,
    })
    await controller.start('s1', 'go', { claude: 'discuss', codex: 'discuss' } as Record<'claude' | 'codex', CapabilityMode>, false, (m) => emitted.push(m))
    expect(emitted.every((m) => m.type === 'roundtable_event')).toBe(true)
    expect(emitted.some((m) => (m as { event: { kind: string } }).event.kind === 'complete')).toBe(true)
    expect((emitted[0] as { timestamp: number }).timestamp).toBe(999)
  })

  test('carries prior rounds into the next start() on the same session', async () => {
    // The stateless codex/grok participants only see what's in the transcript
    // they receive — so the 2nd send must include the 1st round's entries.
    const seen: string[][] = []
    function recorder(id: ParticipantId): Participant {
      return {
        id,
        async *send(transcript): AsyncIterable<ParticipantEvent> {
          seen.push(transcript.entries.map((e) => e.text))
          yield { kind: 'text', text: `${id}-reply` }
          yield { kind: 'done' }
        },
      }
    }
    const controller = new RoundtableController({
      buildParticipants: () => new Map<ParticipantId, Participant>([['claude', recorder('claude')]]),
      buildModerator: (): ModeratorLike => {
        let i = 0
        const seq: Array<ParticipantId | 'done'> = ['claude', 'done']
        return { decide: async () => ({ nextSpeaker: seq[i++] ?? 'done' }) }
      },
      now: () => 1,
      maxRounds: 12,
    })
    const modes = { claude: 'discuss' } as Record<'claude', CapabilityMode>
    await controller.start('s1', 'first question', modes, false, () => {})
    await controller.start('s1', 'second question', modes, false, () => {})

    // 2nd start's participant must see: first question, claude's 1st reply, second question.
    expect(seen[1]).toEqual(['first question', 'claude-reply', 'second question'])
  })
})
