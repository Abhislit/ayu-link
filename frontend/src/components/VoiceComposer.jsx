import { useEffect, useMemo, useState } from 'react'
import useVoiceRecorder from '../hooks/useVoiceRecorder'
import Icon from './Icons'
import { ErrorNotice } from './StatusPill'

function formatDuration(seconds) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function VoiceComposer({ disabled = false, onSend }) {
  const recorder = useVoiceRecorder()
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const previewUrl = useMemo(
    () => (recorder.blob ? URL.createObjectURL(recorder.blob) : ''),
    [recorder.blob],
  )

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  async function send() {
    if (!recorder.blob || sending) return
    setError('')
    setSending(true)
    try {
      await onSend(recorder.blob, recorder.duration)
      recorder.discard()
    } catch (reason) {
      setError(reason.message || 'Voice note could not be sent. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      {recorder.error ? <ErrorNotice>{recorder.error}</ErrorNotice> : null}
      {error ? <ErrorNotice>{error}</ErrorNotice> : null}

      {recorder.recording ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 px-4 py-3 ring-1 ring-inset ring-red-200">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-600" />
            </span>
            <span className="text-sm font-semibold text-red-900">Recording · {formatDuration(recorder.elapsed)}</span>
          </div>
          <button
            type="button"
            onClick={recorder.stop}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800"
          >
            <Icon name="pause" className="h-4 w-4" />
            Stop recording
          </button>
        </div>
      ) : recorder.blob ? (
        <div className="space-y-3 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">Voice note preview</p>
            <span className="text-xs tabular-nums text-slate-600">{formatDuration(recorder.duration)}</span>
          </div>
          <audio className="w-full" controls src={previewUrl} />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={recorder.discard}
              disabled={sending}
              className="min-h-11 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete & re-record
            </button>
            <button
              type="button"
              onClick={send}
              disabled={disabled || sending}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Icon name="send" className="h-4 w-4" />
              {sending ? 'Sending…' : 'Send voice note'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={recorder.start}
          disabled={disabled || !recorder.supported}
          className="inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-xl bg-red-700 px-5 py-3 text-base font-bold text-white transition-colors hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:min-w-56"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
            <Icon name="mic" className="h-5 w-5" />
          </span>
          Record voice note
        </button>
      )}
      {!recorder.supported && !recorder.error ? (
        <p className="text-xs text-slate-600">This browser cannot record audio. Use the text update below.</p>
      ) : (
        <p className="text-xs text-slate-600">Your browser will ask permission before recording starts.</p>
      )}
    </div>
  )
}
