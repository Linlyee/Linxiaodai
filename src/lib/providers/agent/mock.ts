import { AgentProvider, AgentInput, AgentOutput } from './types';
import { ExtractedRequirements } from '@/types';
import { mockRestaurantProvider } from '../restaurant/mock';

function parseChineseNumber(text: string): number | null {
  const numMap: Record<string, number> = {
    '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
  };
  for (const [cn, num] of Object.entries(numMap)) {
    if (text.includes(cn)) return num;
  }
  // Try to find arabic numbers
  const match = text.match(/(\d+)\s*[个人]/);
  if (match) return parseInt(match[1]);
  return null;
}

function parseBudget(text: string): { min: number; max: number } | null {
  // Pattern: "X元以内", "X-Y元", "X块", etc.
  const maxMatch = text.match(/(\d+)\s*元?\s*(?:以内|以下|之内)/);
  if (maxMatch) return { min: 0, max: parseInt(maxMatch[1]) };

  const rangeMatch = text.match(/(\d+)\s*[-到至]\s*(\d+)\s*元?/);
  if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };

  const minMatch = text.match(/(\d+)\s*元?\s*(?:以上|起)/);
  if (minMatch) return { min: parseInt(minMatch[1]), max: 500 };

  return null;
}

function parseSpiceLevel(text: string): string | null {
  if (/不要辣|免辣|去辣/.test(text)) return 'none';
  if (/变态辣/.test(text)) return 'extra_hot';
  if (/不辣|清淡|少辣|微辣/.test(text)) return 'mild';
  if (/中辣/.test(text)) return 'medium';
  if (/辣|很辣|超辣|加辣|特辣/.test(text)) return 'hot';
  return null;
}

function parseCuisines(text: string): string[] {
  const cuisineMap: Record<string, string[]> = {
    '川菜': ['川菜', '麻辣', '香辣'],
    '湘菜': ['湘菜', '辣味'],
    '粤菜': ['粤菜', '清淡'],
    '日料': ['日料', '日本料理'],
    '日式': ['日料', '日本料理'],
    '韩式': ['韩料', '韩国料理'],
    '韩餐': ['韩料', '韩国料理'],
    '西餐': ['西餐'],
    '烧烤': ['烧烤'],
    '火锅': ['火锅'],
    '面': ['面食', '粉面'],
    '饭': ['米饭', '简餐'],
    '快餐': ['快餐'],
    '沙拉': ['沙拉', '轻食'],
    '轻食': ['轻食', '沙拉'],
    '甜点': ['甜点', '甜品'],
    '奶茶': ['饮品', '奶茶'],
    '咖啡': ['饮品', '咖啡'],
    '海鲜': ['海鲜'],
    '中餐': ['中餐'],
    '小吃': ['小吃'],
  };

  const found: string[] = [];
  for (const [keyword, cuisines] of Object.entries(cuisineMap)) {
    if (text.includes(keyword)) found.push(...cuisines);
  }
  return [...new Set(found)];
}

function parseAvoid(text: string): string[] {
  const avoidKeywords = [
    '香菜', '葱', '蒜', '姜', '辣椒', '花椒',
    '花生', '芝麻', '虾', '蟹', '鱼',
    '奶', '蛋', '肉', '内脏', '芹菜', '胡萝卜',
    '洋葱', '韭菜', '醋', '酱油', '味精',
  ];
  const avoid = avoidKeywords.filter(k => text.includes(`不要${k}`) || text.includes(`不吃${k}`) || text.includes(`免${k}`));
  // Also check for "不要" + ingredient patterns
  const noMatch = text.match(/不要\s*([一-鿿]+)/g);
  if (noMatch) {
    noMatch.forEach(m => {
      const ing = m.replace('不要', '').trim();
      if (ing && !avoid.includes(ing)) avoid.push(ing);
    });
  }
  return avoid;
}

function parseTimeLimit(text: string): number | null {
  const match = text.match(/(\d+)\s*(?:分钟|半小时|小时|min)/);
  if (match) {
    if (text.includes('半小时')) return 30;
    if (text.includes('小时')) return parseInt(match[1]) * 60;
    return parseInt(match[1]);
  }
  if (text.includes('半小时') || text.includes('半个小时')) return 30;
  return null;
}

function extractRequirements(text: string, existing: ExtractedRequirements): ExtractedRequirements {
  const updated: ExtractedRequirements = { ...existing };

  const people = parseChineseNumber(text);
  if (people !== null) updated.peopleCount = people;

  const budget = parseBudget(text);
  if (budget) updated.budget = budget;

  const spice = parseSpiceLevel(text);
  if (spice) updated.spiceLevel = spice;

  const cuisines = parseCuisines(text);
  if (cuisines.length > 0) {
    updated.cuisines = [...new Set([...(updated.cuisines || []), ...cuisines])];
  }

  const avoid = parseAvoid(text);
  if (avoid.length > 0) {
    updated.mustAvoid = [...new Set([...(updated.mustAvoid || []), ...avoid])];
  }

  const timeLimit = parseTimeLimit(text);
  if (timeLimit) updated.deliveryTimeLimit = timeLimit;

  return updated;
}

function selectCuisine(text: string): string[] {
  // Map the extracted cuisines to actual categories in seed data
  const cuisineMap: Record<string, string[]> = {
    '川菜': ['川菜'], '湘菜': ['湘菜'], '粤菜': ['粤菜'],
    '日料': ['日料'], '韩料': ['韩料'], '西餐': ['西餐'],
    '烧烤': ['烧烤'], '火锅': ['火锅'], '面食': ['面食'],
    '快餐': ['快餐'], '轻食': ['轻食'], '海鲜': ['海鲜'],
    '中餐': ['中餐', '川菜', '湘菜', '粤菜'],
    '小吃': ['小吃'],
  };

  const parsed = parseCuisines(text);
  if (parsed.length === 0) return []; // No preference, match all

  const result: string[] = [];
  for (const c of parsed) {
    if (cuisineMap[c]) result.push(...cuisineMap[c]);
  }
  return [...new Set(result)];
}

async function generateRecommendations(
  requirements: ExtractedRequirements,
  userPreferences: AgentInput['userPreferences']
): Promise<AgentOutput['recommendations']> {
  const allRestaurants = await mockRestaurantProvider.getRestaurants({});
  const targetCuisines = requirements.cuisines || [];

  // Filter restaurants
  let filtered = allRestaurants.filter(r => {
    if (!r.isOpen) return false;
    if (targetCuisines.length > 0) {
      if (!r.categories.some(c => targetCuisines.includes(c))) return false;
    }
    return true;
  });

  // Get all menu items for filtered restaurants
  const allItems = await mockRestaurantProvider.getMenuItems({});

  // Build recommendations
  const candidates: Array<{
    restaurant: typeof allRestaurants[0];
    items: typeof allItems;
    totalPrice: number;
    score: number;
  }> = [];

  for (const restaurant of filtered.slice(0, 10)) {
    let items = allItems.filter(i => i.restaurantId === restaurant.id);

    // Filter by budget
    const budgetMax = requirements.budget?.max || userPreferences.budgetMax || 100;
    const budgetMin = requirements.budget?.min || userPreferences.budgetMin || 0;
    const peopleCount = requirements.peopleCount || 1;

    items = items.filter(i => i.price * peopleCount <= budgetMax);

    // Filter by spice
    if (requirements.spiceLevel) {
      items = items.filter(i => i.spiceLevel === requirements.spiceLevel);
    }

    // Filter by avoidance
    const avoid = [
      ...(requirements.mustAvoid || []),
      ...userPreferences.allergies,
      ...userPreferences.dislikedIngredients,
    ];
    if (avoid.length > 0) {
      items = items.filter(i =>
        !avoid.some(a => i.ingredients.some(ing => ing.includes(a)))
      );
    }

    // Filter by delivery time
    if (requirements.deliveryTimeLimit && restaurant.avgDeliveryTime > requirements.deliveryTimeLimit) {
      continue;
    }

    if (items.length === 0) continue;

    // Pick top items for the people count
    const picked = items
      .sort((a, b) => b.rating * b.salesCount - a.rating * a.salesCount)
      .slice(0, Math.max(2, peopleCount));

    const totalPrice = picked.reduce((sum, i) => sum + i.price, 0) * peopleCount;
    const score = (
      restaurant.rating * 2 +
      picked.reduce((s, i) => s + i.rating, 0) / picked.length +
      (budgetMax - totalPrice > 0 ? 1 : -5)
    );

    candidates.push({ restaurant, items: picked, totalPrice, score });
  }

  // Sort by score and take top 3
  candidates.sort((a, b) => b.score - a.score);

  return candidates.slice(0, 3).map(c => ({
    restaurant: c.restaurant,
    menuItems: c.items,
    totalPrice: c.totalPrice,
    deliveryFee: c.restaurant.deliveryFee,
    estimatedDeliveryTime: c.restaurant.avgDeliveryTime,
    reason: generateReason(requirements, c.restaurant, c.items),
    score: c.score,
  }));
}

function generateReason(
  req: ExtractedRequirements,
  restaurant: { name: string; rating: number; avgDeliveryTime: number },
  items: Array<{ name: string; price: number }>
): string {
  const parts: string[] = [];
  parts.push(`${restaurant.name} 评分 ${restaurant.rating} 分`);
  if (req.budget?.max) {
    parts.push(`在预算 ${req.budget.max} 元以内`);
  }
  if (req.spiceLevel) {
    const spiceLabel: Record<string, string> = { none: '不辣', mild: '微辣', medium: '中辣', hot: '辣', extra_hot: '特辣' };
    parts.push(`口味${spiceLabel[req.spiceLevel] || req.spiceLevel}`);
  }
  parts.push(`预计 ${restaurant.avgDeliveryTime} 分钟送达`);
  parts.push(`推荐: ${items.map(i => i.name).join('、')}`);
  return parts.join('，');
}

function generateClarificationQuestions(req: ExtractedRequirements): string[] {
  const questions: string[] = [];
  if (!req.peopleCount) questions.push('请问几个人用餐呢？');
  if (!req.budget) questions.push('预算大概是多少呢？');
  if (!req.cuisines || req.cuisines.length === 0) questions.push('有想吃的菜系吗？比如川菜、日料、烧烤？');
  if (!req.spiceLevel) questions.push('能接受的辣度呢？（不辣/微辣/中辣/辣）');
  if (!req.deliveryTimeLimit) questions.push('对配送时间有要求吗？');
  return questions;
}

export const mockAgentProvider: AgentProvider = {
  name: 'mock',

  async process(input: AgentInput): Promise<AgentOutput> {
    const { userMessage, currentRequirements } = input;

    // Step 1: Extract requirements from message
    const extracted = extractRequirements(userMessage, currentRequirements);

    // Step 2: Check if it's a blind box request
    const isBlindBox = /盲盒|随便|随机|惊喜|不知道|都行/.test(userMessage);

    // Step 3: Check if we have enough info for recommendation
    const hasBasicInfo = extracted.peopleCount && extracted.budget;
    const isRequestForRecommendation = /推荐|吃什么|点什么|选什么|帮我/.test(userMessage);

    // Step 4: Check for requirement updates
    const isUpdate = /换成|改|不要|降|升|换一个/.test(userMessage);
    if (isUpdate) {
      const recs = await generateRecommendations(extracted, input.userPreferences);
      if (recs.length > 0) {
        return {
          reply: `好的，已更新条件！为你重新推荐：\n\n${recs.map((r, i) =>
            `${i + 1}. **${r.restaurant.name}** - ${r.reason}\n   总价约 ¥${r.totalPrice.toFixed(0)} | 配送费 ¥${r.deliveryFee} | 约 ${r.estimatedDeliveryTime} 分钟`
          ).join('\n\n')}`,
          extractedRequirements: extracted,
          mergedRequirements: extracted,
          action: 'recommend',
          recommendations: recs,
        };
      }
    }

    // Step 5: Blind box flow
    if (isBlindBox && hasBasicInfo) {
      const recs = await generateRecommendations(extracted, input.userPreferences);
      if (recs.length > 0) {
        const picked = recs[0];
        return {
          reply: `🎁 **外卖盲盒已开启！**\n\n为你随机挑选了 **${picked.restaurant.name}** 的 ${picked.menuItems.map(i => i.name).join('、')}\n\n${picked.reason}\n\n总价约 ¥${(picked.totalPrice + picked.deliveryFee).toFixed(0)}`,
          extractedRequirements: extracted,
          mergedRequirements: extracted,
          action: 'blind_box',
          recommendations: [picked],
        };
      }
      return {
        reply: '抱歉，根据你的条件没有找到合适的盲盒选项。要不要调整一下预算或者口味要求？',
        extractedRequirements: extracted,
        mergedRequirements: extracted,
        action: 'ask_clarification',
        clarificationQuestions: ['调整预算范围？', '放宽口味要求？'],
      };
    }

    // Step 6: Normal recommendation flow
    if (isRequestForRecommendation && hasBasicInfo) {
      const recs = await generateRecommendations(extracted, input.userPreferences);
      if (recs.length > 0) {
        return {
          reply: `根据你的需求，为你找到以下推荐：\n\n${recs.map((r, i) =>
            `${i + 1}. **${r.restaurant.name}** ⭐${r.restaurant.rating}\n   ${r.menuItems.map(m => m.name).join('、')}\n   ${r.reason}\n   总价约 ¥${(r.totalPrice + r.deliveryFee).toFixed(0)}（含配送费 ¥${r.deliveryFee}）`
          ).join('\n\n')}`,
          extractedRequirements: extracted,
          mergedRequirements: extracted,
          action: 'recommend',
          recommendations: recs,
        };
      }
    }

    // Step 7: Need more info - ask clarification
    const questions = generateClarificationQuestions(extracted);
    if (questions.length > 0) {
      const summary = summarizeRequirements(extracted);
      return {
        reply: `${summary ? `目前了解到的需求：${summary}\n\n` : ''}还需要确认一下：\n${questions.map(q => `• ${q}`).join('\n')}`,
        extractedRequirements: extracted,
        mergedRequirements: extracted,
        action: 'ask_clarification',
        clarificationQuestions: questions,
      };
    }

    // Step 8: Fallback - general chat
    return {
      reply: `你好！我是饭小智，你的 AI 外卖助手 🍜\n\n告诉我你想吃什么，比如：\n• "两个人吃，想吃辣，60元以内" \n• "推荐附近的日料" \n• "开个外卖盲盒试试"`,
      extractedRequirements: extracted,
      mergedRequirements: extracted,
      action: 'chat',
    };
  },
};

function summarizeRequirements(req: ExtractedRequirements): string {
  const parts: string[] = [];
  if (req.peopleCount) parts.push(`${req.peopleCount}人用餐`);
  if (req.budget) parts.push(`预算 ¥${req.budget.min}-${req.budget.max}`);
  if (req.cuisines?.length) parts.push(`想吃 ${req.cuisines.join('、')}`);
  if (req.spiceLevel) {
    const labels: Record<string, string> = { none: '不辣', mild: '微辣', medium: '中辣', hot: '辣', extra_hot: '特辣' };
    parts.push(labels[req.spiceLevel] || req.spiceLevel);
  }
  if (req.mustAvoid?.length) parts.push(`忌口: ${req.mustAvoid.join('、')}`);
  if (req.deliveryTimeLimit) parts.push(`${req.deliveryTimeLimit}分钟内送达`);
  return parts.join(' | ');
}
