import { GoogleGenAI } from '@google/genai'
import Anthropic from '@anthropic-ai/sdk'
import Groq from 'groq-sdk'

export type Provider = 'groq' | 'gemini' | 'anthropic'

export function getProvider(): Provider {
  const p = import.meta.env.VITE_AI_PROVIDER as string | undefined
  if (p === 'anthropic') return 'anthropic'
  if (p === 'gemini') return 'gemini'
  return 'groq'
}

interface StreamOptions {
  systemPrompt: string
  history: { role: 'user' | 'assistant'; content: string }[]
  userMessage: string
  onChunk: (text: string) => void
}

async function streamGroq({ systemPrompt, history, userMessage, onChunk }: StreamOptions) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY as string | undefined
  if (!apiKey) throw new Error('Falta VITE_GROQ_API_KEY')

  const client = new Groq({ apiKey, dangerouslyAllowBrowser: true })
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    stream: true,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  })
  for await (const chunk of stream) {
    onChunk(chunk.choices[0]?.delta?.content ?? '')
  }
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
    model: 'gemini-2.0-flash-lite',
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
  const stream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage },
    ],
  })
  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
      onChunk(chunk.delta.text)
    }
  }
}

const providers: Record<Provider, (opts: StreamOptions) => Promise<void>> = {
  groq: streamGroq,
  gemini: streamGemini,
  anthropic: streamAnthropic,
}

const fallbackOrder: Record<Provider, Provider[]> = {
  groq: ['gemini', 'anthropic'],
  gemini: ['groq', 'anthropic'],
  anthropic: ['groq', 'gemini'],
}

function isQuotaError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  return /429|quota|RESOURCE_EXHAUSTED|credit balance|rate.?limit/i.test(msg)
}

export async function streamMessage(opts: StreamOptions) {
  const primary = getProvider()
  const chain = [primary, ...fallbackOrder[primary]]

  for (const provider of chain) {
    try {
      await providers[provider](opts)
      return
    } catch (err) {
      if (isQuotaError(err) && provider !== chain[chain.length - 1]) {
        console.warn(`[aiClient] ${provider} quota exceeded, trying next provider`)
        continue
      }
      throw err
    }
  }
}
