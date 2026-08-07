/**
 * Server-Sent Events utility for real-time order tracking.
 */

export function createSSEChannel() {
  const listeners = new Map<string, Set<(data: string) => void>>();

  return {
    subscribe(channel: string, callback: (data: string) => void) {
      if (!listeners.has(channel)) {
        listeners.set(channel, new Set());
      }
      listeners.get(channel)!.add(callback);

      return () => {
        listeners.get(channel)?.delete(callback);
      };
    },

    publish(channel: string, data: unknown) {
      const cbs = listeners.get(channel);
      if (cbs) {
        const payload = JSON.stringify(data);
        cbs.forEach(cb => cb(payload));
      }
    },
  };
}

// Global singleton
export const sseChannel = createSSEChannel();

/**
 * Helper to create an SSE response in Next.js App Router
 */
export function createSSEResponse(
  channel: string,
  onSubscribe?: () => void
): Response {
  const encoder = new TextEncoder();
  let cleanup: (() => void) | undefined;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode(':connected\n\n'));

      cleanup = sseChannel.subscribe(channel, (data) => {
        controller.enqueue(encoder.encode(`data:${data}\n\n`));
      });

      onSubscribe?.();
    },
    cancel() {
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
