import { useEffect, useRef, useState } from 'react'

export function useStripAdvance(status) {
  const previous = useRef(status)
  const [advancing, setAdvancing] = useState(false)

  useEffect(() => {
    if (previous.current === status) return
    previous.current = status
    setAdvancing(true)
    const timer = setTimeout(() => setAdvancing(false), 500)
    return () => clearTimeout(timer)
  }, [status])

  return advancing
}
