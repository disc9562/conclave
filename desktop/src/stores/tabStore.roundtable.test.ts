import { beforeEach, describe, expect, it } from 'vitest'
import { useTabStore } from './tabStore'

describe('tabStore roundtable tab', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: null })
  })

  it('opens a tab with type roundtable', () => {
    useTabStore.getState().openTab('rt-1', 'Roundtable', 'roundtable')
    const tab = useTabStore.getState().tabs.find((t) => t.sessionId === 'rt-1')
    expect(tab?.type).toBe('roundtable')
  })
})
