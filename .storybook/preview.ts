import React from 'react'
import type { Preview, Decorator } from '@storybook/nextjs-vite'
import '../src/styles/globals.css'
import { RendererContext } from '../src/components/Three/RendererContext'

const withRendererContext: Decorator = (Story, { globals }) =>
  React.createElement(
    RendererContext.Provider,
    { value: globals['renderer'] ?? 'webgl' },
    React.createElement(Story),
  )

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
      defaultValue: 'true',
      toolbar: {
        icon: 'graphbar',
        items: [
          { value: 'true', title: 'Stats On' },
          { value: 'false', title: 'Stats Off' },
        ],
        // dynamicTitle: true,
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
  },
}

export default preview
