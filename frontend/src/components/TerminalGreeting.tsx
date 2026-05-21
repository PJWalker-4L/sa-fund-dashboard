import { useEffect, useRef, useState } from 'react'

const SPEED = 36 // ms per character

// Module-level flag: resets on every full page reload, survives tab-switches
let _alreadyShown = false

function getMessage(): string {
  const h = new Date().getHours()
  if (h >= 5 && h < 12)
    return "Good morning Mr. Aschenbrenner. Good to see you back. Let's have a look at the KPIs. If you need anything, let me know!"
  if (h >= 12 && h < 18)
    return "Good afternoon Mr. Aschenbrenner. Good to see you back. Let's check what moved since this morning. If you need anything, let me know!"
  if (h >= 18 && h < 23)
    return "Good evening Mr. Aschenbrenner. Markets are closed — perfect time for a deep dive. If you need anything, let me know!"
  return "Working late again, Mr. Aschenbrenner. Let's see what the filings say. If you need anything, let me know!"
}

export default function TerminalGreeting() {
  const [active] = useState(() => {
    if (_alreadyShown) return false
    _alreadyShown = true
    return true
  })

  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const message = useRef(getMessage())

  useEffect(() => {
    if (!active) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setText(message.current.slice(0, i))
      if (i >= message.current.length) {
        clearInterval(timer)
        setDone(true)
      }
    }, SPEED)
    return () => clearInterval(timer)
  }, [active])

  if (!active) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      background: 'linear-gradient(0deg, rgba(1,6,16,0.97) 0%, rgba(1,6,16,0.85) 80%, transparent 100%)',
      padding: '22px 18px 12px',
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '0.02em',
      pointerEvents: 'none',
      zIndex: 4,
    }}>
      <span style={{
        color: 'var(--teal)',
        opacity: 0.5,
        userSelect: 'none',
        flexShrink: 0,
        fontSize: 10,
        letterSpacing: '0.1em',
      }}>
        SYS //
      </span>
      <span style={{ color: 'var(--text-1)', lineHeight: 1.5 }}>
        {text}
        <span style={{
          display: 'inline-block',
          width: '0.55em',
          height: '1.05em',
          background: 'var(--teal)',
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          animation: done ? 'cursor-blink 1.1s step-end infinite' : undefined,
        }} />
      </span>
    </div>
  )
}
