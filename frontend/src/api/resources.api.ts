import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface EligibilityCheckAction {
  type: string;
  label?: string;
  url?: string;
}

export interface EligibilityCheck {
  key: string;
  label: string;
  status: 'PASS' | 'FAIL' | 'MISSING';
  reason?: string;
  details?: Record<string, unknown>;
  action?: EligibilityCheckAction;
}

export interface EligibilityResult {
  eligible: boolean;
  canRequest: boolean;
  checks: EligibilityCheck[];
  requiredNextSteps: string[];
}

export interface ResourcePolicyData {
  accessModes?: string[];
  supportedAccessModes?: string[];
  maxSingleBookingHours?: number;
  maxWeeklyHours?: number;
  advanceBookingDays?: number;
  cancellationNoticeHours?: number;
  requiredTrainings?: string[];
  requiredDocuments?: string[];
  requiresStaffSupervision?: boolean;
  prohibitedActivities?: string[];
  pricing?: {
    model?: string;
    tokensPerHour?: number;
    hourlyRate?: number;
  };
}

export interface ResourceFacility {
  id: string;
  name: string;
  address?: string;
  institutionId?: string;
  institutionName?: string;
  city?: string;
  timezone?: string;
  geofenceRadiusMeters?: number;
}

export interface ResourceDetail {
  id: string;
  name: string;
  category: string;
  description?: string;
  facility_name?: string;
  facility_city?: string;
  institution_name?: string;
  facility?: ResourceFacility;
  status: string;
  visibility?: string;
  risk_level?: string;
  riskLevel?: string;
  capabilities?: string[];
  specs?: Record<string, unknown>;
  policy_data?: ResourcePolicyData;
  policySummary?: {
    version: number;
    supportedAccessModes?: string[];
    pricingModel?: string;
    tokensPerHour?: number;
    hourlyRate?: number;
    requiresApproval?: boolean;
  };
  confidentialDetails?: {
    doorCode?: string;
    lockboxPin?: string;
    specialInstructions?: string;
  };
}

export const resourcesApi = {
  getResourceById: async (id: string) => {
    const res = await api.get<ApiResponse<ResourceDetail>>(`/resources/${id}`);
    return res.data;
  },

  checkEligibility: async (
    resourceId: string,
    options?: { accessMode?: string; startAt?: string; endAt?: string }
  ) => {
    const res = await api.post<ApiResponse<EligibilityResult>>(
      `/resources/${resourceId}/eligibility-check`,
      options || {}
    );
    return res.data;
  },
};

