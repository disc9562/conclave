import type { Participant } from './Participant.js'
import type { Moderator } from './Moderator.js'
import type {
  CapabilityMode,
  ParticipantId,
  SharedTranscript,
  ToolAction,
  TranscriptEntry,
} from './types.js'
import { appendEntry } from './transcript.js'

export type RoundtableEvent =
  | { kind: 'speaker-start'; author: ParticipantId; reason?: string }
  | { kind: 'text'; author: ParticipantId; text: string }
  | { kind: 'proposal'; author: ParticipantId; action: ToolAction }
  | { kind: 'action-request'; author: ParticipantId; action: ToolAction }
  | { kind: 'speaker-end'; author: ParticipantId }
  | { kind: 'participant-error'; author: ParticipantId; error: string }
  | { kind: 'round-limit'; rounds: number }
  | { kind: 'complete' }

export type RoundtableConfig = {
  participants: Map<ParticipantId, Participant>
  moderator: Moderator
  modes: Map<ParticipantId, CapabilityMode>
  maxRounds: number
}

export type RoundtableEmit = (event: RoundtableEvent) => void

export class RoundtableOrchestrator {
  constructor(private readonly config: RoundtableConfig) {}

  async run(
    initial: SharedTranscript,
    emit: RoundtableEmit,
    signal?: AbortSignal,
  ): Promise<SharedTranscript> {
    let transcript = initial
    let rounds = 0

    while (rounds < this.config.maxRounds) {
      if (signal?.aborted) return transcript

      const decision = await this.config.moderator.decide(transcript)
      if (decision.nextSpeaker === 'done') {
        emit({ kind: 'complete' })
        return transcript
      }

      const author = decision.nextSpeaker
      const participant = this.config.participants.get(author)
      if (!participant) {
        emit({ kind: 'participant-error', author, error: 'no such participant' })
        rounds += 1
        continue
      }

      const mode = this.config.modes.get(author) ?? 'discuss'
      emit({ kind: 'speaker-start', author, reason: decision.reason })

      let text = ''
      const actions: ToolAction[] = []
      try {
        for await (const ev of participant.send(transcript, mode)) {
          if (signal?.aborted) break
          if (ev.kind === 'text') {
            text += ev.text
            emit({ kind: 'text', author, text: ev.text })
          } else if (ev.kind === 'proposal') {
            actions.push(ev.action)
            emit({ kind: 'proposal', author, action: ev.action })
          } else if (ev.kind === 'action-request') {
            actions.push(ev.action)
            emit({ kind: 'action-request', author, action: ev.action })
          } else if (ev.kind === 'done') {
            break
          }
        }
      } catch (err) {
        emit({ kind: 'participant-error', author, error: err instanceof Error ? err.message : String(err) })
        rounds += 1
        continue
      }

      const entry: TranscriptEntry = {
        author,
        text,
        actions: actions.length ? actions : undefined,
        timestamp: rounds,
      }
      transcript = appendEntry(transcript, entry)
      emit({ kind: 'speaker-end', author })
      rounds += 1
    }

    emit({ kind: 'round-limit', rounds })
    return transcript
  }
}
