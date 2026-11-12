import { useEffect, useRef, useState } from 'react'

const MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
]

export default function useVoiceRecorder() {
  const recorder = useRef(null)
  const stream = useRef(null)
  const startedAt = useRef(0)
  const [recording, setRecording] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [blob, setBlob] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!recording) return undefined
    const timer = window.setInterval(() => {
      const currentSeconds = Math.floor((Date.now() - startedAt.current) / 1000)
      setElapsed(currentSeconds)
      if (currentSeconds >= 120 && recorder.current?.state === 'recording') {
        recorder.current.stop()
        setRecording(false)
      }
    }, 250)
    return () => window.clearInterval(timer)
  }, [recording])

  useEffect(
    () => () => {
      if (recorder.current?.state === 'recording') recorder.current.stop()
      stream.current?.getTracks().forEach((track) => track.stop())
    },
    [],
  )

  async function start() {
    setError('')
    setBlob(null)
    setDuration(0)
    setElapsed(0)

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setError('Voice recording is not supported in this browser. You can send a text update instead.')
      return
    }

    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = audioStream
      const mimeType = MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type))
      const activeRecorder = new MediaRecorder(audioStream, mimeType ? { mimeType } : undefined)
      const chunks = []
      activeRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data)
      }
      activeRecorder.onerror = () => {
        setError('Recording stopped unexpectedly. Check microphone access and try again.')
        setRecording(false)
      }
      activeRecorder.onstop = () => {
        const mediaType = activeRecorder.mimeType || chunks[0]?.type || 'audio/webm'
        const recordingBlob = new Blob(chunks, { type: mediaType.split(';')[0] })
        const recordedSeconds = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000))
        if (!recordingBlob.size) {
          setError('No audio was captured. Check microphone permissions and try again.')
        } else {
          setBlob(recordingBlob)
          setDuration(Math.min(recordedSeconds, 120))
        }
        setElapsed(Math.min(recordedSeconds, 120))
        audioStream.getTracks().forEach((track) => track.stop())
        stream.current = null
      }
      startedAt.current = Date.now()
      recorder.current = activeRecorder
      activeRecorder.start()
      setRecording(true)
    } catch (reason) {
      const message =
        reason?.name === 'NotAllowedError' || reason?.name === 'PermissionDeniedError'
          ? 'Microphone permission was denied. Allow microphone access in browser settings or send a text update.'
          : reason?.name === 'NotFoundError'
            ? 'No microphone was found. Connect a microphone or send a text update.'
            : 'Could not start the microphone. Check browser permissions and try again.'
      setError(message)
      stream.current?.getTracks().forEach((track) => track.stop())
      stream.current = null
    }
  }

  function stop() {
    if (recorder.current?.state === 'recording') {
      recorder.current.stop()
      setRecording(false)
    }
  }

  function discard() {
    setBlob(null)
    setDuration(0)
    setElapsed(0)
    setError('')
  }

  return {
    recording,
    elapsed,
    duration,
    blob,
    error,
    supported: Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder),
    start,
    stop,
    discard,
  }
}
