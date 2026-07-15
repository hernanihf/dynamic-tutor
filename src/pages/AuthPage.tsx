import { useState, type FormEvent } from 'react'
import { Moon, Sun, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/hooks/useTheme'
import { useAuth } from '@/hooks/useAuth'

function ThemeToggle() {
  const { isDark, toggleTheme } = useTheme()
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activar modo claro' : 'Activar modo oscuro'}
      className="fixed top-4 right-4 rounded-full backdrop-blur-sm"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  )
}

export default function AuthPage() {
  const { signInWithEmail } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    try {
      await signInWithEmail(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar el enlace')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-background to-indigo-50 px-4 py-12 transition-colors duration-300 dark:from-slate-950 dark:via-background dark:to-indigo-950">
      <ThemeToggle />

      <main className="w-full max-w-sm text-center">
        <header className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            dynamic-tutor
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Aprende cualquier tema con un tutor impulsado por IA.
          </p>
        </header>

        {sent ? (
          <div className="rounded-xl border border-border bg-background p-6 text-center shadow-xs">
            <p className="text-sm font-medium text-foreground">¡Revisa tu email!</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Te enviamos un enlace mágico a <strong>{email}</strong>. Hacé clic en él para entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-left">
              <label htmlFor="email" className="mb-2 block text-sm font-medium text-foreground">
                Tu email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                autoFocus
                required
                className="w-full rounded-xl border border-input bg-background px-4 py-3.5 text-foreground placeholder:text-muted-foreground shadow-xs transition-colors focus:border-ring focus:outline-none focus:ring-[3px] focus:ring-ring/50"
              />
            </div>

            {error && (
              <p className="text-left text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              disabled={!email.trim() || loading}
              size="lg"
              className="w-full rounded-xl"
            >
              {loading && <Loader2 className="animate-spin" />}
              Entrar con magic link
            </Button>
          </form>
        )}
      </main>
    </div>
  )
}
