// src/server/services/roundtable/Moderator.ts
import type { ModeratorDecision, ParticipantId, SharedTranscript } from './types.js'

// The orchestrator only calls decide(); anything with this shape can route.
export interface ModeratorLike {
  decide(transcript: SharedTranscript): Promise<ModeratorDecision>
}

// Deterministic moderator: walks the roster once in order (planner → dev →
// reviewer), then "done". No LLM call and no subprocess — this is what removes
// the per-turn moderator latency. One instance per run, so the index is
// per-roundtable state; it advances every decide() call so a failing
// participant can't trap the loop (the orchestrator just moves to the next id).
export class RotationModerator implements ModeratorLike {
  private i = 0
  constructor(private readonly order: ParticipantId[]) {}
  async decide(): Promise<ModeratorDecision> {
    if (this.i >= this.order.length) return { nextSpeaker: 'done' }
    return { nextSpeaker: this.order[this.i++]! }
  }
}

// Looping moderator: cycles the roster (planner → dev → reviewer → planner → …)
// and only stops once the reviewer's latest turn signals approval. The
// orchestrator's maxRounds is the hard ceiling, so a reviewer that never
// approves can't trap the loop. No LLM call — the stop signal is a token match
// on the reviewer's own output.
export class LoopingModerator implements ModeratorLike {
  private i = 0
  constructor(
    private readonly order: ParticipantId[],
    private readonly reviewer: ParticipantId,
    private readonly isApproved: (reviewerText: string) => boolean,
  ) {}
  async decide(t: SharedTranscript): Promise<ModeratorDecision> {
    const last = t.entries[t.entries.length - 1]
    if (last?.author === this.reviewer && this.isApproved(last.text)) {
      return { nextSpeaker: 'done' }
    }
    return { nextSpeaker: this.order[this.i++ % this.order.length]! }
  }
}

// Reviewer is told to end with `VERDICT: APPROVED` or `VERDICT: REVISE: …`.
export const isApprovedVerdict = (text: string): boolean =>
  /VERDICT:\s*APPROVED/i.test(text)
