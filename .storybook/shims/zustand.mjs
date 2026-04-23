// Adds a synthetic default export so leva@0.10.x (which does
// `import create from 'zustand'`) works with zustand@5.
export * from '../../node_modules/zustand/esm/index.mjs'
export { create as default } from '../../node_modules/zustand/esm/index.mjs'
