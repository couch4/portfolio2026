'use client'

import React from 'react'
import { Switch } from '@/components/ui'
import './Nav.css'

import type { Header as HeaderType } from '@/payload-types'

// mock nav items
const navItems = [
  {
    text: 'Home',
    href: '/',
  },
  {
    text: 'About',
    href: '/about',
  },
  {
    text: 'Work',
    href: '/work',
  },
  {
    text: 'Contact',
    href: '/contact',
  },
]

import { CMSLink } from '@/components/Link'
import Link from 'next/link'
import { SearchIcon } from 'lucide-react'
import { useSceneStore } from '@/store/sceneStore'

export const HeaderNav: React.FC<{ data: HeaderType }> = ({ data }) => {
  // const navItems = data?.navItems || mockNavItems
  const isDevView = useSceneStore((s) => s.isDevView)
  const setIsDevView = useSceneStore((s) => s.setIsDevView)

  const handleViewSwitch = (checked: boolean) => {
    setIsDevView(checked)
  }

  return (
    <nav className="nav__wrapper">
      {navItems.map(({ text, href }, i) => {
        return (
          <Link key={i} href={href} className="nav__item">
            {text}
          </Link>
        )
      })}
      <Switch onSwitch={handleViewSwitch} value={isDevView} />
    </nav>
  )
}
