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
      `As the moderator, decide who should speak next among [${roster}]. ` +
      `Every listed participant must contribute at least once before you may answer "done"; ` +
      `only answer "done" when the discussion has genuinely converged AND each of [${roster}] has already spoken. ` +
      `Reply with ONLY JSON, no prose and no markdown fences: ` +
      `{"nextSpeaker": "<id|done>", "promptForSpeaker"?: "<focused question>", "reason"?: "<short why>"}.`
    // Render addressed to the first participant purely for context framing; moderator instruction carries the task.
    const prompt = renderTranscriptForPrompt(transcript, this.participantIds[0]!, instruction)

    let raw: string
    try {
      raw = await this.complete(prompt)
    } catch {
      return { nextSpeaker: 'done', reason: 'moderator-completion-error' }
    }

    console.log(`[Moderator] raw: ${raw.slice(0, 240).replace(/\n/g, ' ')}`)
    const decision = this.parse(raw)
    if (!decision) {
      console.log('[Moderator] parse failed -> done')
      return { nextSpeaker: 'done', reason: 'moderator-parse-fallback' }
    }
    console.log(`[Moderator] -> ${decision.nextSpeaker}${decision.reason ? ` (${decision.reason})` : ''}`)
    return decision
  }

  private parse(raw: string): ModeratorDecision | null {
    const obj = extractJsonObject(raw)
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

// The moderator LLM (the Claude CLI) rarely returns bare JSON — it wraps the
// object in ```json fences, surrounds it with prose, or (observed live) repeats
// the same object twice concatenated: {...}{...}. Try a direct parse, then fall
// back to the FIRST balanced {...} object. A greedy /\{[\s\S]*\}/ is wrong here:
// it spans from the first { to the last } across BOTH objects → invalid JSON.
function extractJsonObject(raw: string): unknown {
  const tryParse = (s: string): unknown => {
    try {
      return JSON.parse(s)
    } catch {
      return undefined
    }
  }
  const direct = tryParse(raw.trim())
  if (direct !== undefined) return direct
  const first = firstBalancedObject(raw)
  if (first) return tryParse(first)
  return undefined
}

// Return the first brace-balanced {...} substring, tracking string literals so
// braces inside JSON string values aren't counted. Null if none is closed
// (e.g. the text was truncated mid-object).
function firstBalancedObject(raw: string): string | null {
  const start = raw.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inStr = false
  let escaped = false
  for (let i = start; i < raw.length; i++) {
    const ch = raw[i]
    if (inStr) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inStr = false
    } else if (ch === '"') {
      inStr = true
    } else if (ch === '{') {
      depth++
    } else if (ch === '}') {
      depth--
      if (depth === 0) return raw.slice(start, i + 1)
    }
  }
  return null
}
