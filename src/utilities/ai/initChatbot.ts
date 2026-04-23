export async function initChatbot() {
  // Fetch formatted data
  const response = await fetch('https://your-payload-api.com/api/llm-chunks')
  const { chunks } = await response.json()

  // Embed and store locally
  const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2')

  const vectorDB = []
  for (const chunk of chunks) {
    // @ts-ignore
    const embedding = await embedder(chunk.text || 'oops')
    vectorDB.push({
      text: chunk.text,
      embedding: embedding.data,
      metadata: chunk.metadata,
    })
  }

  // Store in IndexedDB
  await saveToIndexedDB('jon-couch-context', vectorDB)
}

function saveToIndexedDB(arg0: string, vectorDB: { text: any; embedding: any; metadata: any }[]) {
  throw new Error('Function not implemented.')
}

async function pipeline(arg0: string, arg1: string) {
  throw new Error('Function not implemented.')
}
