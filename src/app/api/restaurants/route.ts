import { NextRequest, NextResponse } from 'next/server';
import { getRestaurantProvider } from '@/lib/providers/restaurant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = getRestaurantProvider();

    const restaurants = await provider.getRestaurants({
      ids: searchParams.getAll('ids').flatMap(v => v.split(',')),
      categories: searchParams.getAll('categories').flatMap(v => v.split(',')),
      minRating: searchParams.get('minRating')
        ? parseFloat(searchParams.get('minRating')!)
        : undefined,
      maxDeliveryTime: searchParams.get('maxDeliveryTime')
        ? parseInt(searchParams.get('maxDeliveryTime')!)
        : undefined,
      search: searchParams.get('search') || undefined,
      limit: searchParams.get('limit')
        ? parseInt(searchParams.get('limit')!)
        : undefined,
      offset: searchParams.get('offset')
        ? parseInt(searchParams.get('offset')!)
        : undefined,
    });

    return NextResponse.json({
      success: true,
      data: restaurants,
      total: restaurants.length,
    });
  } catch (error) {
    console.error('Get restaurants error:', error);
    return NextResponse.json(
      { success: false, error: '获取餐厅列表失败' },
      { status: 500 }
    );
  }
}
