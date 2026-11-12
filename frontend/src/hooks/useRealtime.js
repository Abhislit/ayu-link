import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from '../auth'
import { BASE } from '../api'

const EVENTS = [
  'case:created',
  'case:updated',
  'case:acknowledged',
  'prep:updated',
  'message:new',
  'message:delivered',
  'message:ack',
]

export default function useRealtime(onEvent) {
  const { token } = useAuth()
  const handler = useRef(onEvent)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    handler.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!token) return undefined

    const socket = io(BASE || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
    })
    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', () => setConnected(false))
    EVENTS.forEach((event) => socket.on(event, (payload) => handler.current?.(event, payload)))

    return () => {
      socket.disconnect()
      setConnected(false)
    }
  }, [token])

  return connected
}
