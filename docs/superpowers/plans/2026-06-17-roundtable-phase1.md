# Roundtable Multi-Agent — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the server-side orchestration core that lets a moderator (Claude) drive a turn-based discussion across heterogeneous "participants", with Claude + Codex wired in and a WebSocket endpoint to demo it.

**Architecture:** A `Participant` interface hides each heterogeneous backend (internal Claude engine, Codex CLI subprocess) behind one async-streaming contract. A `RoundtableOrchestrator` depends only on that interface plus a `Moderator` abstraction — it never names a concrete backend, so adding Grok later (Phase 2) touches zero orchestrator code. All decision/IO ports are injected, so the core logic is unit-tested with fakes; only thin glue over external streaming APIs is left untested.

**Tech Stack:** TypeScript, Bun (`bun:test` server-side, `vitest` desktop), existing `conversationService` singleton, existing WS event unions.

## SOLID alignment (this plan is graded against these)

- **S — Single responsibility:** one file = one job. `promptRenderer` only renders; `Moderator` only decides; `RoundtableOrchestrator` only loops; each `*Participant` only adapts one backend.
- **O — Open/closed:** adding a participant (Grok) means a new `Participant` impl + one Map entry. The orchestrator, moderator, renderer, and types are not edited.
- **L — Liskov:** every `Participant` is substitutable — same `send()` contract, same event kinds; fakes used in tests are drop-in for real ones.
- **I — Interface segregation:** `Participant` exposes only `id` + `send()`. Participants depend on narrow injected ports (`ClaudeTurnPort`, a `spawn` fn), never the whole `conversationService`.
- **D — Dependency inversion:** orchestrator depends on `Participant`/`Moderator` abstractions; concrete backends and the model-completion call are injected at the edge (the WS endpoint), not imported by the core.

## Global Constraints

- TypeScript strict mode; no `any` in new code (the existing `onOutput` callback is typed `(msg: any)` — isolate that behind a port, do not propagate `any`).
- Server-side imports use the `.js` extension in specifiers (e.g. `from './types.js'`) — match existing `src/server/` convention.
- Server tests: `bun:test`, files under `src/server/services/roundtable/*.test.ts`. Run a single file: `bun test <path>`.
- Desktop tests: `vitest`, co-located `*.test.ts(x)`. Run a single file: `cd desktop && bun run vitest run <path>`.
- New code lives under `src/server/services/roundtable/`. Do not edit `conversationService.ts`, `handler.ts` internals beyond the one additive endpoint/wiring in Task 8.
- `maxRounds` default = 12. Default capability mode = `discuss`.
- Commit after every task (the 5-step TDD cycle ends in a commit).

---

### Task 1: Core types + transcript helpers

**Files:**
- Create: `src/server/services/roundtable/types.ts`
- Create: `src/server/services/roundtable/transcript.ts`
- Test: `src/server/services/roundtable/transcript.test.ts`

**Interfaces:**
- Produces: `ParticipantId`, `Author`, `CapabilityMode`, `ToolAction`, `TranscriptEntry`, `SharedTranscript`, `ParticipantEvent`, `ModeratorDecision` (in `types.ts`); `createTranscript()`, `appendEntry(t, entry)` (in `transcript.ts`, immutable — returns a new object).

- [ ] **Step 1: Write `types.ts`** (pure type declarations, no test needed for types alone)

```ts
// src/server/services/roundtable/types.ts
export type ParticipantId = 'claude' | 'codex' | 'grok'
export type Author = ParticipantId | 'user'
export type CapabilityMode = 'discuss' | 'act'

export type ToolAction = {
  toolName: string
  input: unknown
  toolUseId?: string
  description?: string
}

export type TranscriptEntry = {
  author: Author
  text: string
  actions?: ToolAction[]
  timestamp: number
}

export type SharedTranscript = {
  entries: TranscriptEntry[]
}

export type ParticipantEvent =
  | { kind: 'text'; text: string }
  | { kind: 'proposal'; action: ToolAction }
  | { kind: 'action-request'; action: ToolAction }
  | { kind: 'done' }

export type ModeratorDecision = {
  nextSpeaker: ParticipantId | 'done'
  promptForSpeaker?: string
  reason?: string
}
```

- [ ] **Step 2: Write the failing test for transcript helpers**

```ts
// src/server/services/roundtable/transcript.test.ts
import { describe, expect, test } from 'bun:test'
import { createTranscript, appendEntry } from './transcript.js'

describe('transcript', () => {
  test('createTranscript starts empty', () => {
    expect(createTranscript().entries).toEqual([])
  })

  test('appendEntry returns a new transcript and does not mutate the original', () => {
    const t0 = createTranscript()
    const t1 = appendEntry(t0, { author: 'user', text: 'hi', timestamp: 1 })
    expect(t0.entries).toHaveLength(0)
    expect(t1.entries).toHaveLength(1)
    expect(t1.entries[0]).toEqual({ author: 'user', text: 'hi', timestamp: 1 })
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/transcript.test.ts`
Expected: FAIL with "Cannot find module './transcript.js'".

- [ ] **Step 4: Write `transcript.ts`**

```ts
// src/server/services/roundtable/transcript.ts
import type { SharedTranscript, TranscriptEntry } from './types.js'

export function createTranscript(): SharedTranscript {
  return { entries: [] }
}

export function appendEntry(t: SharedTranscript, entry: TranscriptEntry): SharedTranscript {
  return { entries: [...t.entries, entry] }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/transcript.test.ts`
Expected: PASS (3 tests... 2 in this file).

- [ ] **Step 6: Commit**

```bash
git add src/server/services/roundtable/types.ts src/server/services/roundtable/transcript.ts src/server/services/roundtable/transcript.test.ts
git commit -m "feat(roundtable): core types + immutable transcript helpers"
```

---

### Task 2: Prompt renderer

**Files:**
- Create: `src/server/services/roundtable/promptRenderer.ts`
- Test: `src/server/services/roundtable/promptRenderer.test.ts`

**Interfaces:**
- Consumes: `SharedTranscript`, `ParticipantId` (Task 1).
- Produces: `renderTranscriptForPrompt(transcript, speaker, instruction?): string` — turns the shared log into a single prompt string addressed to `speaker`, with each entry labelled by author and an optional final instruction line.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/services/roundtable/promptRenderer.test.ts
import { describe, expect, test } from 'bun:test'
import { renderTranscriptForPrompt } from './promptRenderer.js'
import type { SharedTranscript } from './types.js'

const t: SharedTranscript = {
  entries: [
    { author: 'user', text: 'How should we cache this?', timestamp: 1 },
    { author: 'claude', text: 'Use an LRU.', timestamp: 2 },
  ],
}

describe('renderTranscriptForPrompt', () => {
  test('labels each entry by author and addresses the speaker', () => {
    const out = renderTranscriptForPrompt(t, 'codex')
    expect(out).toContain('User: How should we cache this?')
    expect(out).toContain('Claude: Use an LRU.')
    expect(out).toContain('You are Codex')
  })

  test('appends the instruction when provided', () => {
    const out = renderTranscriptForPrompt(t, 'codex', 'Focus on eviction policy.')
    expect(out.trimEnd().endsWith('Focus on eviction policy.')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/promptRenderer.test.ts`
Expected: FAIL with "Cannot find module './promptRenderer.js'".

- [ ] **Step 3: Write `promptRenderer.ts`**

```ts
// src/server/services/roundtable/promptRenderer.ts
import type { ParticipantId, SharedTranscript } from './types.js'

const LABEL: Record<string, string> = {
  user: 'User',
  claude: 'Claude',
  codex: 'Codex',
  grok: 'Grok',
}

export function renderTranscriptForPrompt(
  transcript: SharedTranscript,
  speaker: ParticipantId,
  instruction?: string,
): string {
  const history = transcript.entries
    .map((e) => `${LABEL[e.author] ?? e.author}: ${e.text}`)
    .join('\n')
  const header = `You are ${LABEL[speaker] ?? speaker}, one of several AI participants in a shared discussion. Read the conversation so far and contribute your perspective.`
  const tail = instruction ? `\n\n${instruction}` : ''
  return `${header}\n\n${history}${tail}`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/promptRenderer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/roundtable/promptRenderer.ts src/server/services/roundtable/promptRenderer.test.ts
git commit -m "feat(roundtable): transcript prompt renderer"
```

---

### Task 3: Moderator (decides next speaker)

**Files:**
- Create: `src/server/services/roundtable/Moderator.ts`
- Test: `src/server/services/roundtable/Moderator.test.ts`

**Interfaces:**
- Consumes: `SharedTranscript`, `ModeratorDecision`, `ParticipantId` (Task 1).
- Produces:
  - `type CompletionPort = (prompt: string) => Promise<string>` — injected model call returning raw text (expected to be JSON). This is the **DIP seam**: the real Claude call is injected at the edge, never imported here.
  - `class Moderator { constructor(complete: CompletionPort, participantIds: ParticipantId[]); decide(transcript): Promise<ModeratorDecision> }`
  - Contract: parses the completion as JSON `{nextSpeaker, promptForSpeaker?, reason?}`. If parsing fails OR `nextSpeaker` is not in `participantIds` and not `'done'`, returns `{ nextSpeaker: 'done', reason: 'moderator-parse-fallback' }`.

- [ ] **Step 1: Write the failing test**

```ts
// src/server/services/roundtable/Moderator.test.ts
import { describe, expect, test } from 'bun:test'
import { Moderator } from './Moderator.js'
import { createTranscript } from './transcript.js'

describe('Moderator', () => {
  test('returns the parsed decision when valid', async () => {
    const complete = async () => JSON.stringify({ nextSpeaker: 'codex', reason: 'codex knows CLIs' })
    const m = new Moderator(complete, ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('codex')
    expect(d.reason).toBe('codex knows CLIs')
  })

  test('falls back to done on invalid JSON', async () => {
    const m = new Moderator(async () => 'not json', ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('done')
  })

  test('falls back to done when speaker is unknown', async () => {
    const m = new Moderator(async () => JSON.stringify({ nextSpeaker: 'grok' }), ['claude', 'codex'])
    const d = await m.decide(createTranscript())
    expect(d.nextSpeaker).toBe('done')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/Moderator.test.ts`
Expected: FAIL with "Cannot find module './Moderator.js'".

- [ ] **Step 3: Write `Moderator.ts`**

```ts
// src/server/services/roundtable/Moderator.ts
import type { ModeratorDecision, ParticipantId, SharedTranscript } from './types.js'
import { renderTranscriptForPrompt } from './promptRenderer.js'

export type CompletionPort = (prompt: string) => Promise<string>

export class Moderator {
  constructor(
    private readonly complete: CompletionPort,
    private readonly participantIds: ParticipantId[],
  ) {}

  async decide(transcript: SharedTranscript): Promise<ModeratorDecision> {
    const roster = this.participantIds.join(', ')
    const instruction =
      `As the moderator, decide who should speak next among [${roster}], or "done" if the discussion has converged. ` +
      `Reply with ONLY JSON: {"nextSpeaker": "<id|done>", "promptForSpeaker"?: "<focused question>", "reason"?: "<short why>"}.`
    // Render addressed to the first participant purely for context framing; moderator instruction carries the task.
    const prompt = renderTranscriptForPrompt(transcript, this.participantIds[0]!, instruction)

    let raw: string
    try {
      raw = await this.complete(prompt)
    } catch {
      return { nextSpeaker: 'done', reason: 'moderator-completion-error' }
    }

    const decision = this.parse(raw)
    if (!decision) return { nextSpeaker: 'done', reason: 'moderator-parse-fallback' }
    return decision
  }

  private parse(raw: string): ModeratorDecision | null {
    let obj: unknown
    try {
      obj = JSON.parse(raw)
    } catch {
      return null
    }
    if (typeof obj !== 'object' || obj === null) return null
    const next = (obj as Record<string, unknown>).nextSpeaker
    const valid = next === 'done' || this.participantIds.includes(next as ParticipantId)
    if (typeof next !== 'string' || !valid) return null
    const promptForSpeaker = (obj as Record<string, unknown>).promptForSpeaker
    const reason = (obj as Record<string, unknown>).reason
    return {
      nextSpeaker: next as ParticipantId | 'done',
      promptForSpeaker: typeof promptForSpeaker === 'string' ? promptForSpeaker : undefined,
      reason: typeof reason === 'string' ? reason : undefined,
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/Moderator.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/services/roundtable/Moderator.ts src/server/services/roundtable/Moderator.test.ts
git commit -m "feat(roundtable): moderator with injected completion port + safe fallback"
```

---

### Task 4: RoundtableOrchestrator (the loop)

**Files:**
- Create: `src/server/services/roundtable/Participant.ts`
- Create: `src/server/services/roundtable/RoundtableOrchestrator.ts`
- Test: `src/server/services/roundtable/RoundtableOrchestrator.test.ts`

**Interfaces:**
- Consumes: `Participant` interface, `Moderator` (Task 3), transcript helpers (Task 1).
- Produces:
  - `interface Participant { readonly id: ParticipantId; send(transcript, mode): AsyncIterable<ParticipantEvent> }`
  - `type RoundtableEvent` (speaker-start | text | proposal | action-request | speaker-end | participant-error | round-limit | complete)
  - `type RoundtableConfig = { participants: Map<ParticipantId, Participant>; moderator: Moderator; modes: Map<ParticipantId, CapabilityMode>; maxRounds: number }`
  - `class RoundtableOrchestrator { constructor(config); run(transcript, emit, signal?): Promise<SharedTranscript> }` — drives rounds, appends each speaker's accumulated entry to the transcript, emits events live, returns the final transcript.

- [ ] **Step 1: Write `Participant.ts`** (interface only)

```ts
// src/server/services/roundtable/Participant.ts
import type { CapabilityMode, ParticipantEvent, ParticipantId, SharedTranscript } from './types.js'

export interface Participant {
  readonly id: ParticipantId
  send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent>
}
```

- [ ] **Step 2: Write the failing test** (fakes prove substitutability + loop behavior)

```ts
// src/server/services/roundtable/RoundtableOrchestrator.test.ts
import { describe, expect, test } from 'bun:test'
import { RoundtableOrchestrator } from './RoundtableOrchestrator.js'
import type { RoundtableEvent } from './RoundtableOrchestrator.js'
import { Moderator } from './Moderator.js'
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
```

- [ ] **Step 3: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/RoundtableOrchestrator.test.ts`
Expected: FAIL with "Cannot find module './RoundtableOrchestrator.js'".

- [ ] **Step 4: Write `RoundtableOrchestrator.ts`**

```ts
// src/server/services/roundtable/RoundtableOrchestrator.ts
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
```

> Note on `timestamp: rounds` — `Date.now()` is intentionally avoided in the loop to keep `run()` deterministic and testable. Wall-clock timestamps, if needed for the UI, are stamped by the WS layer (Task 8) when forwarding events.

- [ ] **Step 5: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/RoundtableOrchestrator.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/server/services/roundtable/Participant.ts src/server/services/roundtable/RoundtableOrchestrator.ts src/server/services/roundtable/RoundtableOrchestrator.test.ts
git commit -m "feat(roundtable): orchestrator loop over Participant abstraction (fakes-tested)"
```

---

### Task 5: ClaudeParticipant (adapter over the internal engine)

**Files:**
- Create: `src/server/services/roundtable/ClaudeParticipant.ts`
- Test: `src/server/services/roundtable/ClaudeParticipant.test.ts`

**Interfaces:**
- Consumes: `Participant` (Task 4), event/types (Task 1), `renderTranscriptForPrompt` (Task 2).
- Produces:
  - `type ClaudeTurnPort = (prompt: string, mode: CapabilityMode, onEvent: (e: ParticipantEvent) => void) => Promise<void>` — the **narrow injected seam** (ISP/DIP). The real port (built in Task 8 from `conversationService.onOutput`/`sendMessage` + the `result` turn boundary, with `permissionMode='plan'` for `discuss` and `'default'` for `act`) is glue and not unit-tested here.
  - `class ClaudeParticipant implements Participant { constructor(port: ClaudeTurnPort); readonly id = 'claude'; send(...) }`

- [ ] **Step 1: Write the failing test** (fake port drives the adapter)

```ts
// src/server/services/roundtable/ClaudeParticipant.test.ts
import { describe, expect, test } from 'bun:test'
import { ClaudeParticipant } from './ClaudeParticipant.js'
import type { ClaudeTurnPort } from './ClaudeParticipant.js'
import { createTranscript, appendEntry } from './transcript.js'
import type { ParticipantEvent } from './types.js'

async function collect(it: AsyncIterable<ParticipantEvent>): Promise<ParticipantEvent[]> {
  const out: ParticipantEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

describe('ClaudeParticipant', () => {
  test('forwards port events and renders the transcript into the prompt', async () => {
    let seenPrompt = ''
    const port: ClaudeTurnPort = async (prompt, _mode, onEvent) => {
      seenPrompt = prompt
      onEvent({ kind: 'text', text: 'hello' })
      onEvent({ kind: 'done' })
    }
    const p = new ClaudeParticipant(port)
    const t = appendEntry(createTranscript(), { author: 'user', text: 'ping', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(seenPrompt).toContain('User: ping')
    expect(events).toContainEqual({ kind: 'text', text: 'hello' })
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('passes the capability mode through to the port', async () => {
    let seenMode = ''
    const port: ClaudeTurnPort = async (_p, mode, onEvent) => { seenMode = mode; onEvent({ kind: 'done' }) }
    await collect(new ClaudeParticipant(port).send(createTranscript(), 'act'))
    expect(seenMode).toBe('act')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/ClaudeParticipant.test.ts`
Expected: FAIL with "Cannot find module './ClaudeParticipant.js'".

- [ ] **Step 3: Write `ClaudeParticipant.ts`** (callback port → async iterable via a queue)

```ts
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
  constructor(private readonly port: ClaudeTurnPort) {}

  async *send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent> {
    const prompt = renderTranscriptForPrompt(transcript, this.id)
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/ClaudeParticipant.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/services/roundtable/ClaudeParticipant.ts src/server/services/roundtable/ClaudeParticipant.test.ts
git commit -m "feat(roundtable): ClaudeParticipant adapter over injected turn port"
```

---

### Task 6: CodexParticipant (Codex CLI subprocess adapter)

**Files:**
- Create: `src/server/services/roundtable/CodexParticipant.ts`
- Test: `src/server/services/roundtable/CodexParticipant.test.ts`

**Interfaces:**
- Consumes: `Participant` (Task 4), types (Task 1), `renderTranscriptForPrompt` (Task 2).
- Produces:
  - `type SpawnFn = (argv: string[]) => { stdout: ReadableStream<Uint8Array>; exited: Promise<number> }` — injected spawn seam (DIP) so tests fake the subprocess; the real one wraps `Bun.spawn(argv, { stdout: 'pipe' })`.
  - `class CodexParticipant implements Participant { constructor(spawn: SpawnFn, binPath?: string); readonly id = 'codex'; send(...) }`
  - Behavior: builds argv for headless Codex — `discuss` mode adds a read-only/plan flag, `act` mode allows applying. Streams stdout text chunks as `{kind:'text'}` events, then `{kind:'done'}`.

> **External-tool note (must verify against the installed binary, not a guess):** run `codex --help` / `codex exec --help` on the target machine and confirm (a) the non-interactive subcommand and (b) the read-only/plan flag. This task uses placeholders `CODEX_HEADLESS_ARGV` and `CODEX_READONLY_FLAG` defined as named constants at the top of the file so the verified values land in exactly one place. Default assumption: `codex exec <prompt>` for headless, `--sandbox read-only` (or `--full-auto` for act). Adjust the two constants once verified.

- [ ] **Step 1: Write the failing test** (fake spawn emits stdout)

```ts
// src/server/services/roundtable/CodexParticipant.test.ts
import { describe, expect, test } from 'bun:test'
import { CodexParticipant } from './CodexParticipant.js'
import type { SpawnFn } from './CodexParticipant.js'
import { createTranscript, appendEntry } from './transcript.js'
import type { ParticipantEvent } from './types.js'

function stubSpawn(output: string, capturedArgv: string[][]): SpawnFn {
  return (argv) => {
    capturedArgv.push(argv)
    const stdout = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(output))
        controller.close()
      },
    })
    return { stdout, exited: Promise.resolve(0) }
  }
}

async function collect(it: AsyncIterable<ParticipantEvent>): Promise<ParticipantEvent[]> {
  const out: ParticipantEvent[] = []
  for await (const e of it) out.push(e)
  return out
}

describe('CodexParticipant', () => {
  test('streams stdout as text then done', async () => {
    const argvs: string[][] = []
    const p = new CodexParticipant(stubSpawn('codex says hi', argvs))
    const t = appendEntry(createTranscript(), { author: 'user', text: 'q', timestamp: 1 })
    const events = await collect(p.send(t, 'discuss'))
    expect(events.filter((e) => e.kind === 'text').map((e) => (e as { text: string }).text).join('')).toBe('codex says hi')
    expect(events.at(-1)).toEqual({ kind: 'done' })
  })

  test('discuss mode passes the read-only flag; act mode does not', async () => {
    const argvs: string[][] = []
    await collect(new CodexParticipant(stubSpawn('x', argvs)).send(createTranscript(), 'discuss'))
    await collect(new CodexParticipant(stubSpawn('x', argvs)).send(createTranscript(), 'act'))
    expect(argvs[0].join(' ')).toContain('read-only')
    expect(argvs[1].join(' ')).not.toContain('read-only')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/CodexParticipant.test.ts`
Expected: FAIL with "Cannot find module './CodexParticipant.js'".

- [ ] **Step 3: Write `CodexParticipant.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/CodexParticipant.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/services/roundtable/CodexParticipant.ts src/server/services/roundtable/CodexParticipant.test.ts
git commit -m "feat(roundtable): CodexParticipant CLI adapter with injected spawn"
```

---

### Task 7: Add `author` to the UI message model

**Files:**
- Modify: `desktop/src/types/chat.ts:227` (the `assistant_text` variant)
- Test: `desktop/src/types/chat.authorField.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `assistant_text` UIMessage variant gains optional `author?: 'claude' | 'codex' | 'grok'`. Phase 3 UI reads it for color/label; absent = legacy single-agent rendering (backward compatible).

- [ ] **Step 1: Write the failing test**

```ts
// desktop/src/types/chat.authorField.test.ts
import { describe, expect, it } from 'vitest'
import type { UIMessage } from './chat'

describe('UIMessage assistant_text author field', () => {
  it('accepts an author on assistant_text', () => {
    const msg: UIMessage = {
      id: '1',
      type: 'assistant_text',
      content: 'hi',
      timestamp: 0,
      author: 'codex',
    }
    expect(msg.type === 'assistant_text' && msg.author).toBe('codex')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd desktop && bun run vitest run src/types/chat.authorField.test.ts`
Expected: FAIL — TypeScript error "'author' does not exist in type ... assistant_text".

- [ ] **Step 3: Edit the `assistant_text` variant**

Change `desktop/src/types/chat.ts:227` from:
```ts
  | { id: string; type: 'assistant_text'; content: string; transcriptMessageId?: string; timestamp: number; model?: string }
```
to:
```ts
  | { id: string; type: 'assistant_text'; content: string; transcriptMessageId?: string; timestamp: number; model?: string; author?: 'claude' | 'codex' | 'grok' }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd desktop && bun run vitest run src/types/chat.authorField.test.ts`
Expected: PASS.

- [ ] **Step 5: Type-check the desktop package**

Run: `cd desktop && bun run lint`
Expected: no new type errors.

- [ ] **Step 6: Commit**

```bash
git add desktop/src/types/chat.ts desktop/src/types/chat.authorField.test.ts
git commit -m "feat(roundtable): add optional author to assistant_text UIMessage"
```

---

### Task 8: Wire the orchestrator to a WebSocket roundtable endpoint

**Files:**
- Modify: `src/server/ws/events.ts` (add client + server message variants)
- Create: `src/server/services/roundtable/createClaudeTurnPort.ts` (the untested glue isolated here)
- Create: `src/server/services/roundtable/RoundtableController.ts` (assembles participants + moderator + orchestrator, maps events → `ServerMessage`)
- Modify: `src/server/ws/handler.ts:169-213` (add `case 'roundtable_start'` / `'roundtable_stop'` to the dispatch switch)
- Test: `src/server/services/roundtable/RoundtableController.test.ts`

**Interfaces:**
- Consumes: `RoundtableOrchestrator`, `Moderator`, `ClaudeParticipant`, `CodexParticipant`, `sendToSession` (`handler.ts:2019`), `conversationService` singleton.
- Produces:
  - `events.ts`: ClientMessage gains `| { type: 'roundtable_start'; content: string; modes: Record<'claude'|'codex', 'discuss'|'act'> }` and `| { type: 'roundtable_stop' }`. ServerMessage gains `| { type: 'roundtable_event'; event: RoundtableEvent; timestamp: number }`.
  - `RoundtableController.start(sessionId, content, modes, emit): Promise<void>` and `.stop(sessionId): void` — `emit` defaults to a closure over `sendToSession`.

- [ ] **Step 1: Write the failing test** (controller maps orchestrator events to emitted ServerMessages with a stamped timestamp, using injected fakes)

```ts
// src/server/services/roundtable/RoundtableController.test.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test src/server/services/roundtable/RoundtableController.test.ts`
Expected: FAIL with "Cannot find module './RoundtableController.js'".

- [ ] **Step 3: Write `RoundtableController.ts`** (DI-friendly; real wiring injected by callers)

```ts
// src/server/services/roundtable/RoundtableController.ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test src/server/services/roundtable/RoundtableController.test.ts`
Expected: PASS.

- [ ] **Step 5: Add the WS message variants**

In `src/server/ws/events.ts`, add to `ClientMessage` (after `set_runtime_config`):
```ts
  | { type: 'roundtable_start'; content: string; modes: { claude: 'discuss' | 'act'; codex: 'discuss' | 'act' } }
  | { type: 'roundtable_stop' }
```
Add to `ServerMessage` (import the event type at top: `import type { RoundtableServerEvent } from '../services/roundtable/RoundtableController.js'`), then add:
```ts
  | RoundtableServerEvent
```

- [ ] **Step 6: Write `createClaudeTurnPort.ts`** (isolated glue — no unit test; covered by manual demo in Step 8)

```ts
// src/server/services/roundtable/createClaudeTurnPort.ts
import type { ClaudeTurnPort } from './ClaudeParticipant.js'
import { conversationService } from '../conversationService.js'

// Drives ONE Claude turn over the existing callback-streaming API.
// discuss -> permissionMode 'plan' (engine proposes, does not apply).
// act     -> permissionMode 'default' (permission_request surfaces to the user).
export function createClaudeTurnPort(sessionId: string): ClaudeTurnPort {
  return (prompt, mode, onEvent) =>
    new Promise<void>((resolve) => {
      conversationService.setPermissionMode(sessionId, mode === 'act' ? 'default' : 'plan')
      const cb = (cliMsg: { type?: string; delta?: { text?: string }; text?: string }) => {
        if (cliMsg?.delta?.text) onEvent({ kind: 'text', text: cliMsg.delta.text })
        else if (typeof cliMsg?.text === 'string') onEvent({ kind: 'text', text: cliMsg.text })
        if (cliMsg?.type === 'result') {
          conversationService.removeOutputCallback(sessionId, cb)
          onEvent({ kind: 'done' })
          resolve()
        }
      }
      conversationService.onOutput(sessionId, cb)
      conversationService.sendMessage(sessionId, prompt)
    })
}
```
> The exact `cliMsg` text-delta shape must be confirmed against `translateCliMessage` (`handler.ts:962`) during the demo step; the two `if` branches above cover the common delta + plain-text shapes. This file is the single place that touches the `any`-typed stream.

- [ ] **Step 7: Wire the dispatch switch in `handler.ts`**

In the `message(ws, rawMessage)` switch at `src/server/ws/handler.ts:169-213`, add (using a module-level singleton controller built with the real ports):
```ts
      case 'roundtable_start': {
        const { sessionId } = ws.data
        await roundtableController.start(sessionId, message.content, message.modes, (m) => sendToSession(sessionId, m))
        break
      }
      case 'roundtable_stop': {
        roundtableController.stop(ws.data.sessionId)
        break
      }
```
And near the top of `handler.ts`, construct the singleton (Codex's real spawn wraps `Bun.spawn`, Claude's port via `createClaudeTurnPort`, moderator's completion port via a single non-streaming Claude call — reuse the same `createClaudeTurnPort` accumulating to a string):
```ts
import { RoundtableController } from '../services/roundtable/RoundtableController.js'
import { ClaudeParticipant } from '../services/roundtable/ClaudeParticipant.js'
import { CodexParticipant } from '../services/roundtable/CodexParticipant.js'
import { Moderator } from '../services/roundtable/Moderator.js'
import { createClaudeTurnPort } from '../services/roundtable/createClaudeTurnPort.js'

const roundtableController = new RoundtableController({
  buildParticipants: () => new Map([
    ['claude', new ClaudeParticipant(createClaudeTurnPort(/* moderator/session id */ 'roundtable'))],
    ['codex', new CodexParticipant((argv) => Bun.spawn(argv, { stdout: 'pipe' }))],
  ]),
  buildModerator: (ids) => new Moderator(async (prompt) => {
    let acc = ''
    await createClaudeTurnPort('roundtable')(prompt, 'discuss', (e) => { if (e.kind === 'text') acc += e.text })
    return acc
  }, ids),
  now: () => Date.now(),
  maxRounds: 12,
})
```
> The `'roundtable'` session id is a placeholder for the dedicated moderator/Claude session; the demo step confirms the correct session wiring. Keep this construction in one block so Phase 2 only adds a `['grok', new GrokParticipant(...)]` entry.

- [ ] **Step 8: Verify the full server build + manual demo**

Run: `bun test src/server/services/roundtable/` (all roundtable unit tests pass).
Then manual: start `bun run dev:server`, connect a WS client to a session, send `{"type":"roundtable_start","content":"Compare two cache strategies","modes":{"claude":"discuss","codex":"discuss"}}`, and confirm `roundtable_event` messages stream with alternating `author` values and a final `complete`. Confirm `roundtable_stop` aborts mid-run.

- [ ] **Step 9: Commit**

```bash
git add src/server/ws/events.ts src/server/ws/handler.ts src/server/services/roundtable/RoundtableController.ts src/server/services/roundtable/RoundtableController.test.ts src/server/services/roundtable/createClaudeTurnPort.ts
git commit -m "feat(roundtable): WS roundtable_start/stop endpoint wiring Claude+Codex"
```

---

## Out of scope (own plans)

- **Phase 2 — GrokParticipant:** new `GrokParticipant implements Participant` driving Grok Build CLI via the same injected `SpawnFn` pattern as Task 6; one new Map entry in the Task 8 construction. Zero orchestrator/moderator/renderer changes (OCP payoff).
- **Phase 3 — Real UI:** replace the `AgentTeams.tsx` mock; consume `roundtable_event` in a store; render `author`-tagged bubbles colored via `AGENT_COLORS` (`desktop/src/types/team.ts:27`); per-participant 🔒/🔓 mode toggles; interrupt button → `roundtable_stop`.

## Self-review notes

- **Spec coverage:** Participant abstraction (T1,4), moderator-orchestrated loop + maxRounds + abort (T3,4,8), discuss/act with discuss=non-applying (T5 permissionMode plan, T6 read-only flag), author field (T7), Claude+Codex participants (T5,6), WS surface (T8). Grok + UI explicitly deferred.
- **Placeholder honesty:** the only deferred-to-runtime unknowns are external-binary specifics (Codex argv in T6, `cliMsg` delta shape in T8 glue) — both isolated to single named constants/files and flagged for verification, not scattered TODOs.
- **Type consistency:** `Participant.send(transcript, mode)` signature identical across T4 interface, T5, T6; `ParticipantEvent` kinds identical across producers and the orchestrator consumer; `RoundtableEvent` produced in T4 consumed in T8.
