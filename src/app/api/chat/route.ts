import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { getAgentProvider } from '@/lib/providers/agent';
import { getRestaurantProvider } from '@/lib/providers/restaurant';

const chatSchema = z.object({
  conversationId: z.string().optional(),
  message: z.string().min(1, '消息不能为空'),
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
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { message, conversationId } = parsed.data;

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: session.userId },
      });
      if (!conversation) {
        return NextResponse.json(
          { success: false, error: '对话不存在' },
          { status: 404 }
        );
      }
    }

    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: { preferences: true },
    });

    const preferences = user?.preferences;
    const existingMessages = conversation
      ? (conversation.messages as Array<{ role: string; content: string }>)
      : [];
    const existingRequirements = conversation
      ? (conversation.extractedRequirements as Record<string, unknown>)
      : {};

    // Get restaurant context
    const restaurantProvider = getRestaurantProvider();
    const restaurants = await restaurantProvider.getRestaurants({});
    const menuItems = await restaurantProvider.getMenuItems({});
    const allCuisines = [...new Set(restaurants.flatMap(r => r.categories))];

    // Process via agent
    const agentProvider = getAgentProvider();
    const agentOutput = await agentProvider.process({
      userMessage: message,
      conversationHistory: existingMessages.slice(-10),
      currentRequirements: existingRequirements as Record<string, unknown>,
      userPreferences: {
        spiceLevel: preferences?.spiceLevel || 'medium',
        allergies: (preferences?.allergies || []) as string[],
        dislikedIngredients: (preferences?.dislikedIngredients || []) as string[],
        budgetMin: preferences?.budgetMin || 20,
        budgetMax: preferences?.budgetMax || 80,
        favoriteCuisines: (preferences?.favoriteCuisines || []) as string[],
      },
      context: {
        restaurantsCount: restaurants.length,
        menuItemsCount: menuItems.length,
        availableCuisines: allCuisines,
      },
    });

    // Build messages
    const newMessages = [
      ...existingMessages,
      { role: 'user', content: message, createdAt: new Date().toISOString() },
      {
        role: 'assistant',
        content: agentOutput.reply,
        recommendations: agentOutput.recommendations,
        action: agentOutput.action,
        createdAt: new Date().toISOString(),
      },
    ];

    // Save or create conversation
    const title = existingMessages.length === 0
      ? (message.length > 30 ? message.slice(0, 30) + '...' : message)
      : (conversation?.title || '新对话');

    if (conversation) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          messages: newMessages,
          extractedRequirements: agentOutput.mergedRequirements,
          updatedAt: new Date(),
        },
      });
    } else {
      conversation = await prisma.conversation.create({
        data: {
          userId: session.userId,
          title,
          messages: newMessages,
          extractedRequirements: agentOutput.mergedRequirements,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        conversationId: conversation.id,
        message: {
          role: 'assistant',
          content: agentOutput.reply,
          recommendations: agentOutput.recommendations,
          action: agentOutput.action,
          clarificationQuestions: agentOutput.clarificationQuestions,
        },
        extractedRequirements: agentOutput.mergedRequirements,
      },
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: '处理消息失败' },
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
    const id = searchParams.get('id');

    if (id) {
      const conversation = await prisma.conversation.findFirst({
        where: { id, userId: session.userId },
      });

      if (!conversation) {
        return NextResponse.json(
          { success: false, error: '对话不存在' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: conversation.id,
          title: conversation.title,
          messages: conversation.messages,
          extractedRequirements: conversation.extractedRequirements,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        },
      });
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: session.userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { success: false, error: '获取对话列表失败' },
      { status: 500 }
    );
  }
}
