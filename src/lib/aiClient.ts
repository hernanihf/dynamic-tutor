import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'

export type Provider = 'gemini' | 'anthropic'

export function getProvider(): Provider {
  const p = import.meta.env.VITE_AI_PROVIDER as string | undefined
  return p === 'anthropic' ? 'anthropic' : 'gemini'
}

interface StreamOptions {
  systemPrompt: string
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  onChunk: (text: string) => void
}

async function streamGemini({ systemPrompt, history, userMessage, onChunk }: StreamOptions) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('Falta VITE_GEMINI_API_KEY')

  const client = new GoogleGenAI({ apiKey })
  const geminiHistory = history.map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))
  const chat = client.chats.create({
    model: 'gemini-1.5-flash',
    config: { systemInstruction: systemPrompt },
    history: geminiHistory,
  })
  const stream = await chat.sendMessageStream({ message: userMessage })
  for await (const chunk of stream) {
    onChunk(chunk.text ?? '')
  }
}

async function streamAnthropic({ systemPrompt, history, userMessage, onChunk }: StreamOptions) {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) throw new Error('Falta VITE_ANTHROPIC_API_KEY')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const apiMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: userMessage },
  ]
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: apiMessages,
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      onChunk(chunk.delta.text)
    }
  }
}

export async function streamMessage(opts: StreamOptions) {
  const primary = getProvider()
  const fallback: Provider = primary === 'gemini' ? 'anthropic' : 'gemini'

  try {
    await (primary === 'gemini' ? streamGemini(opts) : streamAnthropic(opts))
  } catch (err) {
    const is429 = err instanceof Error && (err.message.includes('429') || err.message.includes('quota') || err.message.includes('RESOURCE_EXHAUSTED') || err.message.includes('credit balance'))
    if (!is429) throw err

    console.warn(`[aiClient] ${primary} quota exceeded, falling back to ${fallback}`)
    await (fallback === 'gemini' ? streamGemini(opts) : streamAnthropic(opts))
  }
}
