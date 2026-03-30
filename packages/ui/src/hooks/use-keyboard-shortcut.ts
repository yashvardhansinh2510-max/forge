'use client'

import { useEffect, useCallback } from 'react'

type Modifier = 'meta' | 'ctrl' | 'shift' | 'alt'

interface Options {
  preventDefault?: boolean
}

export function useKeyboardShortcut(
  key: string,
  modifiers: Modifier[],
  callback: () => void,
  options?: Options,
): void {
  const preventDefault = options?.preventDefault ?? true

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const matchesMeta = modifiers.includes('meta') ? e.metaKey || e.ctrlKey : true
      const matchesShift = modifiers.includes('shift') ? e.shiftKey : true
      const matchesAlt = modifiers.includes('alt') ? e.altKey : true

      if (e.key.toLowerCase() === key.toLowerCase() && matchesMeta && matchesShift && matchesAlt) {
        if (preventDefault) {
          e.preventDefault()
        }
        callback()
      }
    },
    [key, modifiers, callback, preventDefault],
  )

  useEffect(() => {
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handler])
}
