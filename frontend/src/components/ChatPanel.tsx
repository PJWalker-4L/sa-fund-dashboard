import { useState, useRef, useEffect } from 'react'
import { sendChatMessage } from '../api'
import type { ChatMessage } from '../types'

const MODELS = [
  { value: 'groq/llama-3.1-8b-instant',    label: 'Groq · Llama 8B (schnell)' },
  { value: 'groq/llama-3.3-70b-versatile', label: 'Groq · Llama 70B (stark)' },
  { value: 'anthropic/claude-haiku-4-5-20251001', label: 'Anthropic · Haiku (günstig)' },
  { value: 'anthropic/claude-sonnet-4-6',  label: 'Anthropic · Sonnet (stark)' },
]

const SUGGESTIONS = [
  'Welche Power-Positionen wurden dieses Quartal aufgebaut?',
  'Warum hält SA Intel statt Nvidia?',
  'Wie hoch ist das Exposure im AI Infrastructure Layer?',
]

interface Props {
  onClose: () => void
}

export default function ChatPanel({ onClose }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [model, setModel] = useState(MODELS[1].value)
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || isLoading) return
    const userMsg: ChatMessage = { role: 'user', content }
    const history = messages
    const nextMessages = [...history, userMsg]
    setMessages(nextMessages)
    setInput('')
    setIsLoading(true)
    inputRef.current?.focus()

    try {
      const data = await sendChatMessage(content, history, model)
      setMessages([...nextMessages, { role: 'assistant', content: data.response }])
    } catch (e) {
      setMessages([...nextMessages, { role: 'assistant', content: `Fehler: ${String(e)}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{
      width: 320,
      minWidth: 320,
      borderRight: '1px solid var(--border)',
      background: 'var(--surface)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
      }}>
        <span style={{
          fontSize: 11, fontWeight: 700, letterSpacing: '0.08em',
          textTransform: 'uppercase', color: 'var(--blue)',
        }}>
          Portfolio Chat
        </span>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 15 }}
        >
          ✕
        </button>
      </div>

      {/* Model selector */}
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
        <select
          value={model}
          onChange={e => setModel(e.target.value)}
          style={{
            width: '100%', fontSize: 11,
            background: 'var(--bg)', color: 'var(--text-1)',
            border: '1px solid var(--border)', borderRadius: 3,
            padding: '4px 8px', cursor: 'pointer',
          }}
        >
          {MODELS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {messages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            <div style={{ color: 'var(--text-3)', fontSize: 11, textAlign: 'center', marginBottom: 4 }}>
              Frag das Portfolio — z.B.:
            </div>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => send(s)}
                style={{
                  background: 'var(--bg)', border: '1px solid var(--border)',
                  borderRadius: 6, padding: '7px 10px', cursor: 'pointer',
                  color: 'var(--text-2)', fontSize: 11, textAlign: 'left',
                  lineHeight: 1.4,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%',
              background: m.role === 'user' ? 'var(--blue)' : 'var(--bg)',
              color: m.role === 'user' ? '#fff' : 'var(--text-1)',
              borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
              border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
              padding: '8px 12px',
              fontSize: 12,
              lineHeight: 1.55,
              whiteSpace: 'pre-wrap',
            }}
          >
            {m.content}
          </div>
        ))}

        {isLoading && (
          <div
            className="pulse"
            style={{
              alignSelf: 'flex-start',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: '10px 10px 10px 2px',
              padding: '8px 12px',
              fontSize: 12,
              color: 'var(--text-3)',
            }}
          >
            Analysiert…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 14px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Frage zum Portfolio…"
            disabled={isLoading}
            style={{
              flex: 1, fontSize: 12,
              background: 'var(--bg)', color: 'var(--text-1)',
              border: '1px solid var(--border)', borderRadius: 4,
              padding: '6px 10px', outline: 'none',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || isLoading}
            style={{
              padding: '6px 12px', fontSize: 13, fontWeight: 600,
              background: 'var(--blue)', color: '#fff',
              border: 'none', borderRadius: 4, cursor: 'pointer',
              opacity: (!input.trim() || isLoading) ? 0.35 : 1,
              transition: 'opacity 0.15s',
            }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
