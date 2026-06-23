// src/server/services/roundtable/GrokParticipant.ts
import type { Participant } from './Participant.js'
import type { CapabilityMode, ParticipantEvent, SharedTranscript } from './types.js'
import { renderTranscriptForPrompt } from './promptRenderer.js'
import type { SpawnFn } from './CodexParticipant.js'

// Verified against `grok --help`. `-p/--single` is single-turn: prints the
// response to stdout and exits. Default --output-format is plain, so stdout IS
// the agent's prose — there's no JSON event envelope to strip (unlike codex).
//   discuss → --permission-mode plan             (proposal-only, applies no edits)
//   act     → --permission-mode bypassPermissions (auto-approves every tool, headless)
// NOTE: --always-approve only appends a self-verification loop to the prompt; it
// is NOT permission auth, so the discuss/act split rides entirely on --permission-mode.
const GROK_BIN = 'grok'
const GROK_DISCUSS_MODE = ['--permission-mode', 'plan']
const GROK_ACT_MODE = ['--permission-mode', 'bypassPermissions']

export class GrokParticipant implements Participant {
  readonly id = 'grok' as const
  constructor(
    private readonly spawn: SpawnFn,
    private readonly binPath: string = GROK_BIN,
    private readonly instruction?: string,
  ) {}

  async *send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent> {
    const prompt = renderTranscriptForPrompt(transcript, this.id, this.instruction)
    const argv = [
      this.binPath,
      '-p', prompt,
      ...(mode === 'act' ? GROK_ACT_MODE : GROK_DISCUSS_MODE),
    ]
    const proc = this.spawn(argv)
    const decoder = new TextDecoder()
    const reader = proc.stdout.getReader()
    // plain output has no line protocol, so stream decoded chunks straight through;
    // the store concatenates consecutive text events for one turn.
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const text = decoder.decode(value, { stream: true })
      if (text) yield { kind: 'text', text }
    }
    const tail = decoder.decode()
    if (tail) yield { kind: 'text', text: tail }
    await proc.exited
    yield { kind: 'done' }
  }
}
