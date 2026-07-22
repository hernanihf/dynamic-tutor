import type { Message } from '@/hooks/useTutor'

function renderContent(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br />')
}

export function exportConversation(topic: string, messages: Message[]) {
  const date = new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })

  const bubbles = messages.map((m) => {
    const isUser = m.role === 'user'
    return `
      <div class="message ${isUser ? 'user' : 'assistant'}">
        <div class="label">${isUser ? 'Yo' : 'Tutor IA'}</div>
        <div class="bubble">${renderContent(m.content)}</div>
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>AI-Tutor — ${topic}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 13px;
      line-height: 1.6;
      color: #0f172a;
      background: #fff;
      padding: 48px 56px;
      max-width: 760px;
      margin: 0 auto;
    }
    header {
      border-bottom: 2px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 32px;
    }
    .app-name {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: .1em;
      text-transform: uppercase;
      color: #6366f1;
      margin-bottom: 6px;
    }
    h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -.02em;
    }
    .meta {
      margin-top: 6px;
      font-size: 12px;
      color: #94a3b8;
    }
    .message {
      margin-bottom: 20px;
      display: flex;
      flex-direction: column;
    }
    .message.user { align-items: flex-end; }
    .message.assistant { align-items: flex-start; }
    .label {
      font-size: 10px;
      font-weight: 600;
      letter-spacing: .06em;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 4px;
    }
    .bubble {
      max-width: 80%;
      padding: 10px 14px;
      border-radius: 14px;
      font-size: 13px;
      line-height: 1.65;
    }
    .message.user .bubble {
      background: #6366f1;
      color: #fff;
      border-bottom-right-radius: 4px;
    }
    .message.assistant .bubble {
      background: #f1f5f9;
      color: #0f172a;
      border-bottom-left-radius: 4px;
    }
    footer {
      margin-top: 40px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #cbd5e1;
      text-align: center;
    }
    @media print {
      body { padding: 0; }
      .message { break-inside: avoid; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    }
  </style>
</head>
<body>
  <header>
    <div class="app-name">AI-Tutor</div>
    <h1>${topic}</h1>
    <div class="meta">${date}</div>
  </header>
  <main>${bubbles}</main>
  <footer>Generado por AI-Tutor · learn-with-ai-tutor.vercel.app</footer>
  <script>window.onload = () => { window.print(); window.onafterprint = () => window.close(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
