import type { Field } from 'payload'
import Switch from '@/fields/Switch'

const ChooseAlignment = (): Field[] => [
  {
    name: 'align',
    type: 'text',
    hooks: {
      beforeChange: [
        async ({ siblingData }) => {
          return siblingData?.switchAlign ? 'right' : 'left'
        },
      ],
    },
    admin: {
      hidden: true,
      custom: {
        label: 'Alignmnent',
      },
    },
  },
  Switch({ labels: ['left', 'right'], switchName: 'switchAlign', customLabel: 'Alignment' }),
]

export default ChooseAlignment
