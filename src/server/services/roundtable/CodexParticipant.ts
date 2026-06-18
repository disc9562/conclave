// src/server/services/roundtable/CodexParticipant.ts
import type { Participant } from './Participant.js'
import type { CapabilityMode, ParticipantEvent, SharedTranscript } from './types.js'
import { renderTranscriptForPrompt } from './promptRenderer.js'

export type SpawnFn = (argv: string[]) => {
  stdout: ReadableStream<Uint8Array>
  exited: Promise<number>
}

// Verified against `codex exec --help` on codex-cli 0.140.0.
// --json makes exec emit JSONL events on stdout; we keep only the agent_message
// so the banner ("OpenAI Codex v…", workdir/model) and the usage footer never
// leak into a participant's turn.
const CODEX_BIN = 'codex'
const CODEX_HEADLESS_SUBCMD = 'exec'
const CODEX_JSON_FLAG = ['--json']
const CODEX_READONLY_FLAG = ['--sandbox', 'read-only']
// act → workspace-write: codex may create/edit files, but ONLY within the
// pinned cwd (the folder the user picked). `codex exec` defaults to read-only
// when no --sandbox is given, so without this an authorized codex still can't
// write. discuss stays read-only (propose, don't apply).
const CODEX_WRITE_FLAG = ['--sandbox', 'workspace-write']
// The roundtable folder picker lets the user pin ANY directory as the cwd. Codex
// exec otherwise refuses to run outside a git repo ("Not inside a trusted
// directory and --skip-git-repo-check was not specified") and blocks the turn.
const CODEX_SKIP_GIT_CHECK = ['--skip-git-repo-check']

// Pull the assistant text out of one JSONL line; null for every other event
// type (thread.started, turn.*, usage) and for non-JSON banner lines.
function extractAgentText(line: string): string | null {
  const trimmed = line.trim()
  if (!trimmed) return null
  try {
    const evt = JSON.parse(trimmed)
    if (evt?.type === 'item.completed' && evt.item?.type === 'agent_message' && typeof evt.item.text === 'string') {
      return evt.item.text
    }
  } catch {
    // ponytail: non-JSON line (banner / stray output) — skip it
  }
  return null
}

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
      ...CODEX_JSON_FLAG,
      ...CODEX_SKIP_GIT_CHECK,
      ...(mode === 'discuss' ? CODEX_READONLY_FLAG : CODEX_WRITE_FLAG),
      prompt,
    ]
    const proc = this.spawn(argv)
    const decoder = new TextDecoder()
    const reader = proc.stdout.getReader()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf('\n')) !== -1) {
        const text = extractAgentText(buf.slice(0, nl))
        buf = buf.slice(nl + 1)
        if (text !== null) yield { kind: 'text', text }
      }
    }
    const tail = extractAgentText(buf) // flush a final line with no trailing newline
    if (tail !== null) yield { kind: 'text', text: tail }
    await proc.exited
    yield { kind: 'done' }
  }
}
