// plugins/llmExport.ts
import { Plugin } from 'payload/config'

export const llmExportPlugin = (): Plugin => (config) => {
  return {
    ...config,
    collections: config.collections?.map((collection) => ({
      ...collection,
      fields: [
        ...collection.fields,
        {
          name: 'llmContext',
          type: 'textarea',
          admin: {
            position: 'sidebar',
            description: 'Additional context for AI responses',
          },
        },
      ],
    })),
    hooks: {
      ...config.hooks,
      afterChange: [
        async ({ doc, collection }) => {
          // Trigger vector DB update when content changes
          await updateVectorDB(collection.slug, doc)
        },
      ],
    },
  }
}
