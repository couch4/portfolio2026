// payload.config.ts
// @ts-nocheck
import { buildConfig } from 'payload'

export default buildConfig({
  // ... your config
  endpoints: [
    {
      path: '/llm-context',
      method: 'get',
      handler: async (req, res) => {
        const skills = await req.payload.find({
          collection: 'skills',
          limit: 1000,
        })

        const experience = await req.payload.find({
          collection: 'experience',
          limit: 1000,
          sort: '-startDate',
        })

        const projects = await req.payload.find({
          collection: 'projects',
          limit: 1000,
        })

        // Format for LLM - human-readable chunks
        const formatted = {
          summary: generateSummary(skills.docs, experience.docs),
          skillsByCategory: formatSkillsByCategory(skills.docs),
          timeline: formatTimeline(experience.docs),
          projects: formatProjects(projects.docs),
          rawData: {
            skills: skills.docs,
            experience: experience.docs,
            projects: projects.docs,
          },
        }

        res.json(formatted)
      },
    },
    {
      path: '/llm-chunks',
      method: 'get',
      handler: async (req, res) => {
        // Pre-chunked text for embedding
        const chunks = await generateTextChunks(req.payload)
        res.json({ chunks })
      },
    },
  ],
})
