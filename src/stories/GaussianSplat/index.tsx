'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { CameraControls } from '@react-three/drei'
import type { SplatMesh } from '@sparkjsdev/spark'
import type { DepthModelId, DepthMapResult } from '../../utilities/createDepthMap'
import Canvas from '@/components/Three/Canvas'
import { GaussianSplatViewer } from '@/components/Three/GaussianSplatViewer'
import { Fake3DShaderView } from '@/components/Three/Fake3DShaderView'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'idle' | 'loading-model' | 'running' | 'building-splat' | 'done' | 'error'

interface DepthResultState {
  originalUrl: string
  depthUrl: string
  depth: Pick<DepthMapResult, 'depthValues' | 'width' | 'height'>
}

const MODELS: { id: DepthModelId; label: string; note: string }[] = [
  {
    id: 'Xenova/depth-anything-base-hf',
    label: 'Depth Anything — Base',
    note: '~390 MB · better quality',
  },
]

const STATUS_LABEL: Record<Status, string> = {
  idle: '',
  'loading-model': 'Downloading depth model…',
  running: 'Running depth estimation…',
  'building-splat': 'Building Gaussian Splat…',
  done: '',
  error: '',
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface GaussianSplatGeneratorProps {
  /**
   * Max Z displacement for the splat cloud / parallax strength for shader mode.
   * Splat: white=+depthScale, black=−depthScale (rebuilds on change).
   * Shader: controls mouse parallax intensity. @default 2
   */
  depthScale?: number
  /** Gaussian covariance blur — larger = bigger, softer splats. @default 0.3 */
  splatSize?: number
  /** Which 3D view to display. @default 'splat' */
  viewMode?: 'splat' | 'shader' | 'both'
  /** Whether to display performance stats. @default true */
  stats?: boolean
  /** The WebGL renderer backend to use. @default 'webgl' */
  gl?: string
}

export function GaussianSplatGenerator(props: GaussianSplatGeneratorProps) {
  const { depthScale = 2, splatSize = 0.3, viewMode = 'splat', stats, gl } = props

  const [status, setStatus] = useState<Status>('idle')
  const [progress, setProgress] = useState(0)
  const [depthResult, setDepthResult] = useState<DepthResultState | null>(null)
  const [splatMesh, setSplatMesh] = useState<SplatMesh | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedModel] = useState<DepthModelId>(MODELS[0].id)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const prevDepthUrl = useRef<string | null>(null)
  const prevOriginalUrl = useRef<string | null>(null)
  const prevSplatDispose = useRef<(() => void) | null>(null)
  const rebuildTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Dispose splat on unmount
  useEffect(() => {
    return () => {
      prevSplatDispose.current?.()
      if (rebuildTimer.current) clearTimeout(rebuildTimer.current)
    }
  }, [])

  // Rebuild splat whenever depthResult or depthScale changes (debounced 300ms)
  useEffect(() => {
    if (!depthResult) return

    if (rebuildTimer.current) clearTimeout(rebuildTimer.current)

    rebuildTimer.current = setTimeout(async () => {
      setStatus('building-splat')

      try {
        const { createGaussianSplat } = await import('../../utilities/createGaussianSplat')
        const result = await createGaussianSplat({
          originalUrl: depthResult.originalUrl,
          depth: depthResult.depth,
          depthScale,
        })
        // Dispose old mesh only once the new one is ready, then swap atomically.
        // Never set splatMesh→null here so the Canvas stays mounted during rebuild.
        prevSplatDispose.current?.()
        prevSplatDispose.current = result.dispose
        setSplatMesh(result.splatMesh)
        setStatus('done')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to build splat.')
        setStatus('error')
      }
    }, 300)

    return () => {
      if (rebuildTimer.current) clearTimeout(rebuildTimer.current)
    }
  }, [depthResult, depthScale])

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please upload an image file.')
        return
      }

      // Tear down previous results
      if (prevDepthUrl.current) URL.revokeObjectURL(prevDepthUrl.current)
      if (prevOriginalUrl.current) URL.revokeObjectURL(prevOriginalUrl.current)
      prevSplatDispose.current?.()
      prevSplatDispose.current = null
      if (rebuildTimer.current) clearTimeout(rebuildTimer.current)

      setError(null)
      setDepthResult(null)
      setSplatMesh(null)
      setProgress(0)
      setStatus('loading-model')

      const originalUrl = URL.createObjectURL(file)
      prevOriginalUrl.current = originalUrl

      try {
        const { createDepthMap } = await import('../../utilities/createDepthMap')

        setStatus('running')

        const depth = await createDepthMap(file, {
          model: selectedModel,
          onProgress: (p) => setProgress(p),
        })

        prevDepthUrl.current = depth.url

        // Setting depthResult triggers the rebuild useEffect above
        setDepthResult({
          originalUrl,
          depthUrl: depth.url,
          depth: {
            depthValues: depth.depthValues,
            width: depth.width,
            height: depth.height,
          },
        })
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

  const isProcessing =
    status === 'loading-model' || status === 'running' || status === 'building-splat'

  return (
    <div className="w-full p-5">
      <h1 className="mb-2 text-3xl">Gaussian Splat Generator</h1>
      <p className="mb-6 text-sm text-slate-400">
        Upload an image to generate a depth map, then visualise it as a 3D Gaussian Splat scene.
      </p>

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
        } ${isProcessing ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
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
            <span>{STATUS_LABEL[status]}</span>
            {progress > 0 && <span>{Math.round(progress * 100)}%</span>}
          </div>
          <div className="h-1 rounded-full overflow-hidden bg-slate-800">
            <div
              className={`h-full rounded-full transition-[width] duration-200 ${
                status === 'building-splat'
                  ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 animate-pulse'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-300'
              }`}
              style={{ width: progress > 0 ? `${Math.round(progress * 100)}%` : '100%' }}
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

      {/* Depth map previews */}
      {depthResult && (
        <div className="grid grid-cols-1 gap-4 mb-4 md:grid-cols-2">
          <ImagePanel label="Original" src={depthResult.originalUrl} />
          <ImagePanel
            label={`Depth Map · ${depthResult.depth.width}×${depthResult.depth.height}`}
            src={depthResult.depthUrl}
          />
        </div>
      )}

      {/* 3D viewer — shown as soon as depthResult is ready */}
      {depthResult && (
        <div className="rounded-xl overflow-hidden border border-slate-800" style={{ height: 480 }}>
          {/* @ts-ignore */}
          <Canvas stats={stats} gl={gl} shadows>
            {viewMode === 'both' ? (
              <>
                {/* Shader plane sits at the same origin as the splat cloud.
                    depthWrite=false on its material lets Spark sort splats
                    correctly on both sides of z=0. */}
                <Fake3DShaderView
                  originalUrl={depthResult.originalUrl}
                  depthUrl={depthResult.depthUrl}
                  depthScale={depthScale}
                  aspect={depthResult.depth.width / depthResult.depth.height}
                />
                {splatMesh && <GaussianSplatViewer splatMesh={splatMesh} splatSize={splatSize} />}
              </>
            ) : viewMode === 'shader' ? (
              <Fake3DShaderView
                originalUrl={depthResult.originalUrl}
                depthUrl={depthResult.depthUrl}
                depthScale={depthScale}
                aspect={depthResult.depth.width / depthResult.depth.height}
              />
            ) : (
              splatMesh && <GaussianSplatViewer splatMesh={splatMesh} splatSize={splatSize} />
            )}
            <CameraControls makeDefault />
          </Canvas>
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
