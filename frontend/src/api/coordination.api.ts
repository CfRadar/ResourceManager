import { api } from './client';
import type { ApiResponse } from './auth.api';

export type AccessMode = 'INDEPENDENT' | 'SUPERVISED' | 'STAFF_SERVICE' | 'COLLABORATION';

export interface NeedRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  institutionId?: string;
  institutionName?: string;
  capabilityNeeded: string;
  category?: string;
  description: string;
  technicalRequirements: string[];
  requiredCapabilities: string[];
  locationPreference?: string;
  travelRadiusKm?: number;
  preferredDates?: { start?: string; end?: string };
  accessModePreference?: AccessMode;
  consentShareContact: boolean;
  status: 'SUBMITTED' | 'TRIAGED' | 'MATCHED' | 'REFERRED' | 'CLOSED_MET' | 'CLOSED_UNMET';
  createdAt: string;
  updatedAt?: string;
}

export interface NeedCandidate {
  resourceId: string;
  resourceName: string;
  institutionId: string;
  institutionName: string;
  facilityName?: string;
  matchScore: number;
  matchReasons: string[];
  accessModes: string[];
  estimatedDistanceKm?: number;
  availableSlotCount?: number;
  pricingRate?: number;
  currency?: string;
}

export interface Referral {
  id: string;
  needRequestId: string;
  fromInstitutionId: string;
  fromInstitutionName?: string;
  toInstitutionId: string;
  toInstitutionName?: string;
  toFacilityId?: string;
  toFacilityName?: string;
  resourceId?: string;
  resourceName?: string;
  status: 'PROPOSED' | 'ACCEPTED' | 'DECLINED' | 'CONVERTED';
  messageToReceiver: string;
  shareRequesterContact: boolean;
  contactReleased: boolean;
  requesterContact?: {
    name: string;
    email: string;
    phone?: string;
    department?: string;
  };
  responseMessage?: string;
  nextSteps?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ServiceQuoteLineItem {
  description: string;
  cost: number;
  currency?: string;
}

export interface ServiceQuote {
  id: string;
  serviceRequestId: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  lineItems: ServiceQuoteLineItem[];
  totalCost: number;
  currency: string;
  notes?: string;
  validUntil?: string;
  createdAt: string;
}

export interface ServiceDeliverable {
  title: string;
  fileUrl?: string;
  notes?: string;
}

export type ServiceMilestone =
  | 'SUBMITTED'
  | 'SCOPE_REVIEWED'
  | 'QUOTE_SENT'
  | 'QUOTE_ACCEPTED'
  | 'MATERIALS_RECEIVED'
  | 'IN_PROGRESS'
  | 'OUTPUT_DELIVERED'
  | 'COMPLETED'
  | 'DISPUTED'
  | 'REJECTED'
  | 'CANCELLED';

export interface ServiceRequest {
  id: string;
  requesterId: string;
  requesterName?: string;
  resourceId: string;
  resourceName?: string;
  institutionName?: string;
  facilityName?: string;
  status: ServiceMilestone;
  description: string;
  expectedOutput?: string;
  submittedMaterials?: {
    sampleType?: string;
    quantity?: string;
    storageConditions?: string;
    hazardNotice?: string;
  };
  estimatedTimeline?: {
    desiredDate?: string;
    flexibility?: string;
  };
  budget?: number;
  activeQuote?: ServiceQuote;
  sampleIntake?: {
    receivedAt?: string;
    operatorName?: string;
    intakePhotoUrl?: string;
    conditionRating?: number;
    notes?: string;
  };
  deliverables?: ServiceDeliverable[];
  deliverySummary?: string;
  completionConfirmed?: boolean;
  disputeReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ParseNeedAiResponse {
  capabilityNeeded?: string;
  category?: string;
  description?: string;
  technicalRequirements?: string[];
  requiredCapabilities?: string[];
  locationPreference?: string;
  accessModePreference?: AccessMode;
}

export const coordinationApi = {
  // AI Proxy Natural Language Need Parsing
  async parseNeedWithAi(text: string): Promise<ApiResponse<ParseNeedAiResponse>> {
    const res = await api.post<ApiResponse<ParseNeedAiResponse>>('/ai/parse-need', { text });
    return res.data;
  },

  // Missing-Resource Need Requests
  async createNeedRequest(data: {
    description: string;
    capabilityNeeded?: string;
    category?: string;
    technicalRequirements?: string[];
    requiredCapabilities?: string[];
    locationPreference?: string;
    travelRadiusKm?: number;
    preferredDates?: any;
    accessModePreference?: AccessMode;
    consentShareContact: boolean;
    asDraft?: boolean;
  }): Promise<ApiResponse<NeedRequest>> {
    const res = await api.post<ApiResponse<NeedRequest>>('/need-requests', data);
    return res.data;
  },

  async fetchMyNeedRequests(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<NeedRequest[]>> {
    const res = await api.get<ApiResponse<NeedRequest[]>>('/need-requests/mine', { params });
    return res.data;
  },

  async fetchCoordinatorNeedRequests(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<NeedRequest[]>> {
    const res = await api.get<ApiResponse<NeedRequest[]>>('/need-requests', { params });
    return res.data;
  },

  async fetchNeedRequestById(id: string): Promise<ApiResponse<NeedRequest>> {
    const res = await api.get<ApiResponse<NeedRequest>>(`/need-requests/${id}`);
    return res.data;
  },

  async fetchNeedCandidates(id: string): Promise<ApiResponse<NeedCandidate[]>> {
    const res = await api.get<ApiResponse<NeedCandidate[]>>(`/need-requests/${id}/candidates`);
    return res.data;
  },

  async createReferral(needRequestId: string, data: {
    toInstitutionId: string;
    toFacilityId?: string;
    resourceId?: string;
    messageToReceiver: string;
    shareRequesterContact?: boolean;
  }): Promise<ApiResponse<Referral>> {
    const res = await api.post<ApiResponse<Referral>>(`/need-requests/${needRequestId}/referrals`, data);
    return res.data;
  },

  async closeNeedRequest(id: string, data: {
    outcome: 'CLOSED_MET' | 'CLOSED_UNMET';
    closeReason: string;
  }): Promise<ApiResponse<NeedRequest>> {
    const res = await api.post<ApiResponse<NeedRequest>>(`/need-requests/${id}/close`, data);
    return res.data;
  },

  // Referrals
  async fetchReferralsInbox(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<Referral[]>> {
    const res = await api.get<ApiResponse<Referral[]>>('/referrals/inbox', { params });
    return res.data;
  },

  async fetchReferralById(id: string): Promise<ApiResponse<Referral>> {
    const res = await api.get<ApiResponse<Referral>>(`/referrals/${id}`);
    return res.data;
  },

  async respondToReferral(id: string, data: {
    response: 'ACCEPT' | 'DECLINE';
    responseMessage: string;
    nextSteps?: string;
  }): Promise<ApiResponse<Referral>> {
    const res = await api.post<ApiResponse<Referral>>(`/referrals/${id}/respond`, data);
    return res.data;
  },

  async releaseReferralContact(id: string, note?: string): Promise<ApiResponse<Referral>> {
    const res = await api.post<ApiResponse<Referral>>(`/referrals/${id}/release-contact`, { note });
    return res.data;
  },

  // Staff-Operated Service Requests
  async createServiceRequest(data: {
    resourceId: string;
    description: string;
    expectedOutput?: string;
    submittedMaterials?: any;
    estimatedTimeline?: any;
    budget?: number;
    asDraft?: boolean;
  }): Promise<ApiResponse<ServiceRequest>> {
    const res = await api.post<ApiResponse<ServiceRequest>>('/service-requests', data);
    return res.data;
  },

  async fetchMyServiceRequests(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<ServiceRequest[]>> {
    const res = await api.get<ApiResponse<ServiceRequest[]>>('/service-requests/mine', { params });
    return res.data;
  },

  async fetchServiceRequestById(id: string): Promise<ApiResponse<ServiceRequest>> {
    const res = await api.get<ApiResponse<ServiceRequest>>(`/service-requests/${id}`);
    return res.data;
  },

  async respondToQuote(id: string, data: {
    decision: 'ACCEPT' | 'DECLINE';
    note?: string;
  }): Promise<ApiResponse<ServiceRequest>> {
    const res = await api.post<ApiResponse<ServiceRequest>>(`/service-requests/${id}/quote/respond`, data);
    return res.data;
  },

  async confirmServiceCompletion(id: string, data: {
    confirmed: boolean;
    disputeReason?: string;
  }): Promise<ApiResponse<ServiceRequest>> {
    const res = await api.post<ApiResponse<ServiceRequest>>(`/service-requests/${id}/confirm-completion`, data);
    return res.data;
  },
};

