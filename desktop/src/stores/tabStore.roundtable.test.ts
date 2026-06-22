import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTabStore } from './tabStore'
import { sessionsApi } from '../api/sessions'

describe('tabStore roundtable tab', () => {
  beforeEach(() => {
    useTabStore.setState({ tabs: [], activeTabId: null })
  })

  it('opens a tab with type roundtable', () => {
    useTabStore.getState().openTab('rt-1', 'Roundtable', 'roundtable')
    const tab = useTabStore.getState().tabs.find((t) => t.sessionId === 'rt-1')
    expect(tab?.type).toBe('roundtable')
  })

  it('restores a persisted roundtable tab as roundtable, not session', async () => {
    // bun's injected localStorage lacks setItem under vitest; use a tiny shim.
    const store = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    })
    localStorage.setItem(
      'dreamcoder-open-tabs',
      JSON.stringify({ openTabs: [{ sessionId: 'rt-9', title: 'RT', type: 'roundtable' }], activeTabId: 'rt-9' }),
    )
    vi.spyOn(sessionsApi, 'list').mockResolvedValue({ sessions: [{ id: 'rt-9', title: 'RT' }] } as never)

    await useTabStore.getState().restoreTabs()

    const tab = useTabStore.getState().tabs.find((t) => t.sessionId === 'rt-9')
    expect(tab?.type).toBe('roundtable')
    localStorage.removeItem('dreamcoder-open-tabs')
  })
})
