import { WS_BASE_URL } from './env'

export type WSMessageHandler = (payload: any) => void

function buildURL(path: string): string {
  const safePath = path.startsWith('/') ? path : `/${path}`
  return `${WS_BASE_URL}${safePath}`
}

export function connectChatSocket(
  params: { sessionId?: string; projectId?: string },
  onMessage: WSMessageHandler,
  onError?: (event: Event) => void
): WebSocket {
  const route = params.projectId
    ? `/ws/chat/project/${params.projectId}/`
    : params.sessionId
      ? `/ws/chat/${params.sessionId}/`
      : '/ws/chat/'

  const socket = new WebSocket(buildURL(route))

  socket.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data))
    } catch {
      onMessage(event.data)
    }
  }

  if (onError) socket.onerror = onError
  return socket
}

export function connectAgentSocket(
  sessionId: string,
  onMessage: WSMessageHandler,
  onError?: (event: Event) => void
): WebSocket {
  const socket = new WebSocket(buildURL(`/ws/agent/${sessionId}/`))

  socket.onmessage = (event) => {
    try {
      onMessage(JSON.parse(event.data))
    } catch {
      onMessage(event.data)
    }
  }

  if (onError) socket.onerror = onError
  return socket
}

export function closeSocket(socket: WebSocket | null | undefined) {
  if (!socket) return
  if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
    socket.close()
  }
}
