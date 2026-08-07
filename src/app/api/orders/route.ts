import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { sseChannel } from '@/lib/sse';

const createOrderSchema = z.object({
  restaurantId: z.string().min(1),
  restaurantName: z.string().min(1),
  items: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number().min(1),
    imageUrl: z.string().optional(),
  })).min(1),
  subtotal: z.number().min(0),
  deliveryFee: z.number().min(0),
  discount: z.number().min(0).default(0),
  total: z.number().min(0),
  deliveryAddressId: z.string().min(1),
  estimatedDeliveryTime: z.number().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createOrderSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;

    // Verify the delivery address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: data.deliveryAddressId, userId: session.userId },
    });
    if (!address) {
      return NextResponse.json(
        { success: false, error: '收货地址无效' },
        { status: 400 }
      );
    }

    const order = await prisma.order.create({
      data: {
        userId: session.userId,
        restaurantId: data.restaurantId,
        restaurantName: data.restaurantName,
        items: data.items,
        subtotal: data.subtotal,
        deliveryFee: data.deliveryFee,
        discount: data.discount,
        total: data.total,
        status: 'pending_payment',
        deliveryAddressId: data.deliveryAddressId,
        estimatedDeliveryTime: data.estimatedDeliveryTime,
      },
    });

    sseChannel.publish(`order:${order.id}`, {
      type: 'order_created',
      orderId: order.id,
      status: order.status,
    });

    return NextResponse.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      { success: false, error: '创建订单失败' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where: Record<string, unknown> = { userId: session.userId };
    if (status) {
      where.status = status;
    }

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        address: true,
        feedback: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { success: false, error: '获取订单列表失败' },
      { status: 500 }
    );
  }
}
