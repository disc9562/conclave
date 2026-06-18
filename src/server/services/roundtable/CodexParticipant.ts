// src/server/services/roundtable/CodexParticipant.ts
import type { Participant } from './Participant.js'
import type { CapabilityMode, ParticipantEvent, SharedTranscript } from './types.js'
import { renderTranscriptForPrompt } from './promptRenderer.js'

export type SpawnFn = (argv: string[]) => {
  stdout: ReadableStream<Uint8Array>
  exited: Promise<number>
}

// VERIFY against `codex exec --help` on the target machine; keep verified values here only.
const CODEX_BIN = 'codex'
const CODEX_HEADLESS_SUBCMD = 'exec'
const CODEX_READONLY_FLAG = ['--sandbox', 'read-only']

export class CodexParticipant implements Participant {
  readonly id = 'codex' as const
  constructor(
    private readonly spawn: SpawnFn,
    private readonly binPath: string = CODEX_BIN,
  ) {}

  async *send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent> {
    const prompt = renderTranscriptForPrompt(transcript, this.id)
    const argv = [
      this.binPath,
      CODEX_HEADLESS_SUBCMD,
      ...(mode === 'discuss' ? CODEX_READONLY_FLAG : []),
      prompt,
    ]
    const proc = this.spawn(argv)
    const decoder = new TextDecoder()
    const reader = proc.stdout.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (text) yield { kind: 'text', text }
    }
    await proc.exited
    yield { kind: 'done' }
  }
}
