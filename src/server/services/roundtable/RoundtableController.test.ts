import { describe, expect, test } from 'bun:test'
import { RoundtableController } from './RoundtableController.js'
import type { Participant } from './Participant.js'
import { Moderator } from './Moderator.js'
import type { CapabilityMode, ParticipantEvent, ParticipantId } from './types.js'

function fake(id: ParticipantId, line: string): Participant {
  return { id, async *send(): AsyncIterable<ParticipantEvent> { yield { kind: 'text', text: line }; yield { kind: 'done' } } }
}

describe('RoundtableController', () => {
  test('emits roundtable_event ServerMessages with stamped timestamps', async () => {
    const emitted: Array<{ type: string }> = []
    const controller = new RoundtableController({
      buildParticipants: () => new Map<ParticipantId, Participant>([
        ['claude', fake('claude', 'a')],
        ['codex', fake('codex', 'b')],
      ]),
      buildModerator: (ids) => new Moderator(
        (() => { let i = 0; const seq = ['claude', 'codex', 'done']; return async () => JSON.stringify({ nextSpeaker: seq[i++] }) })(),
        ids,
      ),
      now: () => 999,
      maxRounds: 12,
    })
    await controller.start('s1', 'go', { claude: 'discuss', codex: 'discuss' } as Record<'claude' | 'codex', CapabilityMode>, (m) => emitted.push(m))
    expect(emitted.every((m) => m.type === 'roundtable_event')).toBe(true)
    expect(emitted.some((m) => (m as { event: { kind: string } }).event.kind === 'complete')).toBe(true)
    expect((emitted[0] as { timestamp: number }).timestamp).toBe(999)
  })
})
