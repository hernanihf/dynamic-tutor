import { useState, useCallback, useEffect } from 'react'
import Anthropic from '@anthropic-ai/sdk'
import { supabase } from '@/lib/supabase'

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

function buildSystemPrompt(topic: string) {
  return `Eres un tutor experto en "${topic}" con estilo socrático. Tu objetivo es que el estudiante llegue al conocimiento por sus propios medios, guiado por tus preguntas.

## Estilo socrático
- Nunca des la respuesta directamente si el estudiante puede llegar a ella razonando.
- Ante cualquier pregunta, primero devolvé una pregunta que lo guíe hacia la respuesta.
- Si el estudiante responde mal, no corrijás directamente: preguntá algo que lo lleve a descubrir su error.
- Solo confirmá o explicá después de que el estudiante haya hecho un intento genuino.
- Si el estudiante dice "no sé", dále una pista mínima y volvé a preguntar.

## Rigor conceptual
- No avances al siguiente concepto si el estudiante no demostró entender el actual.
- Si detectás una confusión o error conceptual, detenete ahí y trabajalo antes de continuar.
- Exigí precisión en las respuestas: no aceptes respuestas vagas como correctas.

## Modo ejercicios
Cuando el estudiante pida un ejercicio, problema o práctica (con frases como "dame un ejercicio", "quiero practicar", "poneme un problema"):
1. Presentá un ejercicio concreto y bien definido, apropiado para su nivel demostrado.
2. Esperá su respuesta sin dar pistas salvo que las pida.
3. Evaluá la respuesta con criterio: indicá qué estuvo bien, qué estuvo mal y por qué.
4. Si la respuesta fue incorrecta o incompleta, hacé preguntas socráticas para que llegue a la solución correcta.
5. Solo mostrá la solución completa si después de varios intentos el estudiante no pudo llegar.

## Formato
- Respuestas concisas (máximo 3-4 párrafos). Para ejercicios podés extenderte.
- Respondé siempre en español.
- Terminá cada respuesta con una pregunta o un desafío para mantener el diálogo activo.`
}

export function useTutor(sessionId: string, topic: string) {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  // Load existing messages from Supabase on mount
  useEffect(() => {
    async function loadMessages() {
      const { data } = await supabase
        .from('messages')
        .select('id, role, content')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        setMessages(data as Message[])
      } else {
        // New session — insert welcome message
        const welcome: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: `¡Hola! Soy tu tutor de **${topic}**. ¿Por dónde te gustaría empezar? Puedo explicarte los conceptos básicos, responder preguntas específicas o darte un desafío para practicar.`,
        }
        await supabase.from('messages').insert({
          id: welcome.id,
          session_id: sessionId,
          role: welcome.role,
          content: welcome.content,
        })
        setMessages([welcome])
      }
      setInitialized(true)
    }

    void loadMessages()
  }, [sessionId, topic])

  const sendMessage = useCallback(
    async (userText: string) => {
      if (!userText.trim() || isLoading) return

      const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
      if (!apiKey) {
        setError('Falta la variable de entorno VITE_ANTHROPIC_API_KEY.')
        return
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userText,
      }

      // Save user message to Supabase
      await supabase.from('messages').insert({
        id: userMessage.id,
        session_id: sessionId,
        role: userMessage.role,
        content: userMessage.content,
      })

      setMessages((prev) => [...prev, userMessage])
      setIsLoading(true)
      setError(null)

      const assistantId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }])

      try {
        const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })

        const apiMessages = [...messages, userMessage].map((m) => ({
          role: m.role,
          content: m.content,
        }))

        const stream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: buildSystemPrompt(topic),
          messages: apiMessages,
        })

        let fullContent = ''
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            fullContent += chunk.delta.text
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, content: fullContent } : m)),
            )
          }
        }

        // Save completed assistant message to Supabase
        await supabase.from('messages').insert({
          id: assistantId,
          session_id: sessionId,
          role: 'assistant',
          content: fullContent,
        })
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        setError(msg)
        setMessages((prev) => prev.filter((m) => m.id !== assistantId))
      } finally {
        setIsLoading(false)
      }
    },
    [messages, isLoading, topic, sessionId],
  )

  return { messages, isLoading, error, sendMessage, initialized }
}
