import { useEffect, useState } from 'react'
import Landing from './Landing.jsx'
import Dashboard from './Dashboard.jsx'

// Hash routes: #/  #/p/:id  #/w/:witnessId. Query (?session_id=) sits after the hash.
function parse() {
  const [path, query = ''] = location.hash.replace(/^#/, '').split('?')
  return { parts: path.split('/').filter(Boolean), params: new URLSearchParams(query) }
}

export default function App() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => { setRoute(parse()); window.scrollTo(0, 0) }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])
  const [a, b] = route.parts
  if (a === 'p' && b) return <Dashboard key={'p' + b} id={b} params={route.params} />
  if (a === 'w' && b) return <Dashboard key={'w' + b} witnessId={b} />
  return <Landing params={route.params} />
}
