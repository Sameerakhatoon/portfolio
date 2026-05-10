'use client'

import { useState } from 'react'
import { ChatPanel } from './chat-panel'
import { Kitten } from './kitten'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {!isOpen && <Kitten onClick={() => setIsOpen(true)} />}
      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
