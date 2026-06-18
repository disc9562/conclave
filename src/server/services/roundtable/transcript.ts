import type { SharedTranscript, TranscriptEntry } from './types.js'

export function createTranscript(): SharedTranscript {
  return { entries: [] }
}

export function appendEntry(t: SharedTranscript, entry: TranscriptEntry): SharedTranscript {
  return { entries: [...t.entries, entry] }
}
