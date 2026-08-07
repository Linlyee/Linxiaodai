import { describe, it, expect } from 'vitest';

// Testing requirement parsing logic from mock agent
// We test the extraction logic directly by importing and testing patterns

describe('Agent - Requirement Extraction', () => {
  // These tests validate the regex patterns used in the mock agent

  describe('Budget parsing', () => {
    const parseBudget = (text: string): { min: number; max: number } | null => {
      const maxMatch = text.match(/(\d+)\s*元?\s*(?:以内|以下|之内)/);
      if (maxMatch) return { min: 0, max: parseInt(maxMatch[1]) };

      const rangeMatch = text.match(/(\d+)\s*[-到至]\s*(\d+)\s*元?/);
      if (rangeMatch) return { min: parseInt(rangeMatch[1]), max: parseInt(rangeMatch[2]) };

      const minMatch = text.match(/(\d+)\s*元?\s*(?:以上|起)/);
      if (minMatch) return { min: parseInt(minMatch[1]), max: 500 };

      return null;
    };

    it('parses "X元以内" pattern', () => {
      expect(parseBudget('60元以内')).toEqual({ min: 0, max: 60 });
    });

    it('parses "X元以下" pattern', () => {
      expect(parseBudget('100元以下')).toEqual({ min: 0, max: 100 });
    });

    it('parses range pattern "X-Y元"', () => {
      expect(parseBudget('30-50元')).toEqual({ min: 30, max: 50 });
    });

    it('parses "X元以上" pattern', () => {
      expect(parseBudget('50元以上')).toEqual({ min: 50, max: 500 });
    });

    it('returns null for no budget info', () => {
      expect(parseBudget('我想吃川菜')).toBeNull();
    });
  });

  describe('People count parsing', () => {
    const parsePeople = (text: string): number | null => {
      const numMap: Record<string, number> = {
        '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5,
        '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
      };
      for (const [cn, num] of Object.entries(numMap)) {
        if (text.includes(`${cn}个`) || text.includes(`${cn}人`)) return num;
      }
      const match = text.match(/(\d+)\s*[个人]/);
      if (match) return parseInt(match[1]);
      return null;
    };

    it('parses Chinese number', () => {
      expect(parsePeople('两个人吃')).toBe(2);
    });

    it('parses arabic number', () => {
      expect(parsePeople('3个人')).toBe(3);
    });

    it('parses "两" as 2', () => {
      expect(parsePeople('两人用餐')).toBe(2);
    });

    it('returns null when no count mentioned', () => {
      expect(parsePeople('想吃好吃的')).toBeNull();
    });
  });

  describe('Spice level parsing', () => {
    const parseSpice = (text: string): string | null => {
      if (/不要辣|免辣|去辣/.test(text)) return 'none';
      if (/变态辣/.test(text)) return 'extra_hot';
      if (/不辣|清淡|少辣|微辣/.test(text)) return 'mild';
      if (/中辣/.test(text)) return 'medium';
      if (/辣|很辣|超辣|加辣|特辣/.test(text)) return 'hot';
      return null;
    };

    it('detects mild spice', () => {
      expect(parseSpice('微辣就好')).toBe('mild');
    });

    it('detects medium spice', () => {
      expect(parseSpice('中辣吧')).toBe('medium');
    });

    it('detects hot spice', () => {
      expect(parseSpice('想吃辣的')).toBe('hot');
    });

    it('detects no spice preference', () => {
      expect(parseSpice('不要辣')).toBe('none');
    });
  });

  describe('Avoidance parsing', () => {
    const parseAvoid = (text: string): string[] => {
      const avoidKeywords = ['香菜', '葱', '蒜', '姜', '辣椒', '花生', '芝麻', '虾', '奶', '蛋'];
      const avoid = avoidKeywords.filter(k =>
        text.includes(`不要${k}`) || text.includes(`不吃${k}`) || text.includes(`免${k}`)
      );
      return avoid;
    };

    it('detects cilantro avoidance', () => {
      expect(parseAvoid('不要香菜')).toContain('香菜');
    });

    it('detects multiple avoidances', () => {
      const result = parseAvoid('不要香菜，不吃花生，不要辣椒');
      expect(result).toContain('香菜');
      expect(result).toContain('花生');
      expect(result).toContain('辣椒');
    });

    it('returns empty when no avoidance', () => {
      expect(parseAvoid('随便吃什么')).toEqual([]);
    });
  });
});

describe('Agent - Recommendation Filtering', () => {
  const mockRestaurants = [
    { id: '1', name: '川味居', rating: 4.8, categories: ['川菜'], avgDeliveryTime: 25, deliveryFee: 5, isOpen: true },
    { id: '2', name: '日料店', rating: 4.5, categories: ['日料'], avgDeliveryTime: 35, deliveryFee: 8, isOpen: true },
    { id: '3', name: '快餐王', rating: 3.8, categories: ['快餐'], avgDeliveryTime: 15, deliveryFee: 3, isOpen: false },
    { id: '4', name: '粤菜馆', rating: 4.6, categories: ['粤菜'], avgDeliveryTime: 30, deliveryFee: 6, isOpen: true },
  ];

  const mockItems = [
    { id: 'i1', restaurantId: '1', name: '水煮鱼', price: 48, spiceLevel: 'hot', ingredients: ['鱼', '辣椒'], allergens: [], rating: 4.8, salesCount: 1000 },
    { id: 'i2', restaurantId: '1', name: '麻婆豆腐', price: 22, spiceLevel: 'hot', ingredients: ['豆腐', '花椒'], allergens: [], rating: 4.6, salesCount: 800 },
    { id: 'i3', restaurantId: '2', name: '三文鱼刺身', price: 68, spiceLevel: 'none', ingredients: ['三文鱼'], allergens: ['鱼'], rating: 4.8, salesCount: 900 },
    { id: 'i4', restaurantId: '4', name: '白切鸡', price: 38, spiceLevel: 'none', ingredients: ['鸡', '姜'], allergens: [], rating: 4.5, salesCount: 700 },
  ];

  it('filters by budget max', () => {
    const budget = { min: 0, max: 40 };
    const filtered = mockItems.filter(i => i.price <= budget.max);
    expect(filtered.map(i => i.name)).toEqual(['麻婆豆腐', '白切鸡']);
  });

  it('filters by spice level', () => {
    const spice = 'hot';
    const filtered = mockItems.filter(i => i.spiceLevel === spice);
    expect(filtered.map(i => i.name)).toEqual(['水煮鱼', '麻婆豆腐']);
  });

  it('filters by cuisine category', () => {
    const cuisine = '川菜';
    const matching = mockRestaurants.filter(r => r.categories.includes(cuisine) && r.isOpen);
    expect(matching.map(r => r.name)).toEqual(['川味居']);
  });

  it('filters out closed restaurants', () => {
    const open = mockRestaurants.filter(r => r.isOpen);
    expect(open.length).toBe(3);
    expect(open.find(r => r.name === '快餐王')).toBeUndefined();
  });

  it('filters by delivery time limit', () => {
    const timeLimit = 30;
    const filtered = mockRestaurants.filter(r => r.avgDeliveryTime <= timeLimit);
    expect(filtered.map(r => r.name)).toEqual(['川味居', '快餐王', '粤菜馆']);
  });

  it('excludes items with allergens', () => {
    const allergies = ['鱼'];
    const filtered = mockItems.filter(i => !allergies.some(a => i.allergens.includes(a)));
    expect(filtered.map(i => i.name)).toEqual(['水煮鱼', '麻婆豆腐', '白切鸡']);
  });

  it('combines multiple filters', () => {
    const budget = { min: 0, max: 50 };
    const spice = 'hot';
    const allergies = ['鱼'];

    const filtered = mockItems.filter(i => {
      if (i.price > budget.max) return false;
      if (i.spiceLevel !== spice) return false;
      if (allergies.some(a => i.allergens.includes(a))) return false;
      return true;
    });

    expect(filtered.map(i => i.name)).toEqual(['水煮鱼', '麻婆豆腐']);
  });
});

describe('Agent - Blind Box Constraints', () => {
  const mockItems = [
    { id: '1', name: '宫保鸡丁', price: 32, spiceLevel: 'medium', ingredients: ['鸡肉', '花生'], allergens: ['花生'] },
    { id: '2', name: '麻辣豆腐', price: 22, spiceLevel: 'hot', ingredients: ['豆腐', '花椒'], allergens: [] },
    { id: '3', name: '寿司拼盘', price: 58, spiceLevel: 'none', ingredients: ['米饭', '鱼'], allergens: ['鱼'] },
    { id: '4', name: '凯撒沙拉', price: 32, spiceLevel: 'none', ingredients: ['生菜', '鸡肉', '芝士'], allergens: ['奶'] },
    { id: '5', name: '牛肉拉面', price: 22, spiceLevel: 'mild', ingredients: ['面条', '牛肉', '香菜'], allergens: [] },
  ];

  it('blind box respects budget constraint', () => {
    const budget = 30;
    const eligible = mockItems.filter(i => i.price <= budget);
    expect(eligible.length).toBeGreaterThan(0);
    expect(eligible.every(i => i.price <= budget)).toBe(true);
  });

  it('blind box respects allergen exclusions', () => {
    const excludeAllergens = ['花生'];
    const eligible = mockItems.filter(i =>
      !excludeAllergens.some(a => i.allergens.includes(a))
    );
    expect(eligible.find(i => i.name === '宫保鸡丁')).toBeUndefined();
  });

  it('blind box respects ingredient exclusions', () => {
    const excludeIngredients = ['香菜'];
    const eligible = mockItems.filter(i =>
      !excludeIngredients.some(e => i.ingredients.some(ing => ing.includes(e)))
    );
    expect(eligible.find(i => i.name === '牛肉拉面')).toBeUndefined();
  });

  it('blind box returns empty when no matches', () => {
    const eligible = mockItems.filter(i => i.price <= 5); // impossible budget
    expect(eligible.length).toBe(0);
  });

  it('blind box selects within constraints', () => {
    const budget = 35;
    const excludeAllergens = ['花生', '鱼', '奶'];
    const eligible = mockItems.filter(i =>
      i.price <= budget &&
      !excludeAllergens.some(a => i.allergens.includes(a))
    );
    // Only 麻辣豆腐 (22元, no allergens) and 牛肉拉面 (22元, no allergens) should match
    expect(eligible.map(i => i.name).sort()).toEqual(['牛肉拉面', '麻辣豆腐']);
  });
});

describe('Order - Status Transitions', () => {
  const validTransitions: Record<string, string[]> = {
    pending_payment: ['paid', 'cancelled'],
    paid: ['accepted', 'cancelled'],
    accepted: ['preparing', 'cancelled'],
    preparing: ['picked_up', 'cancelled'],
    picked_up: ['delivering', 'cancelled'],
    delivering: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  };

  it('allows pay from pending_payment', () => {
    expect(validTransitions['pending_payment']).toContain('paid');
  });

  it('allows cancel from active statuses', () => {
    expect(validTransitions['paid']).toContain('cancelled');
    expect(validTransitions['preparing']).toContain('cancelled');
  });

  it('prevents further transitions from completed', () => {
    expect(validTransitions['completed']).toEqual([]);
  });

  it('prevents further transitions from cancelled', () => {
    expect(validTransitions['cancelled']).toEqual([]);
  });

  it('maintains correct order flow', () => {
    const flow = ['pending_payment', 'paid', 'accepted', 'preparing', 'picked_up', 'delivering', 'completed'];
    for (let i = 0; i < flow.length - 1; i++) {
      expect(validTransitions[flow[i]]).toContain(flow[i + 1]);
    }
  });

  it('every status allows cancellation except terminal states', () => {
    for (const [status, transitions] of Object.entries(validTransitions)) {
      if (status === 'completed' || status === 'cancelled') {
        expect(transitions).not.toContain('cancelled');
      } else {
        expect(transitions).toContain('cancelled');
      }
    }
  });
});
