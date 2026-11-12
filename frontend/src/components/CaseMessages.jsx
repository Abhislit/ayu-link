import { useCallback, useEffect, useRef, useState } from 'react'
import { api, authenticatedAudio } from '../api'
import useRealtime from '../hooks/useRealtime'
import Icon from './Icons'
import VoiceComposer from './VoiceComposer'
import { ErrorNotice, StatusPill } from './StatusPill'

function formatTimestamp(value) {
  if (!value) return 'Time unavailable'
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? 'Time unavailable'
    : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })
}

function AudioMessage({ caseId, message }) {
  const [src, setSrc] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    let objectUrl = ''
    authenticatedAudio(`/api/cases/${caseId}/messages/${message.id}/audio`)
      .then((url) => {
        objectUrl = url
        if (active) setSrc(url)
        else URL.revokeObjectURL(url)
      })
      .catch((reason) => {
        if (active) setError(reason.message)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [caseId, message.id])

  if (error) return <p className="mt-3 text-xs text-red-700">Audio unavailable: {error}</p>
  if (!src) return <p className="mt-3 text-xs text-slate-500">Loading secure audio…</p>
  return <audio className="mt-3 w-full" controls preload="none" src={src} />
}

function MessageItem({ caseId, message, own }) {
  const assistant = message.sender_role === 'assistant'
  return (
    <article
      className={`max-w-3xl rounded-xl p-4 ring-1 ring-inset ${
        assistant
          ? 'bg-blue-50 ring-blue-100'
          : own
            ? 'ml-auto bg-red-50 ring-red-100'
            : 'bg-white ring-slate-200'
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{message.sender_name}</p>
          <p className="mt-0.5 text-xs capitalize text-slate-600">{message.sender_role?.replaceAll('_', ' ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <time className="text-xs text-slate-600">{formatTimestamp(message.created_at)}</time>
          <StatusPill status={message.ack_status} />
        </div>
      </div>
      {message.kind === 'voice' ? (
        <div className="mt-3 rounded-lg bg-white/80 p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Icon name="mic" className="h-4 w-4 text-red-700" />
            Voice note · {message.duration_seconds ?? '—'} sec
          </div>
          <AudioMessage caseId={caseId} message={message} />
        </div>
      ) : (
        <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">{message.text}</p>
      )}
    </article>
  )
}

export default function CaseMessages({
  caseId,
  user,
  canReply = false,
  replyLabel = 'Send update',
}) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [loadedCaseId, setLoadedCaseId] = useState(null)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottom = useRef(null)

  const loadMessages = useCallback(async () => {
    try {
      const result = await api(`/api/cases/${caseId}/messages`)
      setMessages(result)
      setLoadedCaseId(caseId)
      setError('')
    } catch (reason) {
      setLoadedCaseId(caseId)
      setError(reason.message || 'Messages could not be loaded.')
    }
  }, [caseId])

  const handleRealtime = useCallback(
    (event, payload) => {
      if (String(payload?.case?.id) === String(caseId)) loadMessages()
    },
    [caseId, loadMessages],
  )
  useRealtime(handleRealtime)

  useEffect(() => {
    loadMessages()
  }, [loadMessages])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function submitText(event) {
    event.preventDefault()
    if (!text.trim() || sending || !canReply) return
    setSending(true)
    setError('')
    try {
      await api(`/api/cases/${caseId}/messages`, {
        method: 'POST',
        body: { text },
      })
      setText('')
      await loadMessages()
    } catch (reason) {
      setError(reason.message || 'Update could not be sent. Try again.')
    } finally {
      setSending(false)
    }
  }

  async function sendVoice(blob, duration) {
    const form = new FormData()
    const extension = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm'
    form.append('file', blob, `voice-note.${extension}`)
    form.append('duration_seconds', String(duration))
    await api(`/api/cases/${caseId}/messages/voice`, { method: 'POST', form })
    await loadMessages()
  }

  const loading = String(loadedCaseId) !== String(caseId)

  return (
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-inset ring-slate-200">
      <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-bold text-slate-950">Emergency communications</h2>
          <p className="mt-1 text-sm text-slate-600">Messages are private to this ambulance, case, and assigned hospital.</p>
        </div>
        <span className="hidden shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 sm:inline-flex">
          Case #{caseId}
        </span>
      </header>

      <div className="max-h-[28rem] space-y-3 overflow-y-auto bg-slate-50/70 p-3 sm:p-5" aria-live="polite">
        {loading ? (
          <div className="space-y-3" aria-label="Loading messages">
            <div className="h-20 animate-pulse rounded-xl bg-slate-200" />
            <div className="ml-auto h-16 max-w-xl animate-pulse rounded-xl bg-slate-200" />
          </div>
        ) : messages.length ? (
          messages.map((message) => (
            <MessageItem
              key={message.id}
              caseId={caseId}
              message={message}
              own={message.sender_id === user.id}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-7 text-center">
            <p className="text-sm font-semibold text-slate-800">No updates sent yet</p>
            <p className="mt-1 text-sm text-slate-600">Record a voice note or write a brief handoff update.</p>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <div className="space-y-4 border-t border-slate-200 p-4 sm:p-5">
        {error ? <ErrorNotice onDismiss={() => setError('')}>{error}</ErrorNotice> : null}
        {canReply ? (
          <>
            <VoiceComposer disabled={sending} onSend={sendVoice} />
            <form onSubmit={submitText} className="space-y-2">
              <label htmlFor={`message-${caseId}`} className="text-sm font-semibold text-slate-800">
                Text update
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <textarea
                  id={`message-${caseId}`}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Share a concise update with the care team…"
                  className="min-h-12 flex-1 resize-y rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 focus:border-red-600 focus:outline-none focus:ring-2 focus:ring-red-100"
                />
                <button
                  type="submit"
                  disabled={!text.trim() || sending}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                >
                  <Icon name="send" className="h-4 w-4" />
                  {sending ? 'Sending…' : replyLabel}
                </button>
              </div>
              <p className="text-xs text-slate-600">Text is limited to 2,000 characters. Patient details are shared only with authorized case staff.</p>
            </form>
          </>
        ) : (
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-700">
            This case is read-only for your role.
          </p>
        )}
      </div>
    </section>
  )
}
