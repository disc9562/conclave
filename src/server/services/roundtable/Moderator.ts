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

// Plan-review loop moderator: the reviewer vets the PLAN before the implementer
// touches anything, and again after implementation — the llm-council idea of
// "independent review before acting". Pipeline by verdict:
//   plan → review-plan → (REVISE: re-plan / APPROVED: implement)
//        → review-result → (REVISE: re-plan / APPROVED: done)
// The reviewer keeps one role; it judges whatever is latest in the transcript.
// An APPROVED is "ship it" only once an implementation exists after the latest
// plan — otherwise it just unlocks the implementer. maxRounds remains the hard
// ceiling so a never-approving reviewer can't trap the loop. No LLM call.
export class PlanReviewModerator implements ModeratorLike {
  constructor(
    private readonly planner: ParticipantId,
    private readonly implementer: ParticipantId,
    private readonly reviewer: ParticipantId,
    private readonly isApproved: (reviewerText: string) => boolean,
  ) {}
  async decide(t: SharedTranscript): Promise<ModeratorDecision> {
    const e = t.entries
    const last = e[e.length - 1]
    if (!last || last.author === 'user') return { nextSpeaker: this.planner }
    if (last.author === this.planner) {
      return { nextSpeaker: this.reviewer, reason: 'review the plan before implementing' }
    }
    if (last.author === this.implementer) return { nextSpeaker: this.reviewer }
    if (last.author === this.reviewer) {
      if (!this.isApproved(last.text)) return { nextSpeaker: this.planner }
      // Approved: a plan-only approval unlocks the implementer; an approval that
      // comes after implementation (since the latest plan) ends the loop.
      const lastPlan = e.map((x) => x.author).lastIndexOf(this.planner)
      const implemented = e.slice(lastPlan + 1).some((x) => x.author === this.implementer)
      return implemented ? { nextSpeaker: 'done' } : { nextSpeaker: this.implementer }
    }
    return { nextSpeaker: 'done' }
  }
}

// Reviewer is told to end with `VERDICT: APPROVED` or `VERDICT: REVISE: …`.
export const isApprovedVerdict = (text: string): boolean =>
  /VERDICT:\s*APPROVED/i.test(text)
