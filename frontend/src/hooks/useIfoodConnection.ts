import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api'

export type AuthState = 'checking' | 'yes' | 'no' | 'error'

// O OAuth fica em outra aba para preservar o texto, a foto e a revisão em andamento.
export function useIfoodConnection() {
  const [auth, setAuth] = useState<AuthState>('checking')
  const [connectionId, setConnectionId] = useState<string | null>(null)
  const [waitingForLogin, setWaitingForLogin] = useState(false)
  const checking = useRef(false)

  const refreshAuth = useCallback(async () => {
    if (checking.current) return
    checking.current = true
    try {
      const result = await api.authStatus()
      setConnectionId(result.authenticated ? result.connection_id ?? null : null)
      setAuth(result.authenticated ? 'yes' : 'no')
      if (result.authenticated) setWaitingForLogin(false)
    } catch {
      setAuth('error')
    } finally {
      checking.current = false
    }
  }, [])

  useEffect(() => {
    void refreshAuth()
    const onFocus = () => {
      if (document.visibilityState === 'visible') void refreshAuth()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [refreshAuth])

  useEffect(() => {
    if (!waitingForLogin) return
    // Verificações limitadas ao login solicitado; nenhuma ferramenta MCP é acionada.
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refreshAuth()
    }, 3000)
    const timeout = window.setTimeout(() => setWaitingForLogin(false), 5 * 60_000)
    return () => { window.clearInterval(interval); window.clearTimeout(timeout) }
  }, [waitingForLogin, refreshAuth])

  const connect = useCallback(() => {
    setWaitingForLogin(true)
    window.open(api.loginUrl, '_blank', 'noopener,noreferrer')
  }, [])

  return { auth, connectionId, setAuth, waitingForLogin, connect, refreshAuth }
}
