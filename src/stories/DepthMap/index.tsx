'use client'

import React, { useCallback, useRef, useState } from 'react'
import type { DepthModelId } from '../../utilities/createDepthMap'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'loading-model' | 'running' | 'done' | 'error'

interface ResultState {
  originalUrl: string
  depthUrl: string
  width: number
  height: number
}

const MODELS: { id: DepthModelId; label: string; note: string }[] = [
  {
    id: 'Xenova/depth-anything-small-hf',
    label: 'Depth Anything — Small',
    note: '~99 MB · fastest',
  },
  {
    id: 'Xenova/depth-anything-base-hf',
    label: 'Depth Anything — Base',
    note: '~390 MB · better quality',
  },
  {
    id: 'Xenova/dpt-hybrid-midas',
    label: 'MiDaS DPT-Hybrid',
    note: '~470 MB · original MiDaS',
  },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DepthMapCreator() {
  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<ResultState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedModel, setSelectedModel] = useState<DepthModelId>(MODELS[1].id)
  const [sourceFileName, setSourceFileName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevDepthUrl = useRef<string | null>(null)
  const prevOriginalUrl = useRef<string | null>(null)

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.')
        return
      }

      // Revoke previous object URLs
      if (prevDepthUrl.current) URL.revokeObjectURL(prevDepthUrl.current)
      if (prevOriginalUrl.current) URL.revokeObjectURL(prevOriginalUrl.current)

      setError(null)
      setResult(null)
      setProgress(0)
      setSourceFileName(file.name)
      setStatus('loading-model')

      const originalUrl = URL.createObjectURL(file)
      prevOriginalUrl.current = originalUrl

      try {
        // Lazy import so the heavy WASM bundle doesn't land in the initial chunk
        const { createDepthMap } = await import('../../utilities/createDepthMap')

        setStatus('running')

        const depthResult = await createDepthMap(file, {
          model: selectedModel,
          onProgress: (p) => {
            setProgress(p)
            if (p >= 1) setStatus('running')
          },
        })

        prevDepthUrl.current = depthResult.url

        setResult({
          originalUrl,
          depthUrl: depthResult.url,
          width: depthResult.width,
          height: depthResult.height,
        })
        setStatus('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred.')
        setStatus('error')
        URL.revokeObjectURL(originalUrl)
      }
    },
    [selectedModel],
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

  const isProcessing = status === 'loading-model' || status === 'running'

  return (
    <div className="w-full p-5">
      <h1 className="mb-4 text-3xl">Depth Map Generator</h1>

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

      {/* Progress */}
      {isProcessing && (
        <div className="mb-6">
          <div className="flex justify-between text-[12px] text-slate-500 mb-1">
            <span>
              {status === 'loading-model' ? 'Downloading model…' : 'Running depth estimation…'}
            </span>
            <span>{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-1 rounded-full overflow-hidden bg-slate-800">
            <div
              className="h-full rounded-full transition-[width] duration-200 bg-gradient-to-r from-violet-500 to-fuchsia-300"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
        </div>
      )}

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
              label={`Depth Map · ${result.width}×${result.height}`}
              src={result.depthUrl}
            />
          </div>
          <a
            href={result.depthUrl}
            download={
              sourceFileName
                ? `depth_${sourceFileName.replace(/\.[^.]+$/, '')}.png`
                : 'depth_map.png'
            }
            className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 active:bg-violet-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download depth map
          </a>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Small helper
// ---------------------------------------------------------------------------

function ImagePanel({ label, src }: { label: string; src: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <img
        src={src}
        alt={label}
        className="block w-full rounded-lg object-contain border border-slate-800 bg-slate-950"
      />
    </div>
  )
}
