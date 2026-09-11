import { useCallback, useSyncExternalStore } from 'react'
import { OFFER_HINTS_KEY, readPref, subscribePrefs, writePref } from './prefs'

export function useOfferHints() {
  const shown = useSyncExternalStore(
    subscribePrefs,
    () => readPref(OFFER_HINTS_KEY, false),
    () => false,
  )
  const toggle = useCallback(() => writePref(OFFER_HINTS_KEY, !readPref(OFFER_HINTS_KEY, false)), [])
  return { shown, toggle }
}
