import { useEffect, useRef, useState } from 'react'

const SPEED = 36

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

const SESSION_KEY = 'se_greeted'

export default function TerminalGreeting() {
  const [active] = useState(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return false
    sessionStorage.setItem(SESSION_KEY, '1')
    return true
  })

  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const [visible, setVisible] = useState(true)
  const full = useRef(getMessage())

  useEffect(() => {
    if (!active) return
    let i = 0
    const timer = setInterval(() => {
      i++
      setText(full.current.slice(0, i))
      if (i >= full.current.length) {
        clearInterval(timer)
        setDone(true)
      }
    }, SPEED)
    return () => clearInterval(timer)
  }, [active])

  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [done])

  if (!active) return null

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
      background: 'linear-gradient(to top, rgba(1,6,16,0.96) 0%, rgba(1,6,16,0.7) 60%, transparent 100%)',
      padding: '28px 18px 14px',
      pointerEvents: 'none',
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.4s ease',
    }}>
      <div style={{
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '0.02em',
        display: 'flex',
        alignItems: 'baseline',
        gap: 8,
      }}>
        <span style={{ color: 'var(--teal)', opacity: 0.55, flexShrink: 0, fontSize: 10, letterSpacing: '0.1em', userSelect: 'none' }}>
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
    </div>
  )
}
