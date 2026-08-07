import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantProvider } from '@/lib/providers/restaurant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = getRestaurantProvider();

    const items = await provider.getMenuItems({
      restaurantId: searchParams.get('restaurantId') || undefined,
      category: searchParams.get('category') || undefined,
      minPrice: searchParams.get('minPrice')
        ? parseFloat(searchParams.get('minPrice')!)
        : undefined,
      maxPrice: searchParams.get('maxPrice')
        ? parseFloat(searchParams.get('maxPrice')!)
        : undefined,
      spiceLevel: searchParams.get('spiceLevel') || undefined,
      search: searchParams.get('search') || undefined,
      sortBy: (searchParams.get('sortBy') as 'price' | 'rating' | 'salesCount') || 'salesCount',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : 50,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : 0,
    });

    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    return NextResponse.json(
      { success: false, error: '获取餐品列表失败' },
      { status: 500 }
    );
  }
}
