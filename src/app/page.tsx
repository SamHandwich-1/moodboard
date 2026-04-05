'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface LogEntry {
  time: string
  type: 'info' | 'debug' | 'success' | 'warn' | 'error'
  msg: string
}

const STARTER_PROMPTS = [
  'Australian craft spirits in a steel tin, botanical garnish, rooftop bar at sunset, amber light, condensation on metal',
  'Premium dark liquor bottle on a moody bar counter, warm tungsten light, leather and wood textures',
  'Friends sharing drinks around a campfire, tin vessels, mountain backdrop, night sky, adventure',
  'Elegant cocktail party on a rooftop, city lights, sophisticated minimal, crystal and chrome',
  'Rustic distillery interior, copper still, wooden barrels, craftsman workshop, morning light',
  'Lone drink on a windowsill, rain outside, neon reflections, melancholy urban night',
]

export default function MoodboardEngine() {
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<string[]>(STARTER_PROMPTS)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [imageMimeType, setImageMimeType] = useState<string>('image/png')
  const [description, setDescription] = useState('')
  const [harvest, setHarvest] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [describing, setDescribing] = useState(false)
  const [genLogs, setGenLogs] = useState<LogEntry[]>([])
  const [descLogs, setDescLogs] = useState<LogEntry[]>([])

  const genLogRef = useRef<HTMLDivElement>(null)
  const descLogRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (genLogRef.current) genLogRef.current.scrollTop = genLogRef.current.scrollHeight
  }, [genLogs])
  useEffect(() => {
    if (descLogRef.current) descLogRef.current.scrollTop = descLogRef.current.scrollHeight
  }, [descLogs])

  const gLog = (type: LogEntry['type'], msg: string) =>
    setGenLogs(p => [...p, { time: new Date().toLocaleTimeString(), type, msg }])
  const dLog = (type: LogEntry['type'], msg: string) =>
    setDescLogs(p => [...p, { time: new Date().toLocaleTimeString(), type, msg }])

  // Generate image via Gemini
  const generate = async () => {
    if (!prompt.trim() || generating) return
    const p = prompt.trim()

    setGenerating(true)
    setImageBase64(null)
    setDescription('')
    setHarvest([])
    setGenLogs([])
    setDescLogs([])

    setHistory(prev => {
      if (prev.includes(p)) return prev
      return [p, ...prev].slice(0, 30)
    })

    gLog('info', `Prompt: "${p}"`)
    gLog('info', 'Calling Gemini Nano Banana API...')

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      })

      const data = await res.json()
      gLog('debug', `Status: ${res.status}`)
      gLog('debug', `Model: ${data.model || 'unknown'}`)

      if (data.error) {
        gLog('error', `Error: ${data.error}`)
        if (data.details) gLog('debug', `Details: ${typeof data.details === 'string' ? data.details.substring(0, 500) : JSON.stringify(data.details).substring(0, 500)}`)
        setGenerating(false)
        return
      }

      if (data.debug) {
        gLog('debug', `Candidates: ${data.debug.candidateCount}`)
        gLog('debug', `Parts: ${data.debug.partCount} [${data.debug.partTypes?.join(', ')}]`)
        gLog('debug', `Finish reason: ${data.debug.finishReason}`)
      }

      if (data.text) {
        gLog('info', `Gemini text: ${data.text.substring(0, 200)}`)
      }

      if (data.image) {
        setImageBase64(data.image.base64)
        setImageMimeType(data.image.mimeType || 'image/png')
        gLog('success', `Image received! (${data.image.mimeType}, ${Math.round(data.image.base64.length / 1024)}kb base64)`)
      } else {
        gLog('warn', 'No image in response')
      }
    } catch (err: any) {
      gLog('error', `Fetch error: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // Describe image via Claude
  const describe = async () => {
    if (!imageBase64 || describing) return

    setDescribing(true)
    setDescription('')
    setHarvest([])
    setDescLogs([])

    dLog('info', 'Sending image to Claude for description...')
    dLog('debug', `Image size: ${Math.round(imageBase64.length / 1024)}kb base64`)

    try {
      const res = await fetch('/api/describe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, imageMimeType }),
      })

      const data = await res.json()
      dLog('debug', `Status: ${res.status}`)

      if (data.error) {
        dLog('error', `Error: ${data.error}`)
        if (data.details) dLog('debug', `Details: ${typeof data.details === 'string' ? data.details.substring(0, 500) : JSON.stringify(data.details).substring(0, 500)}`)
        setDescribing(false)
        return
      }

      if (data.debug) {
        dLog('debug', `Model: ${data.debug.model}`)
        dLog('debug', `Tokens: ${data.debug.inputTokens} in / ${data.debug.outputTokens} out`)
        dLog('debug', `Stop: ${data.debug.stopReason}`)
      }

      if (data.description) {
        setDescription(data.description)
        dLog('success', `Description: ${data.description.length} chars`)
      }

      if (data.harvest?.length) {
        setHarvest(data.harvest)
        dLog('success', `Harvested ${data.harvest.length} words`)
      } else {
        dLog('warn', 'No harvest extracted')
      }
    } catch (err: any) {
      dLog('error', `Fetch error: ${err.message}`)
    } finally {
      setDescribing(false)
    }
  }

  // File upload
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setGenLogs([])
    setDescLogs([])
    setDescription('')
    setHarvest([])
    gLog('info', `Loading file: ${file.name}`)
    const reader = new FileReader()
    reader.onload = (ev) => {
      const result = ev.target?.result as string
      const match = result.match(/^data:(.*?);base64,(.*)$/)
      if (match) {
        setImageBase64(match[2])
        setImageMimeType(match[1])
        gLog('success', `Loaded: ${match[1]}, ${Math.round(match[2].length / 1024)}kb`)
      }
    }
    reader.readAsDataURL(file)
  }

  // Paste handler
  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (!file) return
        setGenLogs([{ time: new Date().toLocaleTimeString(), type: 'info', msg: 'Pasting image from clipboard...' }])
        setDescLogs([])
        setDescription('')
        setHarvest([])
        const reader = new FileReader()
        reader.onload = (ev) => {
          const result = ev.target?.result as string
          const match = result.match(/^data:(.*?);base64,(.*)$/)
          if (match) {
            setImageBase64(match[2])
            setImageMimeType(match[1])
            setGenLogs(p => [...p, { time: new Date().toLocaleTimeString(), type: 'success', msg: 'Image pasted. Click DESCRIBE to harvest.' }])
          }
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [handlePaste])

  const logColor: Record<string, string> = {
    info: 'text-fg',
    debug: 'text-muted',
    success: 'text-green-400',
    warn: 'text-accent',
    error: 'text-red-400',
  }

  return (
    <div className="min-h-screen bg-bg text-fg font-body flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex-shrink-0">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Visual Moodboard Engine
        </h1>
        <p className="text-muted text-xs mt-1 font-light tracking-wide">
          Nano Banana 2 → Claude Description → Word Harvest
        </p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT — Controls */}
        <div className="w-72 border-r border-border flex flex-col flex-shrink-0">
          {/* Prompt */}
          <div className="p-4 border-b border-border">
            <Label>Image Prompt</Label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe a scene, mood, product, occasion..."
              rows={4}
              className="w-full bg-surface border border-border text-fg p-3 text-sm font-body resize-vertical outline-none focus:border-muted"
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) generate() }}
            />
            <button
              onClick={generate}
              disabled={!prompt.trim() || generating}
              className="w-full mt-2 bg-accent text-bg py-2.5 text-xs font-semibold tracking-widest uppercase disabled:bg-border disabled:text-muted transition-colors"
            >
              {generating ? 'GENERATING...' : 'GENERATE IMAGE'}
            </button>
          </div>

          {/* Upload / Paste */}
          <div className="p-4 border-b border-border">
            <Label>Upload or Paste</Label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full bg-surface border border-border text-fg py-2 text-xs font-semibold tracking-wide hover:border-muted transition-colors"
            >
              CHOOSE FILE
            </button>
            <p className="text-[10px] text-muted mt-2">or ⌘V / Ctrl+V to paste an image</p>
          </div>

          {/* Prompt History */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 pt-3">
              <Label>Prompt History</Label>
            </div>
            <div className="flex-1 overflow-y-auto">
              {history.map((h, i) => (
                <div
                  key={i}
                  onClick={() => setPrompt(h)}
                  className="px-4 py-2.5 text-[11px] text-muted cursor-pointer border-b border-border leading-relaxed hover:text-fg hover:bg-surface transition-colors"
                >
                  {h}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CENTER — Image + Description */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Image Panel */}
          <div className="border-b border-border flex-shrink-0">
            <div className="px-5 py-2.5 border-b border-border flex justify-between items-center">
              <Label>Generated Image</Label>
              {imageBase64 && (
                <button
                  onClick={describe}
                  disabled={describing}
                  className="bg-accent text-bg px-4 py-1.5 text-[11px] font-semibold tracking-wide disabled:bg-border disabled:text-muted transition-colors"
                >
                  {describing ? 'DESCRIBING...' : 'DESCRIBE & HARVEST'}
                </button>
              )}
            </div>
            <div className="flex items-center justify-center p-6 min-h-[280px] max-h-[420px]">
              {generating ? (
                <div className="text-muted text-sm text-center">
                  <div className="text-2xl animate-spin-slow mb-2">◐</div>
                  Generating via Nano Banana 2...
                </div>
              ) : imageBase64 ? (
                <img
                  src={`data:${imageMimeType};base64,${imageBase64}`}
                  alt="Generated moodboard"
                  className="max-w-full max-h-[380px] object-contain"
                />
              ) : (
                <div className="text-center text-border">
                  <div className="text-5xl font-display mb-3">◻</div>
                  <div className="text-sm">Enter a prompt · Upload · Paste</div>
                </div>
              )}
            </div>
          </div>

          {/* Description + Harvest */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-5 py-2.5 border-b border-border flex-shrink-0">
              <Label>
                Claude Description
                {harvest.length > 0 && (
                  <span className="text-accent ml-2">· {harvest.length} words harvested</span>
                )}
              </Label>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {describing ? (
                <p className="text-muted text-sm">
                  <span className="inline-block animate-spin-slow mr-2">◐</span>
                  Claude is studying the image...
                </p>
              ) : description ? (
                <>
                  <div className="text-sm leading-[1.85] whitespace-pre-wrap">
                    {description}
                  </div>
                  {harvest.length > 0 && (
                    <div className="mt-6 border-t border-border pt-5">
                      <div className="text-[10px] uppercase tracking-[0.12em] text-accent font-semibold mb-3">
                        Word Harvest — {harvest.length} words
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {harvest.map((w, i) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-surface border border-border text-sm font-display font-semibold tracking-wide text-fg"
                          >
                            {w}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-border text-sm">
                  Generate or load an image, then click Describe & Harvest
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Debug */}
        <div className="w-72 border-l border-border flex flex-col flex-shrink-0">
          {/* Gen Debug */}
          <div className="flex-1 flex flex-col border-b border-border overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex justify-between items-center flex-shrink-0">
              <Label>Debug — Generation</Label>
              <button
                onClick={() => setGenLogs([])}
                className="text-[9px] text-muted border border-border px-2 py-0.5 hover:text-fg transition-colors"
              >
                CLEAR
              </button>
            </div>
            <div ref={genLogRef} className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed">
              {genLogs.length === 0 ? (
                <p className="text-border p-2">Waiting for generation...</p>
              ) : genLogs.map((l, i) => (
                <div key={i} className="break-all">
                  <span className="text-border">{l.time}</span>{' '}
                  <span className={`${logColor[l.type]} ${l.type === 'error' ? 'font-bold' : ''}`}>
                    [{l.type}]
                  </span>{' '}
                  <span className={l.type === 'debug' ? 'text-muted' : 'text-fg'}>
                    {l.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Desc Debug */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border flex justify-between items-center flex-shrink-0">
              <Label>Debug — Description</Label>
              <button
                onClick={() => setDescLogs([])}
                className="text-[9px] text-muted border border-border px-2 py-0.5 hover:text-fg transition-colors"
              >
                CLEAR
              </button>
            </div>
            <div ref={descLogRef} className="flex-1 overflow-y-auto p-2 font-mono text-[10px] leading-relaxed">
              {descLogs.length === 0 ? (
                <p className="text-border p-2">Waiting for description...</p>
              ) : descLogs.map((l, i) => (
                <div key={i} className="break-all">
                  <span className="text-border">{l.time}</span>{' '}
                  <span className={`${logColor[l.type]} ${l.type === 'error' ? 'font-bold' : ''}`}>
                    [{l.type}]
                  </span>{' '}
                  <span className={l.type === 'debug' ? 'text-muted' : 'text-fg'}>
                    {l.msg}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-[0.12em] text-muted mb-1.5 font-medium">
      {children}
    </div>
  )
}
