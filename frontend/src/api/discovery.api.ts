import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface ResourcePolicySummary {
  version: number;
  supportedAccessModes?: string[];
  pricingModel?: string;
  hourlyRate?: number;
  tokensPerHour?: number;
  requiresApproval?: boolean;
}

export interface ResourceItem {
  id: string;
  name: string;
  category: string;
  description?: string;
  facilityId?: string;
  facility_name?: string;
  facility_city?: string;
  institution_name?: string;
  status: string;
  visibility?: string;
  riskLevel?: string;
  capabilities?: string[];
  specs?: Record<string, unknown>;
  policySummary?: ResourcePolicySummary;
}

export interface ResourceMatch {
  resourceId: string;
  name?: string;
  category?: string;
  score?: number;
  matchType?: 'AVAILABLE_LISTING' | 'POTENTIAL_MATCH' | 'INACTIVE' | string;
  reasons?: string[];
  caveats?: string[];
  matchedFields?: string[];
  source?: string;
  resource?: ResourceItem;
}

export interface ParsedNeedItem {
  need: string;
  categories?: string[];
  capabilities?: string[];
  accessModePreference?: string;
}

export interface ParsedNeedData {
  originalText?: string;
  detectedKeywords?: string[];
  items?: ParsedNeedItem[];
}

export interface EmptyMatchGuidance {
  canSubmitNeedRequest: boolean;
  submitUrl: string;
  message: string;
}

export interface MatchNeedResponseData {
  ok?: boolean;
  parsedNeed?: ParsedNeedData;
  matches: ResourceMatch[];
  rankedResources?: ResourceMatch[];
  unmatchedNeeds?: string[];
  source: 'AI' | 'AI_EMBEDDING' | 'KEYWORD_FALLBACK' | string;
  emptyMatchGuidance?: EmptyMatchGuidance | null;
}

export interface ResourceSearchParams {
  q?: string;
  category?: string;
  accessMode?: string;
  facilityId?: string;
  institutionId?: string;
  page?: number;
  pageSize?: number;
}

export const discoveryApi = {
  searchResources: async (params?: ResourceSearchParams) => {
    const res = await api.get<ApiResponse<ResourceItem[]>>('/resources', { params });
    return res.data;
  },

  matchNeedWithAi: async (text: string) => {
    const res = await api.post<ApiResponse<MatchNeedResponseData>>('/ai/match-need', { text });
    return res.data;
  },

  parseNeed: async (text: string) => {
    const res = await api.post<ApiResponse<Record<string, unknown>>>('/ai/parse-need', { text });
    return res.data;
  },
};

