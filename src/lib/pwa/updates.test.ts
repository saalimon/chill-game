import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as UpdatesModule from './updates'

let updates: typeof UpdatesModule
let reload: ReturnType<typeof vi.fn>

/** A stand-in for the browser's service worker registration. */
function makeRegistration() {
  const listeners = new Map<string, ((e?: unknown) => void)[]>()
  return {
    waiting: null as unknown,
    installing: null as unknown,
    updates: 0,
    unregistered: false,
    update: vi.fn(function (this: { updates: number }) {
      this.updates++
      return Promise.resolve()
    }),
    unregister: vi.fn(function (this: { unregistered: boolean }) {
      this.unregistered = true
      return Promise.resolve(true)
    }),
    addEventListener(type: string, fn: (e?: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    },
    fire(type: string) {
      for (const fn of listeners.get(type) ?? []) fn()
    },
  }
}

function installFakeServiceWorker({ controlled }: { controlled: boolean }) {
  const registration = makeRegistration()
  const listeners = new Map<string, ((e?: unknown) => void)[]>()
  const container = {
    controller: controlled ? {} : null,
    register: vi.fn(() => Promise.resolve(registration)),
    getRegistrations: vi.fn(() => Promise.resolve([registration])),
    addEventListener(type: string, fn: (e?: unknown) => void) {
      listeners.set(type, [...(listeners.get(type) ?? []), fn])
    },
    fire(type: string) {
      for (const fn of listeners.get(type) ?? []) fn()
    },
  }
  vi.stubGlobal('navigator', { ...navigator, serviceWorker: container })
  return { container, registration }
}

beforeEach(async () => {
  reload = vi.fn()
  vi.stubGlobal('location', { ...window.location, reload, href: 'https://example.test/chill-game/' })
  vi.stubGlobal('caches', {
    keys: vi.fn(() => Promise.resolve(['workbox-a', 'workbox-b'])),
    delete: vi.fn(() => Promise.resolve(true)),
  })
  vi.resetModules()
  updates = await import('./updates')
})

afterEach(() => vi.unstubAllGlobals())

describe('without service worker support', () => {
  it('starts, checks and applies without throwing', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    vi.resetModules()
    updates = await import('./updates')

    const stop = await updates.start()
    await expect(updates.checkNow()).resolves.toBeUndefined()
    expect(updates.isUpdateReady()).toBe(false)
    expect(() => stop()).not.toThrow()
  })

  it('still force-refreshes, since that is the escape hatch', async () => {
    vi.stubGlobal('navigator', { ...navigator, serviceWorker: undefined })
    vi.resetModules()
    updates = await import('./updates')

    await updates.forceRefresh()
    expect(reload).toHaveBeenCalled()
  })
})

describe('spotting an update', () => {
  it('reports nothing to update on a quiet registration', async () => {
    installFakeServiceWorker({ controlled: true })
    await updates.start()
    expect(updates.isUpdateReady()).toBe(false)
  })

  it('reports one when a worker is already waiting', async () => {
    const { registration } = installFakeServiceWorker({ controlled: true })
    registration.waiting = {}
    await updates.start()
    expect(updates.isUpdateReady()).toBe(true)
  })

  it('reports one when a new worker takes control', async () => {
    const { container } = installFakeServiceWorker({ controlled: true })
    await updates.start()
    container.fire('controllerchange')
    expect(updates.isUpdateReady()).toBe(true)
  })

  it('stays quiet on a first install, which is not an update', async () => {
    // No controller yet: this is the very first service worker, and reloading
    // for it would be a pointless flash on someone's first visit.
    const { container } = installFakeServiceWorker({ controlled: false })
    await updates.start()
    container.fire('controllerchange')
    expect(updates.isUpdateReady()).toBe(false)
  })

  it('tells subscribers, and stops once they unsubscribe', async () => {
    const { container } = installFakeServiceWorker({ controlled: true })
    const seen: boolean[] = []
    const off = updates.subscribe((ready) => seen.push(ready))
    await updates.start()

    container.fire('controllerchange')
    expect(seen).toContain(true)

    off()
    const before = seen.length
    container.fire('controllerchange')
    expect(seen).toHaveLength(before)
  })
})

describe('checking on a schedule', () => {
  it('asks the browser to look for a new worker', async () => {
    const { registration } = installFakeServiceWorker({ controlled: true })
    await updates.start()
    await updates.checkNow()
    expect(registration.updates).toBeGreaterThan(0)
  })

  it('looks again when the app comes back to the foreground', async () => {
    const { registration } = installFakeServiceWorker({ controlled: true })
    await updates.start()
    const before = registration.updates

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(registration.updates).toBeGreaterThan(before)
  })

  it('stops looking once it is told to stop', async () => {
    const { registration } = installFakeServiceWorker({ controlled: true })
    const stop = await updates.start()
    stop()
    const before = registration.updates

    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible')
    document.dispatchEvent(new Event('visibilitychange'))
    await Promise.resolve()

    expect(registration.updates).toBe(before)
  })
})

describe('applying', () => {
  it('reloads the page', () => {
    updates.applyUpdate()
    expect(reload).toHaveBeenCalled()
  })
})

describe('force refresh', () => {
  it('throws away every cache, unregisters the worker and reloads', async () => {
    const { registration } = installFakeServiceWorker({ controlled: true })
    await updates.start()

    await updates.forceRefresh()

    expect(registration.unregistered).toBe(true)
    expect(caches.delete).toHaveBeenCalledWith('workbox-a')
    expect(caches.delete).toHaveBeenCalledWith('workbox-b')
    expect(reload).toHaveBeenCalled()
  })

  it('still reloads when clearing caches fails', async () => {
    installFakeServiceWorker({ controlled: true })
    vi.stubGlobal('caches', { keys: () => Promise.reject(new Error('denied')) })
    await updates.start()

    await updates.forceRefresh()
    expect(reload).toHaveBeenCalled()
  })
})
