import type { CollectionConfig } from 'payload'

export const Projects: CollectionConfig = {
  slug: 'projects',
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'richText',
    },
    {
      name: 'role',
      type: 'text',
      admin: {
        description: 'Your specific role on this project',
      },
    },
    {
      name: 'impact',
      type: 'textarea',
      admin: {
        description: 'Metrics, outcomes, what you achieved',
      },
    },
    {
      name: 'technologies',
      type: 'relationship',
      relationTo: 'skills',
      hasMany: true,
    },
    {
      name: 'teamSize',
      type: 'number',
    },
    {
      name: 'url',
      type: 'text',
    },
    {
      name: 'featured',
      type: 'checkbox',
      defaultValue: false,
    },
  ],
}
