import type { CollectionConfig } from 'payload'

export const Skills: CollectionConfig = {
  slug: 'skills',
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
      name: 'category',
      type: 'select',
      options: [
        { label: 'Frontend', value: 'frontend' },
        { label: 'Backend', value: 'backend' },
        { label: 'DevOps', value: 'devops' },
        { label: 'Design', value: 'design' },
      ],
    },
    {
      name: 'proficiency',
      type: 'number',
      min: 1,
      max: 10,
      required: true,
    },
    {
      name: 'yearsExperience',
      type: 'number',
      required: true,
    },
    {
      name: 'firstUsed',
      type: 'date',
      admin: {
        description: 'When you first started using this',
      },
    },
    {
      name: 'lastUsed',
      type: 'date',
      admin: {
        description: 'Most recent project',
      },
    },
    {
      name: 'context',
      type: 'richText',
      admin: {
        description: "How/where you've used this - be specific for better LLM responses",
      },
    },
    {
      name: 'projects',
      type: 'relationship',
      relationTo: 'projects',
      hasMany: true,
    },
  ],
}
