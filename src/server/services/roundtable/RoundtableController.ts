import { RoundtableOrchestrator } from './RoundtableOrchestrator.js'
import type { RoundtableEvent } from './RoundtableOrchestrator.js'
import type { Participant } from './Participant.js'
import type { ModeratorLike } from './Moderator.js'
import type { CapabilityMode, ParticipantId, SharedTranscript } from './types.js'
import { createTranscript, appendEntry } from './transcript.js'

// Per-participant capability authorization. Any id omitted defaults to 'discuss'
// at start() time, so callers only send the participants they want to authorize.
type CliModes = Partial<Record<ParticipantId, CapabilityMode>>

export type RoundtableServerEvent = { type: 'roundtable_event'; event: RoundtableEvent; timestamp: number }

export type RoundtableControllerDeps = {
  // sessionId is supplied per-start() from the live WS connection so the
  // Claude participant/moderator turn ports bind to the REAL session that the
  // conversation service knows about (a literal placeholder silently no-ops).
  buildParticipants: (sessionId: string, loop: boolean) => Map<ParticipantId, Participant> | Promise<Map<ParticipantId, Participant>>
  buildModerator: (sessionId: string, ids: ParticipantId[], loop: boolean) => ModeratorLike
  now: () => number
  maxRounds: number
}

export class RoundtableController {
  private aborts = new Map<string, AbortController>()
  // Per-session shared transcript so each start() continues the prior rounds
  // instead of starting blank — codex/grok are stateless subprocesses and only
  // see what's in this transcript. ponytail: grows per sessionId for the
  // server's lifetime; add eviction if a single process accumulates many.
  private transcripts = new Map<string, SharedTranscript>()
  constructor(private readonly deps: RoundtableControllerDeps) {}

  async start(
    sessionId: string,
    content: string,
    modes: CliModes,
    loop: boolean,
    emit: (msg: RoundtableServerEvent) => void,
  ): Promise<void> {
    const participants = await this.deps.buildParticipants(sessionId, loop)
    const ids = [...participants.keys()]
    const moderator = this.deps.buildModerator(sessionId, ids, loop)
    // Authorize each live participant from `modes`; unlisted ids stay discuss-only.
    const modeMap = new Map<ParticipantId, CapabilityMode>(
      ids.map((id) => [id, modes[id] ?? 'discuss']),
    )
    const orch = new RoundtableOrchestrator({ participants, moderator, modes: modeMap, maxRounds: this.deps.maxRounds })

    const ac = new AbortController()
    this.aborts.set(sessionId, ac)
    const prior = this.transcripts.get(sessionId) ?? createTranscript()
    const start = appendEntry(prior, { author: 'user', text: content, timestamp: this.deps.now() })
    try {
      const final = await orch.run(start, (event) => emit({ type: 'roundtable_event', event, timestamp: this.deps.now() }), ac.signal)
      // Persist (including the partial transcript on abort, which run returns)
      // so the next start() carries this round's context forward.
      this.transcripts.set(sessionId, final)
    } finally {
      this.aborts.delete(sessionId)
    }
  }

  stop(sessionId: string): void {
    this.aborts.get(sessionId)?.abort()
  }
}
