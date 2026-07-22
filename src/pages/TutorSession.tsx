import { useRef, useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { useParams, useNavigate } from 'react-router'
import { ArrowLeft, Send, Moon, Sun, Bot, User, AlertCircle, Loader2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useTutor, type Message } from '@/hooks/useTutor'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { exportConversation } from '@/lib/exportPDF'
import { cn } from '@/lib/utils'
import { useEffect as useEffectOnce, useState as useStateOnce } from 'react'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Button type="button" variant="ghost" size="icon" onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}>
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

function MessageBubble({ message, avatarUrl }: { message: Message; avatarUrl?: string }) {
  const isUser = message.role === 'user'
  const html = message.content
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')

  return (
    <div className={cn('flex items-start gap-3', isUser && 'flex-row-reverse')}>
      {isUser && avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="size-8 shrink-0 rounded-full object-cover" />
      ) : (
        <div className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
        )}>
          {isUser ? <User className="size-4" /> : <Bot className="size-4" />}
        </div>
      )}
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground',
          message.content === '' && 'min-w-[60px]',
        )}
        dangerouslySetInnerHTML={{ __html: html || '&nbsp;' }} // eslint-disable-line react/no-danger
      />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Bot className="size-4" />
      </div>
      <div className="rounded-2xl rounded-tl-sm bg-muted px-4 py-3">
        <div className="flex gap-1">
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:0ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:150ms]" />
          <span className="size-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  )
}

export default function TutorSession() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined

  const [topic, setTopic] = useStateOnce<string>('')
  useEffectOnce(() => {
    async function loadTopic() {
      const { data } = await supabase.from('sessions').select('topic').eq('id', id).single()
      if (data) setTopic((data as { topic: string }).topic)
      else void navigate('/')
    }
    void loadTopic()
  }, [id])

  const { messages, isLoading, error, sendMessage, initialized } = useTutor(id, topic)
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isStreaming = isLoading && messages[messages.length - 1]?.role === 'assistant'

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  function resizeTextarea() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void submit() }
  }

  async function submit() {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await sendMessage(text)
  }

  if (!topic) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-sm">
        <Button type="button" variant="ghost" size="icon" onClick={() => navigate('/')} aria-label="Volver al inicio">
          <ArrowLeft />
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Bot className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">{topic}</p>
            <p className="text-xs text-muted-foreground">{isStreaming ? 'Escribiendo…' : 'Tutor IA'}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => exportConversation(topic, messages)}
          aria-label="Descargar conversación como PDF"
          disabled={messages.length === 0}
        >
          <Download />
        </Button>
        <ThemeToggle />
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-2xl flex-col gap-4">
          {!initialized ? (
            <div className="flex justify-center pt-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} message={msg} avatarUrl={avatarUrl} />)
          )}
          {isLoading && !isStreaming && <TypingIndicator />}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />{error}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      <footer className="shrink-0 border-t border-border bg-background/80 px-4 py-4 backdrop-blur-sm">
        <form onSubmit={(e: FormEvent) => { e.preventDefault(); void submit() }}
          className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={textareaRef} rows={1} value={input}
            onChange={(e) => setInput(e.target.value)}
            onInput={resizeTextarea} onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..." disabled={isLoading || !initialized}
            className="flex-1 resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/50 disabled:opacity-50"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || isLoading || !initialized}
            className="shrink-0 rounded-xl" aria-label="Enviar">
            <Send />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Enter para enviar · Shift+Enter para nueva línea
        </p>
      </footer>
    </div>
  )
}
