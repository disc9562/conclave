import { RoundtableOrchestrator } from './RoundtableOrchestrator.js'
import type { RoundtableEvent } from './RoundtableOrchestrator.js'
import type { Participant } from './Participant.js'
import type { Moderator } from './Moderator.js'
import type { CapabilityMode, ParticipantId } from './types.js'
import { createTranscript, appendEntry } from './transcript.js'

type CliModes = Record<'claude' | 'codex', CapabilityMode>

export type RoundtableServerEvent = { type: 'roundtable_event'; event: RoundtableEvent; timestamp: number }

export type RoundtableControllerDeps = {
  buildParticipants: () => Map<ParticipantId, Participant>
  buildModerator: (ids: ParticipantId[]) => Moderator
  now: () => number
  maxRounds: number
}

export class RoundtableController {
  private aborts = new Map<string, AbortController>()
  constructor(private readonly deps: RoundtableControllerDeps) {}

  async start(
    sessionId: string,
    content: string,
    modes: CliModes,
    emit: (msg: RoundtableServerEvent) => void,
  ): Promise<void> {
    const participants = this.deps.buildParticipants()
    const ids = [...participants.keys()]
    const moderator = this.deps.buildModerator(ids)
    const modeMap = new Map<ParticipantId, CapabilityMode>([
      ['claude', modes.claude],
      ['codex', modes.codex],
    ])
    const orch = new RoundtableOrchestrator({ participants, moderator, modes: modeMap, maxRounds: this.deps.maxRounds })

    const ac = new AbortController()
    this.aborts.set(sessionId, ac)
    const start = appendEntry(createTranscript(), { author: 'user', text: content, timestamp: this.deps.now() })
    try {
      await orch.run(start, (event) => emit({ type: 'roundtable_event', event, timestamp: this.deps.now() }), ac.signal)
    } finally {
      this.aborts.delete(sessionId)
    }
  }

  stop(sessionId: string): void {
    this.aborts.get(sessionId)?.abort()
  }
}
