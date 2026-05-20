'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'

function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const type of types) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

interface VoiceData {
  label: string
  audioUrl: string | null
  audioMime: string | null
  duration: number
  timestamp: string
  [key: string]: unknown
}

export default function VoiceNoteNode({ data, selected }: NodeProps) {
  const d = data as VoiceData
  const [recording, setRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(d.audioUrl)
  const [audioMime, setAudioMime] = useState<string | null>(d.audioMime ?? null)
  const [duration, setDuration] = useState(d.duration || 0)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [collapsed, setCollapsed] = useState(false)
  const [playError, setPlayError] = useState<string | null>(null)
  const [waveform, setWaveform] = useState<number[]>(
    Array.from({ length: 32 }, (_, i) => 0.2 + Math.sin(i * 0.4) * 0.15 + 0.1)
  )

  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const waveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsed = useRef(0)

  const formattedDuration = (secs: number) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const formattedTime = new Date(d.timestamp || Date.now()).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  })

  const startRecording = useCallback(async () => {
    try {
      setPlayError(null)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = getSupportedMimeType()
      const options = mimeType ? { mimeType } : {}
      const mr = new MediaRecorder(stream, options)

      mediaRef.current = mr
      chunksRef.current = []
      elapsed.current = 0

      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const usedMime = mimeType || 'audio/webm'
        const blob = new Blob(chunksRef.current, { type: usedMime })
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setAudioMime(usedMime)
        d.audioUrl = url
        d.audioMime = usedMime
        d.duration = elapsed.current
        setDuration(elapsed.current)
        stream.getTracks().forEach(t => t.stop())
      }

      mr.start(100)
      setRecording(true)
      timerRef.current = setInterval(() => { elapsed.current += 1; setDuration(elapsed.current) }, 1000)
      waveTimerRef.current = setInterval(() => {
        setWaveform(Array.from({ length: 32 }, () => Math.random() * 0.8 + 0.1))
      }, 120)
    } catch (err) {
      console.error('Recording error:', err)
      setPlayError('Microphone access denied or unavailable.')
    }
  }, [d])

  const stopRecording = useCallback(() => {
    if (mediaRef.current?.state !== 'inactive') mediaRef.current?.stop()
    setRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveTimerRef.current) clearInterval(waveTimerRef.current)
  }, [])

  const togglePlay = useCallback(() => {
    if (!audioUrl) return
    setPlayError(null)

    if (!audioRef.current) {
      const audio = new Audio()
      audio.src = audioUrl

      audio.ontimeupdate = () => {
        if (audio.duration && !isNaN(audio.duration)) {
          setProgress((audio.currentTime / audio.duration) * 100)
        }
      }
      audio.onended = () => { setPlaying(false); setProgress(0) }
      audio.onerror = () => {
        const code = audio.error?.code ?? 0
        const msgs: Record<number, string> = {
          1: 'Playback aborted.',
          2: 'Network error during playback.',
          3: 'Audio decoding failed.',
          4: 'Format not supported on this device. Try re-recording.',
        }
        setPlayError(msgs[code] ?? 'Playback failed. Try re-recording.')
        setPlaying(false)
      }
      audioRef.current = audio
    }

    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
        .then(() => setPlaying(true))
        .catch(err => {
          console.error('Play failed:', err)
          setPlayError('Playback failed. Try re-recording.')
          setPlaying(false)
        })
    }
  }, [audioUrl, audioMime, playing])

  const discard = () => {
    audioRef.current?.pause()
    audioRef.current = null
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null); setAudioMime(null); setDuration(0)
    setProgress(0); setPlaying(false); setPlayError(null)
    d.audioUrl = null; d.audioMime = null; d.duration = 0
    setWaveform(Array.from({ length: 32 }, (_, i) => 0.2 + Math.sin(i * 0.4) * 0.15 + 0.1))
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (waveTimerRef.current) clearInterval(waveTimerRef.current)
    audioRef.current?.pause()
  }, [])

  return (
    <div className={`voice-node ${selected ? 'voice-node--selected' : ''}`}>
      <Handle type="target" position={Position.Left} className="voice-handle" />
      <Handle type="source" position={Position.Right} className="voice-handle" />

      <div className="voice-header">
        <span className="voice-icon">🎙</span>
        <span className="voice-type-label">Voice Note</span>
        <span className="voice-time">{formattedTime}</span>
        <button className="voice-collapse-btn" onClick={() => setCollapsed(v => !v)}>
          {collapsed ? '▾' : '▴'}
        </button>
      </div>

      {!collapsed && (
        <div className="voice-body">
          <div className="voice-waveform">
            {waveform.map((h, i) => (
              <div
                key={i}
                className={`voice-bar ${playing && (i / waveform.length * 100) < progress ? 'voice-bar--played' : ''} ${recording ? 'voice-bar--recording' : ''}`}
                style={{ height: `${h * 100}%` }}
              />
            ))}
            {audioUrl && !recording && (
              <div className="voice-progress-line" style={{ left: `${progress}%` }} />
            )}
          </div>

          <div className="voice-meta">
            <span className="voice-duration">
              {recording && <span className="voice-recording-dot" />}
              {formattedDuration(duration)}
            </span>
            {audioUrl && !recording && (
              <button className="voice-discard-btn" onClick={discard}>Discard</button>
            )}
          </div>

          {playError && <p className="voice-error">{playError}</p>}

          <div className="voice-controls">
            {!audioUrl ? (
              <button
                className={`voice-record-btn ${recording ? 'voice-record-btn--stop' : ''}`}
                onClick={recording ? stopRecording : startRecording}
              >
                {recording
                  ? <><span className="voice-stop-square" /> Stop</>
                  : <><span className="voice-rec-circle" /> Record</>}
              </button>
            ) : (
              <button className="voice-play-btn" onClick={togglePlay}>
                {playing
                  ? <><span className="voice-pause-icon">⏸</span> Pause</>
                  : <><span className="voice-play-icon">▶</span> Play</>}
              </button>
            )}
          </div>
        </div>
      )}

      {collapsed && (
        <div className="voice-collapsed">
          <div className="voice-collapsed-wave">
            {waveform.slice(0, 16).map((h, i) => (
              <div key={i} className="voice-bar" style={{ height: `${h * 100}%` }} />
            ))}
          </div>
          <span className="voice-collapsed-dur">{formattedDuration(duration)}</span>
        </div>
      )}

      <style>{`
        .voice-node{width:240px;background:#FDFAF4;border:1.5px solid #C4B9A8;border-radius:14px;font-family:'DM Sans',system-ui,sans-serif;overflow:hidden;transition:box-shadow 0.2s,border-color 0.2s;}
        .voice-node--selected{border-color:#8B5E3C;box-shadow:0 0 0 3px rgba(139,94,60,0.15);}
        .voice-handle{width:8px !important;height:8px !important;background:#8B5E3C !important;border:2px solid #F2EBD9 !important;opacity:0;transition:opacity 0.2s;}
        .voice-node:hover .voice-handle,.voice-node--selected .voice-handle{opacity:1;}
        .voice-header{display:flex;align-items:center;gap:7px;padding:10px 12px 8px;border-bottom:1px solid #EDE6D6;}
        .voice-icon{font-size:13px;color:#8B5E3C;}
        .voice-type-label{font-size:10px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:#8B5E3C;flex:1;}
        .voice-time{font-size:10px;color:#9A8F80;font-variant-numeric:tabular-nums;}
        .voice-collapse-btn{background:none;border:none;cursor:pointer;font-size:12px;color:#9A8F80;padding:0;}
        .voice-body{padding:12px 12px 10px;display:flex;flex-direction:column;gap:10px;}
        .voice-waveform{display:flex;align-items:center;gap:2px;height:48px;position:relative;}
        .voice-bar{flex:1;border-radius:2px;background:#C4B9A8;min-height:3px;transition:height 0.08s;}
        .voice-bar--played{background:#8B5E3C;}
        .voice-bar--recording{background:#C0394B;animation:vpulse 0.5s ease infinite alternate;}
        @keyframes vpulse{from{opacity:0.6}to{opacity:1}}
        .voice-progress-line{position:absolute;top:0;bottom:0;width:1.5px;background:#8B5E3C;transform:translateX(-50%);pointer-events:none;}
        .voice-meta{display:flex;align-items:center;justify-content:space-between;}
        .voice-duration{display:flex;align-items:center;gap:5px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#9A8F80;font-variant-numeric:tabular-nums;}
        .voice-recording-dot{width:6px;height:6px;border-radius:50%;background:#C0394B;animation:vpulse 0.8s ease infinite alternate;}
        .voice-discard-btn{font-size:10px;color:#9A8F80;background:none;border:none;cursor:pointer;padding:0;font-family:'DM Sans',system-ui,sans-serif;transition:color 0.15s;}
        .voice-discard-btn:hover{color:#C0394B;}
        .voice-error{font-size:11px;color:#C0394B;margin:0;background:rgba(192,57,75,0.06);border-radius:6px;padding:5px 8px;line-height:1.4;}
        .voice-controls{display:flex;justify-content:center;}
        .voice-record-btn,.voice-play-btn{display:flex;align-items:center;gap:6px;padding:7px 18px;border-radius:20px;font-size:12px;font-weight:600;font-family:'DM Sans',system-ui,sans-serif;cursor:pointer;border:none;transition:all 0.15s;}
        .voice-record-btn{background:rgba(192,57,75,0.1);color:#C0394B;border:1px solid rgba(192,57,75,0.25);}
        .voice-record-btn:hover{background:rgba(192,57,75,0.18);}
        .voice-record-btn--stop{background:#C0394B;color:#F2EBD9;border-color:#C0394B;}
        .voice-play-btn{background:rgba(139,94,60,0.1);color:#8B5E3C;border:1px solid rgba(139,94,60,0.25);}
        .voice-play-btn:hover{background:rgba(139,94,60,0.18);}
        .voice-rec-circle{width:8px;height:8px;border-radius:50%;background:#C0394B;}
        .voice-stop-square{width:8px;height:8px;border-radius:1px;background:#F2EBD9;}
        .voice-play-icon,.voice-pause-icon{font-size:11px;}
        .voice-collapsed{display:flex;align-items:center;gap:8px;padding:6px 12px 8px;}
        .voice-collapsed-wave{display:flex;align-items:center;gap:2px;height:24px;flex:1;}
        .voice-collapsed-dur{font-family:'JetBrains Mono',monospace;font-size:10px;color:#9A8F80;}
      `}</style>
    </div>
  )
}
