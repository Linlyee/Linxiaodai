import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sseChannel } from '@/lib/sse';

const paySchema = z.object({
  paymentMethod: z.string().default('mock'),
});

const feedbackSchema = z.object({
  rating: z.number().min(1).max(5),
  tags: z.array(z.string()).default([]),
  comment: z.string().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, userId: session.userId },
      include: {
        address: true,
        feedback: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    return NextResponse.json(
      { success: false, error: '获取订单详情失败' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const order = await prisma.order.findFirst({
      where: { id, userId: session.userId },
    });

    if (!order) {
      return NextResponse.json(
        { success: false, error: '订单不存在' },
        { status: 404 }
      );
    }

    // Determine action from body
    const body = await request.json();
    const action = body.action as string;

    if (action === 'pay') {
      if (order.status !== 'pending_payment') {
        return NextResponse.json(
          { success: false, error: '订单状态不允许支付' },
          { status: 400 }
        );
      }

      const parsed = paySchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      // Mock payment - always succeeds
      const updated = await prisma.order.update({
        where: { id },
        data: {
          status: 'paid',
          paidAt: new Date(),
          // Simulate initial rider location near restaurant
          riderLat: 39.9050 + (Math.random() - 0.5) * 0.01,
          riderLng: 116.4080 + (Math.random() - 0.5) * 0.01,
        },
      });

      sseChannel.publish(`order:${id}`, {
        type: 'status_change',
        orderId: id,
        status: 'paid',
        message: '支付成功，商家已接单',
      });

      // Simulate order progression
      simulateOrderProgress(id);

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    if (action === 'feedback') {
      if (order.status !== 'completed') {
        return NextResponse.json(
          { success: false, error: '只能评价已完成的订单' },
          { status: 400 }
        );
      }

      const parsed = feedbackSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const feedback = await prisma.orderFeedback.create({
        data: {
          orderId: order.id,
          userId: session.userId,
          rating: parsed.data.rating,
          tags: parsed.data.tags,
          comment: parsed.data.comment,
        },
      });

      return NextResponse.json({
        success: true,
        data: feedback,
      });
    }

    if (action === 'cancel') {
      if (['completed', 'cancelled'].includes(order.status)) {
        return NextResponse.json(
          { success: false, error: '订单状态不允许取消' },
          { status: 400 }
        );
      }

      const updated = await prisma.order.update({
        where: { id },
        data: { status: 'cancelled' },
      });

      sseChannel.publish(`order:${id}`, {
        type: 'status_change',
        orderId: id,
        status: 'cancelled',
        message: '订单已取消',
      });

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    return NextResponse.json(
      { success: false, error: '无效操作' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Order action error:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}

// Simulate order progression after payment
async function simulateOrderProgress(orderId: string) {
  const stages: Array<{ status: string; delay: number; message: string }> = [
    { status: 'accepted', delay: 3000, message: '商家已接单，正在准备中' },
    { status: 'preparing', delay: 8000, message: '商家正在制作您的餐品' },
    { status: 'picked_up', delay: 15000, message: '骑手已取餐，正在赶来' },
    { status: 'delivering', delay: 20000, message: '骑手正在配送途中' },
    { status: 'completed', delay: 30000, message: '订单已送达，祝您用餐愉快！' },
  ];

  for (const stage of stages) {
    await new Promise(resolve => setTimeout(resolve, stage.delay));

    // Update rider position for delivery stages
    const riderLat = 39.9050 + (Math.random() - 0.5) * 0.05;
    const riderLng = 116.4080 + (Math.random() - 0.5) * 0.05;

    try {
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: stage.status,
          riderLat,
          riderLng,
          ...(stage.status === 'completed' ? { deliveredAt: new Date() } : {}),
        },
      });

      sseChannel.publish(`order:${orderId}`, {
        type: 'status_change',
        orderId,
        status: stage.status,
        message: stage.message,
        riderLocation: { lat: riderLat, lng: riderLng },
      });
    } catch {
      // Order might have been cancelled
      break;
    }
  }
}
