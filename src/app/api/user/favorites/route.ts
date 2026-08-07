import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const favorites = await prisma.favoriteRestaurant.findMany({
      where: { userId: session.userId },
      include: { restaurant: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: favorites.map(f => f.restaurant),
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    return NextResponse.json(
      { success: false, error: '获取收藏列表失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { restaurantId } = await request.json();

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: '缺少餐厅ID' },
        { status: 400 }
      );
    }

    await prisma.favoriteRestaurant.upsert({
      where: {
        userId_restaurantId: {
          userId: session.userId,
          restaurantId,
        },
      },
      create: { userId: session.userId, restaurantId },
      update: {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    return NextResponse.json(
      { success: false, error: '操作失败' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId) {
      return NextResponse.json(
        { success: false, error: '缺少餐厅ID' },
        { status: 400 }
      );
    }

    await prisma.favoriteRestaurant.deleteMany({
      where: { userId: session.userId, restaurantId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove favorite error:', error);
    return NextResponse.json(
      { success: false, error: '取消收藏失败' },
      { status: 500 }
    );
  }
}
