import type { RoundtableParticipantId } from '../types/chat'
import type { AgentColor } from '../types/team'

/** Roundtable participants map to existing AGENT_COLORS color names. */
const PARTICIPANT_COLOR: Record<RoundtableParticipantId, AgentColor> = {
  claude: 'purple',
  codex: 'green',
  grok: 'blue',
}

export function participantColorName(author: RoundtableParticipantId): AgentColor {
  return PARTICIPANT_COLOR[author]
}

/**
 * AgentColor → hex, matching the convention already used for agent dots
 * (see components/settings/AgentsSettings.tsx). Reused here so roundtable
 * bubbles/pills tint consistently with the rest of the app.
 */
const AGENT_COLOR_HEX: Record<AgentColor, string> = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
}

/** Hex color used to tint a participant's bubble/pill border + accent. */
export function participantColorHex(author: RoundtableParticipantId): string {
  return AGENT_COLOR_HEX[participantColorName(author)]
}
