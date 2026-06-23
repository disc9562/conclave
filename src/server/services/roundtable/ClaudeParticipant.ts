// src/server/services/roundtable/ClaudeParticipant.ts
import type { Participant } from './Participant.js'
import type { CapabilityMode, ParticipantEvent, SharedTranscript } from './types.js'
import { renderTranscriptForPrompt } from './promptRenderer.js'

export type ClaudeTurnPort = (
  prompt: string,
  mode: CapabilityMode,
  onEvent: (e: ParticipantEvent) => void,
) => Promise<void>

export class ClaudeParticipant implements Participant {
  readonly id = 'claude' as const
  constructor(private readonly port: ClaudeTurnPort, private readonly instruction?: string) {}

  async *send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent> {
    const prompt = renderTranscriptForPrompt(transcript, this.id, this.instruction)
    const queue: ParticipantEvent[] = []
    let notify: (() => void) | null = null
    let finished = false

    const push = (e: ParticipantEvent) => {
      queue.push(e)
      notify?.()
    }

    const runner = this.port(prompt, mode, push).then(
      () => { finished = true; notify?.() },
      (err) => { finished = true; notify?.(); throw err },
    )

    while (true) {
      if (queue.length > 0) {
        const e = queue.shift()!
        yield e
        if (e.kind === 'done') break
        continue
      }
      if (finished) break
      await new Promise<void>((resolve) => { notify = resolve })
      notify = null
    }
    await runner // surface port errors to the orchestrator
  }
}
