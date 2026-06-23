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
  reason?: string
}
