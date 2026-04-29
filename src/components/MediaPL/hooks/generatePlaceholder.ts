import sharp from 'sharp'
import { CollectionAfterChangeHook } from 'payload'

export const generateBlurPlaceholder: CollectionAfterChangeHook = async ({
  doc,
  req,
  operation,
}) => {
  if (!doc.filename || !doc.mimeType?.startsWith('image/') || doc.blurDataURL) {
    return doc
  }

  try {
    const fullUrl = doc.url.startsWith('http')
      ? doc.url
      : `${process.env.NEXT_PUBLIC_SERVER_URL}${doc.url}`

    const imageBuffer = await fetch(fullUrl)
      .then((res) => res.arrayBuffer())
      .then(Buffer.from)

    const blurBuffer = await sharp(imageBuffer)
      .resize(10, 10, { fit: 'inside' })
      .blur(1)
      .png({ quality: 20 })
      .toBuffer()

    const base64 = `data:image/png;base64,${blurBuffer.toString('base64')}`

    // Delay update to avoid hook recursion
    setTimeout(async () => {
      await req.payload.update({
        collection: 'media',
        id: doc.id,
        data: { blurDataURL: base64 } as any,
      })
    }, 100)

    return doc
  } catch (err: any) {
    req.payload.logger.error(`Blur generation failed: ${err.message}`)
    return doc
  }
}
