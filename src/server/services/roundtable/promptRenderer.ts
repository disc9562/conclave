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
