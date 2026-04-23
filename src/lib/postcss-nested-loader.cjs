// Pre-loader: runs postcss-nested before Next.js's PostCSS pipeline.
// Mirrors the resolveStylesReference Vite plugin pattern — a separate pass
// so nested BEM expansion is complete before @tailwindcss/postcss sees the file.
const postcss = require('postcss')
const nested = require('postcss-nested')

const processor = postcss([nested()])

module.exports = function postcssNestedLoader(source) {
  if (!source.includes('@reference') && !source.includes('&-')) return source

  const callback = this.async()
  const id = this.resourcePath

  // Strip @reference temporarily so postcss-nested expands &- selectors
  const refs = []
  const stripped = source.replace(/@reference\s+['"][^'"]*['"]\s*;?/g, (match) => {
    refs.push(match)
    return ''
  })

  processor
    .process(stripped, { from: id })
    .then((result) => {
      const restored = refs.join('\n') + (refs.length ? '\n' : '') + result.css
      callback(null, restored)
    })
    .catch(callback)
}
