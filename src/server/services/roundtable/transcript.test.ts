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
