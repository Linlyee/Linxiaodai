import { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';
import { createSSEResponse } from '@/lib/sse';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { id } = await params;

  // Verify order belongs to user
  const order = await prisma.order.findFirst({
    where: { id, userId: session.userId },
  });
  if (!order) {
    return new Response('Not Found', { status: 404 });
  }

  return createSSEResponse(`order:${id}`, () => {
    console.log(`[SSE] Client subscribed to order:${id}`);
  });
}
