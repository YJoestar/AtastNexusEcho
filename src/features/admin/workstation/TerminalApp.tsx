/**
 * NEXUS ECHO — NEXUS:// terminal window
 */
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { complete, runCommand, type LineTone, type TerminalContext, type TerminalLine } from './terminal'

const TONE: Record<LineTone, string> = {
  out: 'text-nexus-text',
  dim: 'text-nexus-textSubtle',
  ok: 'text-nexus-accent',
  warn: 'text-nexus-warning',
  err: 'text-nexus-danger',
  cmd: 'text-nexus-textMuted',
}

const GREETING: TerminalLine[] = [
  { text: 'NEXUS:// TERMINAL', tone: 'ok' },
  { text: 'Reads the same records as the other modules. Type help.', tone: 'dim' },
]

export function TerminalApp({ context }: { context: () => TerminalContext }) {
  const [lines, setLines] = useState<TerminalLine[]>(GREETING)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const history = useRef<string[]>([])
  const cursor = useRef(-1)
  const scroller = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { scroller.current?.scrollTo({ top: scroller.current.scrollHeight }) }, [lines, busy])
  useEffect(() => { inputRef.current?.focus() }, [])

  const submit = async () => {
    const command = input.trim()
    if (!command || busy) return
    history.current = [command, ...history.current].slice(0, 50)
    cursor.current = -1
    setInput('')
    setLines(current => [...current, { text: `NEXUS://> ${command}`, tone: 'cmd' }])
    setBusy(true)
    try {
      const result = await runCommand(command, context())
      setLines(current => (result.clear ? [] : [...current, ...result.lines]))
    } finally {
      setBusy(false)
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-black/40 font-mono text-[0.72rem] leading-relaxed" onClick={() => inputRef.current?.focus()}>
      <div ref={scroller} className="min-h-0 flex-1 overflow-auto px-3 py-2" role="log" aria-live="polite" aria-label="Terminal output">
        {lines.map((line, index) => (
          <p key={index} className={cn('whitespace-pre-wrap break-words', TONE[line.tone])}>{line.text || ' '}</p>
        ))}
        {busy && <p className="text-nexus-textSubtle">ACCESSING ARCHIVE…</p>}
      </div>
      <form
        className="flex items-center gap-2 border-t border-nexus-border px-3 py-2"
        onSubmit={event => { event.preventDefault(); void submit() }}
      >
        <label htmlFor="nexus-terminal-input" className="shrink-0 text-nexus-accent">NEXUS://&gt;</label>
        <input
          id="nexus-terminal-input"
          ref={inputRef}
          value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'ArrowUp') {
              event.preventDefault()
              cursor.current = Math.min(history.current.length - 1, cursor.current + 1)
              setInput(history.current[cursor.current] ?? '')
            } else if (event.key === 'ArrowDown') {
              event.preventDefault()
              cursor.current = Math.max(-1, cursor.current - 1)
              setInput(cursor.current === -1 ? '' : history.current[cursor.current] ?? '')
            } else if (event.key === 'Tab') {
              event.preventDefault()
              const options = complete(input)
              if (options.length === 1) setInput(options[0] + ' ')
              else if (options.length > 1) setLines(current => [...current, { text: options.join('   '), tone: 'dim' }])
            }
          }}
          spellCheck={false}
          autoComplete="off"
          autoCapitalize="off"
          aria-label="Command"
          className="min-w-0 flex-1 !border-0 !bg-transparent !p-0 !shadow-none !ring-0 text-nexus-text caret-nexus-accent focus:outline-none"
        />
      </form>
    </div>
  )
}
