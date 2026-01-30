'use client'

import * as React from 'react'
import { FC, ReactNode } from 'react'

import Footer from './Footer'
import Header from './Header'

interface Props {
  children: ReactNode
}
const Layout: FC<Props> = ({ children, lang = 'en' }) => {
  return (
    <>
      <div className="bg-gypsum overflow-hidden flex flex-col min-h-screen">
        <Header lang={lang} />
        <main role="main">{children}</main>
        <Footer lang={lang} />
      </div>
    </>
  )
}

export default Layout
