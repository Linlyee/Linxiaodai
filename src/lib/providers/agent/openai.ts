import { AgentProvider, AgentInput, AgentOutput } from './types';
import { mockAgentProvider } from './mock';

/**
 * OpenAI Agent Provider - uses OpenAI API for intelligent food recommendations.
 * Falls back to MockAgentProvider if API key is not configured.
 */
export const openaiAgentProvider: AgentProvider = {
  name: 'openai',

  async process(input: AgentInput): Promise<AgentOutput> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === 'sk-your-key-here') {
      console.warn('[Agent] OpenAI API key not configured, falling back to MockAgentProvider');
      return mockAgentProvider.process(input);
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: buildSystemPrompt(input),
            },
            ...input.conversationHistory.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            {
              role: 'user',
              content: input.userMessage,
            },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        console.error('[Agent] OpenAI API error:', response.status, response.statusText);
        return mockAgentProvider.process(input);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        return mockAgentProvider.process(input);
      }

      const parsed = JSON.parse(content);
      return {
        reply: parsed.reply || '抱歉，我暂时无法处理这个请求。',
        extractedRequirements: parsed.extractedRequirements || {},
        mergedRequirements: parsed.mergedRequirements || input.currentRequirements,
        action: parsed.action || 'chat',
        recommendations: parsed.recommendations,
        clarificationQuestions: parsed.clarificationQuestions,
      };
    } catch (error) {
      console.error('[Agent] OpenAI API call failed:', error);
      return mockAgentProvider.process(input);
    }
  },
};

function buildSystemPrompt(input: AgentInput): string {
  return `你是"饭小智（FanXiaoZhi）"，一个 AI 外卖决策助手。你的任务是通过自然对话帮助用户决定吃什么，并推荐合适的餐厅和餐品。

## 当前用户画像
- 口味偏好：辣度 ${input.userPreferences.spiceLevel}，喜好菜系 ${input.userPreferences.favoriteCuisines.join('、') || '未设置'}
- 忌口/过敏：${[...input.userPreferences.allergies, ...input.userPreferences.dislikedIngredients].join('、') || '未设置'}
- 预算范围：¥${input.userPreferences.budgetMin}-${input.userPreferences.budgetMax}
- 可用餐厅：${input.context.restaurantsCount} 家，餐品 ${input.context.menuItemsCount} 个

## 当前已提取需求
${JSON.stringify(input.currentRequirements, null, 2)}

## 输出格式
你必须返回一个 JSON 对象，包含：
- reply: 对用户的自然语言回复（中文，亲切友好）
- extractedRequirements: 从用户最新消息中提取的结构化需求片段
- mergedRequirements: 合并所有历史需求后的完整需求
- action: "recommend" | "ask_clarification" | "chat" | "blind_box" | "confirm_order"
- clarificationQuestions?: 如果需要追问的问题列表
- recommendations?: 推荐方案列表（如适用）

## 重要规则
1. 所有推荐必须遵守用户预算、忌口和配送时间要求
2. 每次最多推荐 3 个方案
3. 不要编造不存在的餐厅或餐品
4. 始终以用户利益为优先，不要过度推荐高价餐品
5. 友好、简洁、有温度的语气`;
}
