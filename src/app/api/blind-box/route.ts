import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getRestaurantProvider } from '@/lib/providers/restaurant';

const blindBoxSchema = z.object({
  budget: z.number().min(0).optional(),
  spiceLevel: z.string().optional(),
  excludeIngredients: z.array(z.string()).optional(),
  cuisines: z.array(z.string()).optional(),
  deliveryTimeLimit: z.number().optional(),
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

    const body = await request.json().catch(() => ({}));
    const parsed = blindBoxSchema.safeParse(body);

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { preferences: true },
    });

    const prefs = user?.preferences;
    const budget = parsed.success && parsed.data.budget
      ? parsed.data.budget
      : (prefs?.budgetMax || 80);
    const spiceLevel = parsed.success && parsed.data.spiceLevel
      ? parsed.data.spiceLevel
      : (prefs?.spiceLevel || 'medium');
    const exclude = parsed.success && parsed.data.excludeIngredients
      ? parsed.data.excludeIngredients
      : [...(prefs?.allergies || []), ...(prefs?.dislikedIngredients || [])];
    const targetCuisines = parsed.success && parsed.data.cuisines
      ? parsed.data.cuisines
      : undefined;
    const timeLimit = parsed.success && parsed.data.deliveryTimeLimit
      ? parsed.data.deliveryTimeLimit
      : undefined;

    const provider = getRestaurantProvider();
    const restaurants = await provider.getRestaurants({});
    const menuItems = await provider.getMenuItems({});

    // Filter by criteria
    const eligible = restaurants.filter(r => {
      if (!r.isOpen) return false;
      if (targetCuisines && !r.categories.some(c => targetCuisines.includes(c))) return false;
      if (timeLimit && r.avgDeliveryTime > timeLimit) return false;
      return true;
    });

    const eligibleItems = menuItems.filter(i => {
      if (i.price > budget) return false;
      if (exclude.some(e => i.ingredients.some(ing => ing.includes(e)))) return false;
      if (exclude.some(e => i.allergens.includes(e))) return false;
      return eligible.some(r => r.id === i.restaurantId);
    });

    if (eligibleItems.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          found: false,
          message: '没有找到符合条件的盲盒，试试调整预算或口味要求？',
        },
      });
    }

    // Random selection weighted by rating & sales
    const weighted = eligibleItems.flatMap(i => {
      const r = eligible.find(r => r.id === i.restaurantId);
      if (!r) return [];
      const weight = Math.max(1, Math.floor((r.rating * i.rating * Math.log(i.salesCount + 2)) / 4));
      return Array(weight).fill({ item: i, restaurant: r });
    });

    const pick = weighted[Math.floor(Math.random() * weighted.length)];

    // Save blind box result
    await prisma.blindBoxResult.create({
      data: {
        userId: session.userId,
        restaurantId: pick.restaurant.id,
        menuItemId: pick.item.id,
        reason: `随机推荐: ${pick.restaurant.name} - ${pick.item.name}，评分 ${pick.restaurant.rating}，¥${pick.item.price}`,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        found: true,
        restaurant: pick.restaurant,
        menuItem: pick.item,
        totalPrice: pick.item.price + pick.restaurant.deliveryFee,
        deliveryFee: pick.restaurant.deliveryFee,
        estimatedDeliveryTime: pick.restaurant.avgDeliveryTime,
        reason: `🎁 你的外卖盲盒：${pick.restaurant.name} 的「${pick.item.name}」！${pick.restaurant.rating}分好评，¥${pick.item.price}，约${pick.restaurant.avgDeliveryTime}分钟送达`,
      },
    });
  } catch (error) {
    console.error('Blind box error:', error);
    return NextResponse.json(
      { success: false, error: '盲盒功能暂时不可用' },
      { status: 500 }
    );
  }
}
