import { chatService } from './chat.service'

// Minimal service-level parser test for streaming chunks.
describe('chatService.streamMessage', () => {
    const originalFetch = global.fetch

    afterEach(() => {
        global.fetch = originalFetch
        jest.restoreAllMocks()
    })

    it('parses SSE data frames and returns the complete chunk', async () => {
        const chunks = [
            'data: {"type":"chunk","session_id":"s1","content":"Hel"}\n\n',
            'data: {"type":"chunk","session_id":"s1","content":"lo"}\n\n',
            'data: {"type":"complete","session_id":"s1","content":"Hello","telemetry":{"first_token_latency_ms":10,"total_latency_ms":20}}\n\n',
        ]

        const encoder = new TextEncoder()
        const stream = new ReadableStream<Uint8Array>({
            start(controller) {
                chunks.forEach((chunk) => controller.enqueue(encoder.encode(chunk)))
                controller.close()
            },
        })

        global.fetch = jest.fn().mockResolvedValue({
            ok: true,
            body: stream,
            text: async () => '',
        } as Response)

        const seen: string[] = []
        const result = await chatService.streamMessage('s1', 'p1', 'hi', {
            onChunk: (chunk) => {
                if (chunk.type === 'chunk') {
                    seen.push(chunk.content)
                }
            },
        })

        expect(seen.join('')).toBe('Hello')
        expect(result.type).toBe('complete')
        expect(result.telemetry?.first_token_latency_ms).toBe(10)
    })
})
