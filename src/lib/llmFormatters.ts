// @ts-nocheck

import payload from 'payload'

function generateTextChunks(payload) {
  const chunks = []

  // Chunk 1: Skills overview
  chunks.push({
    type: 'skills_summary',
    text: `Jon Couch has ${skills.length} technical skills across frontend, backend, and devops...`,
    metadata: { category: 'skills' },
  })

  // Chunk 2-N: Each skill in detail
  skills.forEach((skill) => {
    chunks.push({
      type: 'skill_detail',
      text: `${skill.name}: Jon has ${skill.yearsExperience} years of experience with ${skill.name}, 
             rating his proficiency at ${skill.proficiency}/10. ${skill.context}`,
      metadata: {
        skill: skill.name,
        proficiency: skill.proficiency,
        category: skill.category,
      },
    })
  })

  // Experience chunks
  experience.forEach((exp) => {
    chunks.push({
      type: 'experience',
      text: `At ${exp.company} as ${exp.title} (${formatDate(exp.startDate)} - ${exp.endDate ? formatDate(exp.endDate) : 'present'}):
             ${exp.description}
             Key achievements: ${exp.achievements.join(', ')}`,
      metadata: { company: exp.company, role: exp.title },
    })
  })

  return chunks
}
