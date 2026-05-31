import { useEffect, useRef, useState } from 'react'

/**
 * Cycles through an array of strings while `active` is true.
 * Stays on the first string for `startDelay` ms, then rotates
 * every `interval` ms. Resets to index 0 when `active` goes false.
 */
export function useRotatingText(
  phrases: string[],
  active: boolean,
  interval = 2500,
  startDelay = 3000
): string {
  const [index, setIndex] = useState(0)
  const delayTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rotateTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active) {
      setIndex(0)
      if (delayTimer.current) clearTimeout(delayTimer.current)
      if (rotateTimer.current) clearInterval(rotateTimer.current)
      return
    }

    // Wait startDelay before beginning to rotate
    delayTimer.current = setTimeout(() => {
      rotateTimer.current = setInterval(() => {
        setIndex((i) => (i + 1) % phrases.length)
      }, interval)
    }, startDelay)

    return () => {
      if (delayTimer.current) clearTimeout(delayTimer.current)
      if (rotateTimer.current) clearInterval(rotateTimer.current)
    }
  }, [active, phrases.length, interval, startDelay])

  return phrases[index]
}
