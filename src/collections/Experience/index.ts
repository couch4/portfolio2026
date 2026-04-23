import type { CollectionConfig } from 'payload'

// collections/Experience.ts
export const Experience: CollectionConfig = {
  slug: 'experience',
  admin: {
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'company',
      type: 'text',
      required: true,
    },
    {
      name: 'startDate',
      type: 'date',
      required: true,
    },
    {
      name: 'endDate',
      type: 'date',
    },
    {
      name: 'current',
      type: 'checkbox',
      defaultValue: false,
    },
    {
      name: 'description',
      type: 'richText',
      admin: {
        description: 'Write naturally - what you did, achieved, learned',
      },
    },
    {
      name: 'achievements',
      type: 'array',
      fields: [
        {
          name: 'achievement',
          type: 'textarea',
        },
      ],
    },
    {
      name: 'technologies',
      type: 'relationship',
      relationTo: 'skills',
      hasMany: true,
    },
  ],
}
