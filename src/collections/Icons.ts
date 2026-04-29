import type { CollectionConfig } from 'payload'
import path from 'path'
import { fileURLToPath } from 'url'
import { anyone } from '../access/anyone'
import { authenticated } from '../access/authenticated'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export const Icons: CollectionConfig = {
  slug: 'icons',
  access: {
    create: authenticated,
    delete: authenticated,
    read: anyone,
    update: authenticated,
  },
  fields: [
    {
      name: 'interactive',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        description: 'Strips hardcoded-fill and width/height from SVGs to make them CSS stylable',
      },
    },
  ],
  upload: {
    staticDir: path.resolve(dirname, '../../public/icons'),
    mimeTypes: ['image/svg+xml'],
    formatOptions: {
      format: 'svg',
    },
    adminThumbnail: 'thumbnail',
    focalPoint: false,
  },
  admin: {
    description: 'Upload SVG',
  },
}
