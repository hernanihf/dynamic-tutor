# dynamic-tutor

Tutor interactivo impulsado por IA. Aprende cualquier tema con respuestas en streaming de Claude.

## Stack

- React 19 + TypeScript + Vite + Tailwind CSS v4
- Anthropic Claude claude-sonnet-4-6 (streaming)
- Supabase (auth con magic link + persistencia de sesiones)

## Setup local

1. Cloná el repo e instalá dependencias:
   ```bash
   npm install
   ```

2. Creá `.env.local` con tus claves:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   VITE_SUPABASE_URL=https://<project>.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. Corré el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## CI/CD

Las migraciones de Supabase se aplican automáticamente al pushear a `main` si hay cambios en `supabase/migrations/`.

Configurá estos secrets en el repo de GitHub:
- `SUPABASE_ACCESS_TOKEN` — token de la CLI de Supabase
- `SUPABASE_PROJECT_REF` — ID del proyecto (`toiqubpfsyyczwxuwylh`)
