import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  phone: z.string().optional(),
  avatar: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  spiceLevel: z.enum(['none', 'mild', 'medium', 'hot', 'extra_hot']).optional(),
  dietaryPreferences: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  dislikedIngredients: z.array(z.string()).optional(),
  budgetMin: z.number().min(0).optional(),
  budgetMax: z.number().min(0).optional(),
  favoriteCuisines: z.array(z.string()).optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: '请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'profile') {
      const parsed = updateProfileSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const user = await prisma.user.update({
        where: { id: session.userId },
        data: parsed.data,
      });

      return NextResponse.json({
        success: true,
        data: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatar: user.avatar },
      });
    }

    if (type === 'preferences') {
      const parsed = updatePreferencesSchema.safeParse(data);
      if (!parsed.success) {
        return NextResponse.json(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const prefs = await prisma.tasteProfile.upsert({
        where: { userId: session.userId },
        create: { userId: session.userId, ...parsed.data },
        update: parsed.data,
      });

      return NextResponse.json({
        success: true,
        data: prefs,
      });
    }

    return NextResponse.json(
      { success: false, error: '无效的更新类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { success: false, error: '更新失败' },
      { status: 500 }
    );
  }
}
