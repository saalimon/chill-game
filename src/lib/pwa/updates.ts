/**
 * Keeping an installed app up to date.
 *
 * The service worker serves the app from cache first, which is what makes it
 * work on a plane and also what makes a stale copy so sticky: an installed PWA
 * left open can keep running an old build indefinitely. This watches for a new
 * one, and offers a way out when something has gone wrong with the cache.
 */
type Listener = (ready: boolean) => void

/** How often to ask the browser whether a new worker has been published. */
const CHECK_INTERVAL_MS = 60 * 60 * 1000

const listeners = new Set<Listener>()
let registration: ServiceWorkerRegistration | null = null
let ready = false

const container = (): ServiceWorkerContainer | undefined =>
  typeof navigator === 'undefined' ? undefined : navigator.serviceWorker

function setReady(value: boolean): void {
  if (ready === value) return
  ready = value
  for (const listener of listeners) listener(ready)
}

export const isUpdateReady = (): boolean => ready

export function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Register the worker and start watching for new ones.
 *
 * Returns a function that stops watching.
 */
export async function start(intervalMs = CHECK_INTERVAL_MS): Promise<() => void> {
  const sw = container()
  if (!sw) return () => {}

  // Whether this page is already being served by a worker. A brand new install
  // takes control for the first time, which is not an update and should not
  // provoke a reload on someone's first visit.
  const wasControlled = Boolean(sw.controller)

  try {
    registration = await sw.register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
  } catch {
    // Blocked, unsupported, or served over plain http. The app still works.
    return () => {}
  }

  // A worker that finished installing while the page was closed.
  if (registration.waiting) setReady(true)

  registration.addEventListener('updatefound', () => {
    const installing = registration?.installing
    if (!installing) return
    installing.addEventListener('statechange', () => {
      if (installing.state === 'installed' && wasControlled) setReady(true)
    })
  })

  // The build sets `skipWaiting`, so a new worker usually takes over on its own
  // rather than queueing — at which point the page is being served by the new
  // worker but is still running the old scripts it loaded with.
  const onControllerChange = () => {
    if (wasControlled) setReady(true)
  }
  sw.addEventListener('controllerchange', onControllerChange)

  const onVisible = () => {
    if (document.visibilityState === 'visible') void checkNow()
  }
  document.addEventListener('visibilitychange', onVisible)

  const timer = setInterval(() => void checkNow(), intervalMs)

  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', onVisible)
    sw.removeEventListener?.('controllerchange', onControllerChange)
  }
}

/** Ask the browser to look for a new worker now. */
export async function checkNow(): Promise<void> {
  try {
    await registration?.update()
  } catch {
    // Offline, most likely. Nothing to do.
  }
}

/** Take the new version: the page reloads onto the freshly cached build. */
export function applyUpdate(): void {
  location.reload()
}

/**
 * The escape hatch.
 *
 * Throws away every cache and unregisters the worker before reloading, which
 * recovers a copy stuck on an old build — including one whose worker is scoped
 * to a path the app no longer lives at.
 */
export async function forceRefresh(): Promise<void> {
  try {
    const sw = container()
    if (sw) {
      const all = await sw.getRegistrations()
      await Promise.all(all.map((r) => r.unregister()))
    }
  } catch {
    // Fall through: reloading is still worth doing.
  }

  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    // Same.
  }

  location.reload()
}
