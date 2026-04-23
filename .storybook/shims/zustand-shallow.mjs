// Adds a synthetic default export so leva@0.10.x (which does
// `import shallow from 'zustand/shallow'`) works with zustand@5.
export * from '../../node_modules/zustand/esm/shallow.mjs'
export { shallow as default } from '../../node_modules/zustand/esm/shallow.mjs'
