// Adds a synthetic default export so leva@0.10.x (which does
// `import create from 'zustand'`) works with zustand@5.
//
// Problem: zustand@5's plain `create` returns a hook where the equalityFn second
// argument is silently dropped — it uses useSyncExternalStore which only uses Object.is.
// leva's useValuesForPath calls `store.useStore(selector, shallow)` with an inline
// selector that always returns a new object. Without the equalityFn, Object.is always
// fails → useSyncExternalStore detects "tearing" on every check → infinite re-renders
// → "Maximum update depth exceeded" when multiple useControls panels are mounted.
//
// Fix: pass api.getState (not an inline selector) as the useSyncExternalStore snapshot.
// api.getState returns the SAME reference between store.set() calls (zustand guarantees
// this), so Object.is passes and useSyncExternalStore only re-renders on real store
// changes. The selector + equalityFn memoization is then done outside useSyncExternalStore
// by conditionally updating a ref — no CJS deps, no unstable getSnapshot function.

import React from 'react'
import { createStore } from '../../node_modules/zustand/esm/vanilla.mjs'

const identity = (x) => x

function useStoreWithEqualityFn(api, selector = identity, equalityFn) {
  // api.getState returns the same reference between store.set() calls, so
  // useSyncExternalStore's Object.is check is stable — re-renders only on real updates.
  const state = React.useSyncExternalStore(
    api.subscribe,
    api.getState,
    api.getInitialState,
  )

  // Apply selector and memoize: if equalityFn says equal, keep the previous reference
  // so callers (like leva's useValuesForPath with `shallow`) don't get spurious updates.
  const sliceRef = React.useRef()
  const next = selector(state)
  if (sliceRef.current === undefined || !equalityFn || !equalityFn(sliceRef.current, next)) {
    sliceRef.current = next
  }

  return sliceRef.current
}

function createWithEqualityFn(createState) {
  const api = createStore(createState)
  const useBoundStore = (selector = identity, equalityFn) =>
    useStoreWithEqualityFn(api, selector, equalityFn)
  Object.assign(useBoundStore, api)
  return useBoundStore
}

export * from '../../node_modules/zustand/esm/index.mjs'
export default createWithEqualityFn
