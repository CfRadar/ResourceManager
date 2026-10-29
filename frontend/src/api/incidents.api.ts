import { api } from './client';
import type { ApiResponse } from './auth.api';

export type IncidentType = 'DAMAGE' | 'DELAY' | 'CONFLICT' | 'SAFETY' | 'MISSING_ITEM' | 'OTHER';
export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'DISMISSED' | 'APPEALED';

export interface IncidentAttachment {
  url: string;
  name?: string;
  type?: string;
}

export interface IncidentTimelineNote {
  id: string;
  authorId: string;
  authorName?: string;
  authorRole?: string;
  content: string;
  visibility: 'INTERNAL' | 'SHARED';
  attachments?: IncidentAttachment[];
  createdAt: string;
}

export interface IncidentResolution {
  outcome: 'RESOLVED' | 'DISMISSED';
  findings: string;
  resolvedById?: string;
  resolvedByName?: string;
  reason: string;
  remedy?: {
    type: string;
    amount?: number;
    tokens?: number;
  };
  resolvedAt: string;
}

export interface IncidentConditionComparison {
  before?: {
    rating: number;
    notes?: string;
    photoUrls?: string[];
    accessoriesVerified?: boolean;
    timestamp?: string;
  };
  after?: {
    rating: number;
    notes?: string;
    photoUrls?: string[];
    accessoriesMissing?: string[];
    timestamp?: string;
  };
}

export interface AiIncidentSummary {
  incidentId: string;
  recordedFacts: string[];
  unverifiedClaims: string[];
  eventSources: Array<{ event: string; timestamp?: string; source: string }>;
  suggestedFindings: string;
  recommendedRemedyType?: string;
  recommendedTokensAdjustment?: number;
}

export interface Incident {
  id: string;
  reporterId: string;
  reporterName?: string;
  bookingId?: string;
  serviceRequestId?: string;
  resourceId?: string;
  resourceName?: string;
  type: IncidentType;
  severityByReporter?: IncidentSeverity;
  status: IncidentStatus;
  description: string;
  attachments?: IncidentAttachment[];
  occurredAt?: string;
  notes?: IncidentTimelineNote[];
  resolution?: IncidentResolution;
  conditionComparison?: IncidentConditionComparison;
  appealCount?: number;
  appealReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export const incidentsApi = {
  async fileIncident(data: {
    bookingId?: string;
    serviceRequestId?: string;
    type: IncidentType;
    description: string;
    severityByReporter?: IncidentSeverity;
    attachments?: IncidentAttachment[];
    occurredAt?: string;
  }): Promise<ApiResponse<Incident>> {
    const res = await api.post<ApiResponse<Incident>>('/incidents', data);
    return res.data;
  },

  async fetchMyIncidents(params?: { status?: string; type?: string; page?: number; limit?: number }): Promise<ApiResponse<Incident[]>> {
    const res = await api.get<ApiResponse<Incident[]>>('/incidents/mine', { params });
    return res.data;
  },

  async fetchIncidentById(id: string): Promise<ApiResponse<Incident>> {
    const res = await api.get<ApiResponse<Incident>>(`/incidents/${id}`);
    return res.data;
  },

  async addNote(id: string, data: {
    content: string;
    visibility?: 'INTERNAL' | 'SHARED';
    attachments?: IncidentAttachment[];
  }): Promise<ApiResponse<IncidentTimelineNote>> {
    const res = await api.post<ApiResponse<IncidentTimelineNote>>(`/incidents/${id}/notes`, data);
    return res.data;
  },

  async requestInfo(id: string, message: string): Promise<ApiResponse<{ requested: boolean }>> {
    const res = await api.post<ApiResponse<{ requested: boolean }>>(`/incidents/${id}/request-info`, { message });
    return res.data;
  },

  async respondInfo(id: string, data: {
    responseContent: string;
    attachments?: IncidentAttachment[];
  }): Promise<ApiResponse<{ recorded: boolean }>> {
    const res = await api.post<ApiResponse<{ recorded: boolean }>>(`/incidents/${id}/respond`, data);
    return res.data;
  },

  async resolveIncident(id: string, data: {
    outcome: 'RESOLVED' | 'DISMISSED';
    findings: string;
    reason: string;
    remedy?: {
      type: string;
      amount?: number;
      tokens?: number;
    };
  }): Promise<ApiResponse<Incident>> {
    const res = await api.post<ApiResponse<Incident>>(`/incidents/${id}/resolve`, data);
    return res.data;
  },

  async appealRuling(id: string, appealReason: string): Promise<ApiResponse<Incident>> {
    const res = await api.post<ApiResponse<Incident>>(`/incidents/${id}/appeal`, { appealReason });
    return res.data;
  },

  async draftAiSummary(id: string): Promise<ApiResponse<AiIncidentSummary>> {
    const res = await api.post<ApiResponse<AiIncidentSummary>>(`/incidents/${id}/draft-summary`);
    return res.data;
  },
};

