import path from 'path'
import type { StorybookConfig } from '@storybook/nextjs-vite'
import svgr from 'vite-plugin-svgr'

const SHIMS = path.resolve(process.cwd(), '.storybook/shims')

const config: StorybookConfig = {
  stories: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|mjs|ts|tsx)'],
  addons: [
    '@chromatic-com/storybook',
    '@storybook/addon-vitest',
    '@storybook/addon-a11y',
    '@storybook/addon-docs',
    'storybook-addon-grid-overlay',
  ],
  framework: '@storybook/nextjs-vite',
  staticDirs: ['../public'],
  viteFinal: async (config) => {
    config.plugins ??= []
    config.plugins.push(svgr())

    // Deduplicate packages that must be singletons in the WebGL pipeline.
    // pnpm's virtual store gives @react-three/postprocessing its own copy of
    // postprocessing/three, while bun put a separate real copy at the top level.
    // Two copies → EffectComposer's `instanceof Effect` check fails silently,
    // so effects are never added to the render pass.
    config.resolve ??= {}
    config.resolve.dedupe = [
      ...(config.resolve.dedupe ?? []),
      'three',
      'postprocessing',
      '@react-three/fiber',
      '@react-three/drei',
      '@react-three/postprocessing',
      'leva',
      'zustand',
    ]

    // leva@0.10.x uses default imports from zustand (`import create from 'zustand'`,
    // `import shallow from 'zustand/shallow'`) but zustand@5 only has named exports.
    // Shim files add a synthetic default export so both import styles resolve.
    // resolve.alias is applied before any bundler phase (esbuild or Rolldown),
    // making it the only approach that works across Vite 5–8.
    const existingAlias = Array.isArray(config.resolve.alias)
      ? config.resolve.alias
      : Object.entries(config.resolve.alias ?? {}).map(([find, replacement]) => ({
          find,
          replacement: replacement as string,
        }))
    // Also alias the physical nested zustand@3.7.2 that leva bundles in its own
    // node_modules — Vite pre-bundling resolves that path directly, bypassing the
    // bare-specifier alias above. Pointing both paths to the same shims ensures
    // a single zustand instance with a stable getSnapshot, eliminating the
    // "getSnapshot should be cached" / infinite-loop error in React 18.
    const levaZustand = path.resolve(process.cwd(), 'node_modules/leva/node_modules/zustand')
    config.resolve.alias = [
      ...existingAlias,
      { find: /^zustand\/shallow$/, replacement: path.join(SHIMS, 'zustand-shallow.mjs') },
      { find: /^zustand$/, replacement: path.join(SHIMS, 'zustand.mjs') },
      {
        find: new RegExp(`^${levaZustand.replace(/[/\\]/g, '[/\\\\]')}/shallow`),
        replacement: path.join(SHIMS, 'zustand-shallow.mjs'),
      },
      {
        find: new RegExp(`^${levaZustand.replace(/[/\\]/g, '[/\\\\]')}`),
        replacement: path.join(SHIMS, 'zustand.mjs'),
      },
    ]

    config.build ??= {}
    config.build.chunkSizeWarningLimit = 2000

    // Vite 8 / Rolldown worker threads don't terminate after build, causing
    // the process to hang. Force-exit once all bundles are closed.
    config.plugins.push({
      name: 'force-exit-after-build',
      apply: 'build',
      closeBundle: {
        order: 'post',
        sequential: true,
        handler() {
          setTimeout(() => process.exit(0), 500)
        },
      },
    })

    return config
  },
}
export default config
