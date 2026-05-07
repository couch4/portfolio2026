import { FC } from 'react'
import { Button, Motion } from '@/components/waywardUI'
import Stats from './Stats'
import { fadeInDelay } from '@/styles/motion'
import SkillPill from '@/components/SkillPill'
import { ArrowUpRight } from 'lucide-react'

interface InfoProps {
  data: {
    align: 'left' | 'right'
    skills: any[]
    stats: any[]
    links: any[]
  }
}

const Info: FC<InfoProps> = ({ data }) => {
  const { align, skills, stats, links } = data

  const renderSkills = skills.map((skill, index) => {
    return <SkillPill key={`skill=${index}`} data={skill} />
  })

  const renderLinks = links.map((link, index) => {
    return (
      <Button key={`link=${index}`} href={link.url} icons={{ iconAfter: <ArrowUpRight /> }}>
        {link.label}
      </Button>
    )
  })

  return (
    <Motion
      data-align={align}
      className="project-details__info"
      {...fadeInDelay(0.5)}
      initial="inactive"
      animate="active"
      exit="exit"
    >
      <Stats data={stats} align={align} />
      <Motion data-align={align} className="project-details__skills">
        {renderSkills}
      </Motion>
      <Motion className="project-details__links">{renderLinks}</Motion>
    </Motion>
  )
}

export default Info
