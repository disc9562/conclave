import type { CapabilityMode, ParticipantEvent, ParticipantId, SharedTranscript } from './types.js'

export interface Participant {
  readonly id: ParticipantId
  send(transcript: SharedTranscript, mode: CapabilityMode): AsyncIterable<ParticipantEvent>
}
