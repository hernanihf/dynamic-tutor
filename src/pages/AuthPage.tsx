import { useState } from 'react'
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

export default function AuthPage() {
  const { signInWithGoogle } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGoogleSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-background to-indigo-50 px-4 py-12 transition-colors duration-300 dark:from-slate-950 dark:via-background dark:to-indigo-950">
      <ThemeToggle />

      <main className="w-full max-w-sm text-center">
        <header className="mb-10">
          <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            AI-Tutor
          </h1>
          <p className="mt-4 text-lg text-muted-foreground whitespace-nowrap">
            Aprende cualquier tema con un tutor impulsado por IA.
          </p>
        </header>

        <div className="space-y-4">
          <Button
            onClick={() => void handleGoogleSignIn()}
            disabled={loading}
            size="lg"
            variant="outline"
            className="w-full rounded-xl gap-3"
          >
            {loading ? <Loader2 className="animate-spin" /> : <GoogleIcon />}
            Continuar con Google
          </Button>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </main>
    </div>
  )
}
