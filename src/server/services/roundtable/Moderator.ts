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
