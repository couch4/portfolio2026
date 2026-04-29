import { Field } from 'payload'
import { authenticated } from '@/access'

type MediaFieldProps = {
  captionBlock?: boolean
  initCollapsed?: boolean
  hideCaption?: (_, siblingData) => boolean
}

const MediaField = ({
  captionBlock = false,
  initCollapsed = true,
  hideCaption,
}: MediaFieldProps): Field => {
  let captionFields: Field[] = [
    {
      name: 'caption',
      type: 'textarea',
      admin: {
        className: 'caption',
      },
    },
  ]

  if (captionBlock) {
    captionFields = [
      {
        name: 'captionTitle',
        type: 'text',
        admin: {
          className: 'caption-title',
          condition: hideCaption,
        },
      },
      {
        name: 'captionDescription',
        type: 'textarea',
        admin: {
          className: 'caption-description',
          condition: hideCaption,
        },
      },
    ]
  }

  return {
    label: 'Media',
    type: 'collapsible',
    admin: {
      initCollapsed,
      className: 'no-padding ',
    },
    fields: [
      {
        name: 'media',
        label: '',
        type: 'group',
        fields: [
          {
            name: 'image',
            type: 'group',
            fields: [
              {
                name: 'imageUpload',
                type: 'upload',
                relationTo: 'media',
                displayPreview: true,
                filterOptions: {
                  mimeType: { contains: 'image' },
                },
                // full Image Object available in admin, but hidden in the API
                access: {
                  read: authenticated,
                },
              },
              ...captionFields,
              {
                name: 'src',
                type: 'text',
                admin: {
                  hidden: true,
                },
              },
              {
                name: 'alt',
                type: 'text',
                admin: {
                  hidden: true,
                },
              },
              {
                name: 'blurhash',
                type: 'text',
                admin: {
                  hidden: true,
                },
              },
              {
                name: 'id',
                type: 'text',
                admin: {
                  hidden: true,
                },
              },
            ],
            // @TODO - work this out
            // admin: {
            // className: hideCaption ? 'hide-captions' : '',

            // },
            hooks: {
              beforeChange: [
                async ({ value, req }) => {
                  if (!value?.imageUpload) return value

                  const media = await req.payload.findByID({
                    collection: 'media',
                    id: value.imageUpload,
                  })

                  if (!media) return value

                  return {
                    ...value,
                    src: media.url,
                    alt: media.alt,
                    blurhash: media.blurhash,
                    id: media.id,
                  }
                },
              ],
            },
          },
          {
            label: 'Add video? ',
            type: 'collapsible',
            admin: {
              initCollapsed: true,
            },
            fields: [
              {
                name: 'video',
                label: '',
                admin: {
                  description: 'Image will be used as a cover image',
                },
                type: 'group',
                fields: [
                  {
                    name: 'videoUpload',
                    type: 'upload',
                    relationTo: 'media',
                    filterOptions: {
                      mimeType: { contains: 'video' },
                    },
                    // full Video Object available in admin, but hidden in the API
                    access: {
                      read: authenticated,
                    },
                  },
                  {
                    name: 'autoPlay',
                    type: 'checkbox',
                  },
                  {
                    name: 'loop',
                    type: 'checkbox',
                  },
                  {
                    name: 'allowFullscreen',
                    type: 'checkbox',
                  },
                  {
                    name: 'allowControls',
                    type: 'checkbox',
                  },
                  {
                    name: 'allowSound',
                    type: 'checkbox',
                  },
                  {
                    name: 'src',
                    type: 'text',
                    admin: {
                      hidden: true,
                    },
                  },
                ],
                hooks: {
                  beforeChange: [
                    async ({ value, req }) => {
                      if (!value?.videoUpload) return value

                      const media = await req.payload.findByID({
                        collection: 'media',
                        id: value.videoUpload,
                      })

                      if (!media) return value

                      return {
                        ...value,
                        src: media.url,
                        id: media.id,
                      }
                    },
                  ],
                },
              },
            ],
          },
        ],
        admin: {
          className: 'column',
        },
      },
    ],
  }
}

export default MediaField
