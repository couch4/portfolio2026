import React from 'react'
import type { Preview, Decorator } from '@storybook/nextjs-vite'
import '../src/styles/globals.css'
import config from '../tailwind.config.mjs'
import { fontImports } from '../src/styles/fonts'
import { RendererContext } from '../src/components/Three/RendererContext'

const { screens = {} }: any = config?.theme?.extend || {}
const viewports = Object.fromEntries(
  [...Object.entries(screens), ['full', '100vw']].map(([key, value]) => [
    key,
    {
      name: key,
      styles: {
        width: value as string,
        height: '100%',
      },
    },
  ]),
)

const withRendererContext: Decorator = (Story, { globals }) => {
  return (
    <RendererContext.Provider value={globals['renderer'] ?? 'webgl'}>
      <div className={fontImports}>
        <Story />
      </div>
    </RendererContext.Provider>
  )
}

const preview: Preview = {
  globalTypes: {
    renderer: {
      name: 'Renderer',
      description: 'R3F renderer backend',
      defaultValue: 'webgl',
      toolbar: {
        icon: 'cpu',
        items: [
          { value: 'webgl', title: 'WebGL2' },
          { value: 'webgpu', title: 'WebGPU' },
        ],
        dynamicTitle: true,
      },
    },
    stats: {
      name: 'Show Stats',
      description: 'perf stats overlay',
      defaultValue: false,
      toolbar: {
        icon: 'graphbar',
        items: [
          { value: true, title: 'Stats On' },
          { value: false, title: 'Stats Off' },
        ] as any,
        dynamicTitle: true,
      },
    },
    orbit: {
      name: 'Show Orbit Controls',
      description: 'Show orbit controls',
      defaultValue: false,
      toolbar: {
        icon: 'camera',
        items: [
          { value: true, title: 'Orbit On' },
          { value: false, title: 'Orbit Off' },
        ] as any,
        dynamicTitle: true,
      },
    },
  },
  decorators: [withRendererContext],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: 'todo',
    },
    viewport: { options: viewports },
    gridOverlay: {
      columns: 'var(--columns)',
      gutter: 'var(--gutter)',
      gap: 'var(--gap)',
      color: 'rgba(102, 51, 170, 0.2)',
      maxWidth: 'var(--maxWidth)',
    },
  },
}

export default preview
