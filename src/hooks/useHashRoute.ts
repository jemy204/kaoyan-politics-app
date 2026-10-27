import { useEffect, useState } from 'react'
import { parseHash, type ParsedHash } from '../lib/utils'

export function useHashRoute(): ParsedHash {
  const [route, setRoute] = useState<ParsedHash>(() => parseHash())

  useEffect(() => {
    const onChange = () => setRoute(parseHash())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}
