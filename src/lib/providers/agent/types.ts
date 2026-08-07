import { ExtractedRequirements, RecommendationResult, BlindBoxResult } from '@/types';

export interface AgentInput {
  userMessage: string;
  conversationHistory: Array<{ role: string; content: string }>;
  currentRequirements: ExtractedRequirements;
  userPreferences: {
    spiceLevel: string;
    allergies: string[];
    dislikedIngredients: string[];
    budgetMin: number;
    budgetMax: number;
    favoriteCuisines: string[];
  };
  context: {
    restaurantsCount: number;
    menuItemsCount: number;
    availableCuisines: string[];
  };
}

export interface AgentOutput {
  reply: string;
  extractedRequirements: Partial<ExtractedRequirements>;
  mergedRequirements: ExtractedRequirements;
  action: 'recommend' | 'ask_clarification' | 'confirm_order' | 'blind_box' | 'chat';
  recommendations?: RecommendationResult[];
  blindBoxResult?: BlindBoxResult;
  clarificationQuestions?: string[];
}

export interface AgentProvider {
  name: string;
  process(input: AgentInput): Promise<AgentOutput>;
}
