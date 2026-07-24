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

export async function streamMessage({ systemPrompt, history, userMessage, onChunk }: StreamOptions) {
  const provider = getProvider()

  if (provider === 'gemini') {
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
  } else {
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
}
