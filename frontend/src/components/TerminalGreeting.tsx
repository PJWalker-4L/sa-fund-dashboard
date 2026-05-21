import { useEffect, useRef, useState } from 'react'

const SPEED = 36 // ms per character

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
  const [shown] = useState(() => {
    if (typeof sessionStorage === 'undefined') return true
    if (sessionStorage.getItem('se_greeted')) return true
    sessionStorage.setItem('se_greeted', '1')
    return false
  })

  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const message = useRef(getMessage())
  const idx = useRef(0)

  useEffect(() => {
    if (shown) return
    const timer = setInterval(() => {
      idx.current++
      setText(message.current.slice(0, idx.current))
      if (idx.current >= message.current.length) {
        clearInterval(timer)
        setDone(true)
      }
    }, SPEED)
    return () => clearInterval(timer)
  }, [shown])

  if (shown) return null

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      background: 'var(--bg)',
      padding: '11px 16px',
      display: 'flex',
      alignItems: 'baseline',
      gap: 8,
      fontFamily: 'var(--mono)',
      fontSize: 11,
      letterSpacing: '0.02em',
      minHeight: 38,
    }}>
      {/* Prompt prefix */}
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

      {/* Typed text + cursor */}
      <span style={{ color: 'var(--text-2)', lineHeight: 1.5 }}>
        {text}
        <span style={{
          display: 'inline-block',
          width: '0.55em',
          height: '1.05em',
          background: done ? 'var(--teal)' : 'var(--teal)',
          opacity: done ? undefined : 0.9,
          marginLeft: 2,
          verticalAlign: 'text-bottom',
          animation: done ? 'cursor-blink 1.1s step-end infinite' : undefined,
        }} />
      </span>
    </div>
  )
}
