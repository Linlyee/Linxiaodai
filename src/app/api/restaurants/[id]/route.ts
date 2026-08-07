import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantProvider } from '@/lib/providers/restaurant';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const provider = getRestaurantProvider();
    const restaurant = await provider.getRestaurantById(id);

    if (!restaurant) {
      return NextResponse.json(
        { success: false, error: '餐厅不存在' },
        { status: 404 }
      );
    }

    const menuItems = await provider.getMenuItems({ restaurantId: id });

    return NextResponse.json({
      success: true,
      data: { ...restaurant, menuItems },
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    return NextResponse.json(
      { success: false, error: '获取餐厅详情失败' },
      { status: 500 }
    );
  }
}
