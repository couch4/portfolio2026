'use client'

import React, { useCallback, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'processing' | 'done' | 'error'

interface ResultState {
  originalUrl: string
  blurredDataUrl: string
  width: number
  height: number
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function BlurredPlaceholderCreator() {
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [placeholderSize, setPlaceholderSize] = useState(4)
  const [saturation, setSaturation] = useState(1.2)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevOriginalUrl = useRef<string | null>(null)
  const [copied, setCopied] = useState(false)

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.')
        return
      }

      // Revoke previous object URL
      if (prevOriginalUrl.current) URL.revokeObjectURL(prevOriginalUrl.current)

      setError(null)
      setResult(null)
      setStatus('processing')

      const originalUrl = URL.createObjectURL(file)
      prevOriginalUrl.current = originalUrl

      try {
        const { createBlurredPlaceholder } =
          await import('../../utilities/createBlurredPlaceholder')

        const blurredResult = await createBlurredPlaceholder(file, {
          size: placeholderSize,
          saturation,
        })

        setResult({
          originalUrl,
          blurredDataUrl: blurredResult.dataUrl,
          width: blurredResult.width,
          height: blurredResult.height,
        })
        setStatus('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
        setStatus('error')
        URL.revokeObjectURL(originalUrl)
      }
    },
    [placeholderSize, saturation],
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (files?.[0]) processFile(files[0])
    },
    [processFile],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      handleFiles(e.dataTransfer.files)
    },
    [handleFiles],
  )

  const handleCopy = useCallback(() => {
    if (result?.blurredDataUrl) {
      navigator.clipboard.writeText(result.blurredDataUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [result])

  const isProcessing = status === 'processing'

  return (
    <div className="w-full p-5">
      <h1 className="mb-4 text-3xl">Blurred Placeholder Generator</h1>

      {/* Settings */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-slate-500">
            Size (px) · 4–64
          </label>
          <input
            type="number"
            min="4"
            max="64"
            value={placeholderSize}
            onChange={(e) => setPlaceholderSize(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.08em] text-slate-500">
            Saturation · default 1.2
          </label>
          <input
            type="number"
            min="0"
            max="3"
            step="0.1"
            value={saturation}
            onChange={(e) => setSaturation(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
          />
        </div>
      </div>

      {/* Drop zone */}
      <div
        onClick={() => !isProcessing && fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        className={`border-2 rounded-[12px] py-10 px-6 text-center transition-all mb-6 ${
          isDragging ? 'border-violet-500 bg-[#1e1033]' : 'border-slate-800 bg-slate-950'
        } ${isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="text-3xl mb-2">🖼</div>
        <p className="text-sm text-slate-400 m-0">
          {isProcessing ? 'Processing…' : 'Drop an image here, or click to upload'}
        </p>
        <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP, AVIF supported</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-900 bg-[#1c0a0a] px-4 py-3 text-[13px] text-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div>
          <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
            <ImagePanel label="Original" src={result.originalUrl} />
            <ImagePanel
              label={`Blurred · ${result.width}×${result.height} (CSS blur 20px applied — matches NextImage)`}
              src={result.blurredDataUrl}
              blurred
            />
          </div>

          {/* Base64 output */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.08em] text-slate-500">
                Base64 string
              </p>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded bg-slate-800 px-2 py-1 text-xs text-slate-300 transition-colors hover:bg-slate-700"
              >
                {copied ? (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
              <code className="block break-all text-[11px] text-slate-400">
                {result.blurredDataUrl}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helper
// ---------------------------------------------------------------------------

function ImagePanel({ label, src, blurred }: { label: string; src: string; blurred?: boolean }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
      {blurred ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
          {/* Mimics NextImage's placeholder render: scaled-up tiny image + 20px CSS blur */}
          <img
            src={src}
            alt={label}
            className="block w-full h-auto"
            style={{
              filter: 'blur(20px)',
              transform: 'scale(1.1)',
              transformOrigin: 'center',
            }}
          />
        </div>
      ) : (
        <img
          src={src}
          alt={label}
          className="block w-full h-auto rounded-lg border border-slate-800 bg-slate-950"
        />
      )}
    </div>
  )
}
