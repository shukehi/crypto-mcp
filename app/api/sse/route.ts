import { NextResponse } from 'next/server';

export function GET() {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('event: heartbeat\ndata: "sse disabled"\n\n'));
      controller.close();
    },
  });
  return new NextResponse(stream, {
    status: 200,
    headers: new Headers({
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache',
    }),
  });
}
