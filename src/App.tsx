import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Moon, Sun, MessageSquare, Trash2, Clock, LogOut, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'
import { supabase, type Session } from '@/lib/supabase'
import AuthPage from '@/pages/AuthPage'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="rounded-full backdrop-blur-sm"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'ahora mismo'
  if (mins < 60) return `hace ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `hace ${hrs} h`
  return `hace ${Math.floor(hrs / 24)} d`
}

function SessionCard({
  session,
  onOpen,
  onDelete,
}: {
  session: Session
  onOpen: () => void
  onDelete: () => void
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background p-4 text-left transition-colors hover:border-ring/50 hover:bg-accent/30 focus:outline-none focus:ring-[3px] focus:ring-ring/50"
    >
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <MessageSquare className="size-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold text-foreground">{session.topic}</p>
          <div className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {timeAgo(session.updated_at)}
          </div>
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => { e.stopPropagation(); onDelete() }}
        aria-label="Eliminar sesión"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

function Home() {
  const { user, signOut } = useAuth()
  const [topic, setTopic] = useState('')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    async function loadSessions() {
      const { data } = await supabase
        .from('sessions')
        .select('*')
        .order('updated_at', { ascending: false })
      setSessions((data as Session[]) ?? [])
      setLoadingSessions(false)
    }
    void loadSessions()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!topic.trim()) return
    const { data, error } = await supabase
      .from('sessions')
      .insert({ topic: topic.trim(), user_id: user!.id })
      .select()
      .single()
    if (!error && data) void navigate(`/session/${(data as Session).id}`)
  }

  async function handleDelete(id: string) {
    await supabase.from('sessions').delete().eq('id', id)
    setSessions((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-background to-indigo-50 px-4 py-12 transition-colors duration-300 dark:from-slate-950 dark:via-background dark:to-indigo-950">
      <div className="fixed top-4 right-4 flex items-center gap-2">
        <ThemeToggle />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => void signOut()}
          aria-label="Cerrar sesión"
          className="rounded-full backdrop-blur-sm"
        >
          <LogOut />
        </Button>
        {user?.user_metadata?.avatar_url && (
          <img
            src={user.user_metadata.avatar_url as string}
            alt={user.user_metadata.full_name as string ?? 'Avatar'}
            className="size-9 rounded-full border border-border object-cover"
          />
        )}
      </div>

      <main className="w-full max-w-lg">
        <header className="mb-10 text-center">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            dynamic-tutor
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Aprende cualquier tema con un tutor interactivo impulsado por IA.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <label htmlFor="topic" className="mb-2 block text-sm font-medium text-foreground">
              ¿Qué quieres aprender hoy?
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ej: derivadas, historia de Roma, React hooks..."
              autoFocus
              className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-foreground placeholder:text-muted-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/50"
            />
          </div>
          <Button type="submit" disabled={!topic.trim()} size="lg" className="w-full rounded-xl">
            Nueva sesión
          </Button>
        </form>

        {loadingSessions ? (
          <div className="mt-10 flex justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : sessions.length > 0 ? (
          <section className="mt-10">
            <h2 className="mb-3 text-sm font-medium text-muted-foreground">Sesiones anteriores</h2>
            <div className="flex flex-col gap-2">
              {sessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  onOpen={() => void navigate(`/session/${s.id}`)}
                  onDelete={() => void handleDelete(s.id)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return user ? <Home /> : <AuthPage />
}
