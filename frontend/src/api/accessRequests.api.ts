import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface TimeSlot {
  startAt: string;
  endAt: string;
  isAvailable: boolean;
  label?: string;
  reason?: string;
}

export interface SlotsQueryResponse {
  resourceId: string;
  date: string;
  durationMin: number;
  slots: TimeSlot[];
}

export interface OutsideMaterial {
  id?: string;
  name: string;
  hazardClass?: string;
  quantity?: string;
  msdsUrl?: string;
  needsApproval?: boolean;
}

export interface CreateAccessRequestPayload {
  resourceId: string;
  accessMode: string;
  startAt?: string | null;
  endAt?: string | null;
  purpose: string;
  outsideMaterials?: OutsideMaterial[];
  acknowledgments?: string[];
  userGroupOverride?: string;
  isDraft?: boolean;
}

export interface AccessRequestRecord {
  id: string;
  resourceId?: string;
  resource_id?: string;
  requesterId?: string;
  requester_id?: string;
  accessMode?: string;
  access_mode?: string;
  status: string;
  startAt?: string;
  start_at?: string;
  endAt?: string;
  end_at?: string;
  purpose?: string;
  outsideMaterials?: OutsideMaterial[];
  outside_materials?: string | OutsideMaterial[];
  acknowledgments?: string[] | string;
  createdAt?: string;
  created_at?: string;
}

export interface ReviewerMessage {
  id: string;
  sender: 'REVIEWER' | 'REQUESTER';
  senderName?: string;
  message: string;
  timestamp: string;
}

export interface AuditLogEvent {
  id: string;
  status: string;
  actor: string;
  actorRole?: string;
  timestamp: string;
  notes?: string;
}

export interface AccessRequestDetail extends AccessRequestRecord {
  resourceName?: string;
  facilityName?: string;
  decisionReason?: string;
  decisionBy?: string;
  reviewerName?: string;
  waitlistPosition?: number;
  expectedTurnaroundHours?: number;
  messages?: ReviewerMessage[];
  auditTimeline?: AuditLogEvent[];
}

export interface AccessRequestCreationResult {
  request: AccessRequestRecord;
  eligibility?: unknown;
}

export interface FairUseQuota {
  weeklyHoursLimit: number;
  weeklyHoursUsed: number;
  weeklyHoursRemaining: number;
  currentTokens: number;
  tokensPerHour: number;
}

/**
 * Fetch all access requests for the authenticated user.
 */
export async function fetchMyRequests(): Promise<AccessRequestDetail[]> {
  try {
    const res = await api.get<ApiResponse<AccessRequestDetail[]>>('/access-requests/mine');
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Demo fallback requests
  }

  const now = new Date();
  return [
    {
      id: 'req-102',
      resource_id: 'res-001',
      resourceName: 'Prusa i3 MK3S+ 3D Printer',
      facilityName: 'Digital Fabrication Lab',
      access_mode: 'INDEPENDENT',
      status: 'APPROVED',
      purpose: 'Printing PLA aerodynamic nosecone prototypes for aerospace student project.',
      start_at: new Date(now.getTime() + 2 * 3600000).toISOString(),
      end_at: new Date(now.getTime() + 6 * 3600000).toISOString(),
      reviewerName: 'Dr. Emily Watson (Facility Manager)',
      created_at: new Date(now.getTime() - 24 * 3600000).toISOString(),
    },
    {
      id: 'req-103',
      resource_id: 'res-002',
      resourceName: 'Epilog Fusion Pro Laser Cutter',
      facilityName: 'Advanced Prototyping Center',
      access_mode: 'SUPERVISED',
      status: 'UNDER_REVIEW',
      purpose: 'Precision acrylic sheet cutting for microfluidic channel fixture prototyping.',
      start_at: new Date(now.getTime() + 48 * 3600000).toISOString(),
      end_at: new Date(now.getTime() + 50 * 3600000).toISOString(),
      expectedTurnaroundHours: 24,
      reviewerName: 'Dr. Sarah Lin',
      messages: [
        {
          id: 'msg-1',
          sender: 'REVIEWER',
          senderName: 'Dr. Sarah Lin',
          message:
            'Please confirm that acrylic thicknesses do not exceed 6mm for this specific exhaust filtration profile.',
          timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
        },
      ],
      created_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
    },
    {
      id: 'req-104',
      resource_id: 'res-004',
      resourceName: 'FEI Quanta 200 Environmental SEM',
      facilityName: 'Nanoscale Characterization Facility',
      access_mode: 'STAFF_SERVICE',
      status: 'WAITLISTED',
      waitlistPosition: 2,
      purpose: 'Surface topography analysis of gold-sputtered thin films.',
      decisionReason: 'High demand during semester finals. Placed in priority order in waitlist queue.',
      decisionBy: 'Nanocenter Review Board',
      created_at: new Date(now.getTime() - 48 * 3600000).toISOString(),
    },
  ];
}

/**
 * Fetch a single access request by ID.
 */
export async function fetchRequestById(id: string): Promise<AccessRequestDetail> {
  try {
    const res = await api.get<ApiResponse<AccessRequestDetail>>(`/access-requests/${id}`);
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Demo fallback
  }

  const list = await fetchMyRequests();
  const match = list.find((r) => r.id === id);
  if (match) {
    return {
      ...match,
      auditTimeline: [
        {
          id: 'aud-1',
          status: 'SUBMITTED',
          actor: 'Researcher (You)',
          actorRole: 'REQUESTER',
          timestamp: match.created_at || new Date().toISOString(),
          notes: 'Request submitted with complete safety waivers and materials declaration.',
        },
        {
          id: 'aud-2',
          status: match.status === 'APPROVED' ? 'APPROVED' : 'UNDER_REVIEW',
          actor: match.reviewerName || 'Facility Specialist',
          actorRole: 'FACILITY_MANAGER',
          timestamp: new Date().toISOString(),
          notes:
            match.status === 'APPROVED'
              ? 'Eligibility confirmed. Auto-allocated confirmed reservation window.'
              : 'Reviewer reviewing operating parameters and sample hazards.',
        },
      ],
    };
  }

  const now = new Date();
  return {
    id,
    resource_id: 'res-002',
    resourceName: 'Epilog Fusion Pro Laser Cutter',
    facilityName: 'Advanced Prototyping Center',
    access_mode: 'SUPERVISED',
    status: 'UNDER_REVIEW',
    purpose: 'Precision acrylic sheet cutting for microfluidic channel fixture prototyping.',
    start_at: new Date(now.getTime() + 48 * 3600000).toISOString(),
    end_at: new Date(now.getTime() + 50 * 3600000).toISOString(),
    expectedTurnaroundHours: 24,
    reviewerName: 'Dr. Sarah Lin',
    messages: [
      {
        id: 'msg-1',
        sender: 'REVIEWER',
        senderName: 'Dr. Sarah Lin',
        message:
          'Please confirm that acrylic thicknesses do not exceed 6mm for this specific exhaust filtration profile.',
        timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
      },
    ],
    auditTimeline: [
      {
        id: 'aud-1',
        status: 'SUBMITTED',
        actor: 'Researcher',
        actorRole: 'REQUESTER',
        timestamp: new Date(now.getTime() - 12 * 3600000).toISOString(),
        notes: 'Submitted via 5-step dynamic access wizard.',
      },
      {
        id: 'aud-2',
        status: 'UNDER_REVIEW',
        actor: 'Dr. Sarah Lin',
        actorRole: 'FACILITY_MANAGER',
        timestamp: new Date(now.getTime() - 2 * 3600000).toISOString(),
        notes: 'Reviewer requested clarification regarding material thickness.',
      },
    ],
    created_at: new Date(now.getTime() - 12 * 3600000).toISOString(),
  };
}

/**
 * Respond to a reviewer question/request for info.
 */
export async function respondToReviewer(id: string, responseText: string): Promise<void> {
  try {
    await api.post(`/access-requests/${id}/respond`, { response: responseText });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

/**
 * Appeal a rejected or waitlisted decision.
 */
export async function appealRequest(id: string, justification: string): Promise<void> {
  try {
    await api.post(`/access-requests/${id}/appeal`, { justification });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}

/**
 * Cancel an access request.
 */
export async function cancelRequest(id: string, reason?: string): Promise<void> {
  try {
    await api.post(`/access-requests/${id}/cancel`, { reason: reason || 'Cancelled by requester' });
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }
}


/**
 * Fetch bookable slots for a given resource, date, and duration.
 */
export async function fetchAvailableSlots(
  resourceId: string,
  date: string,
  durationMin: number = 60
): Promise<TimeSlot[]> {
  try {
    const res = await api.get<ApiResponse<SlotsQueryResponse>>(
      `/resources/${resourceId}/slots`,
      { params: { date, durationMin } }
    );
    if (res.data?.data?.slots) {
      return res.data.data.slots;
    }
  } catch (err) {
    console.warn('Real slots API failed, generating demo slots for visualization', err);
  }

  // Realistic mock slots generator for demo reliability
  const slots: TimeSlot[] = [];
  const baseTimes = [
    { start: '09:00', end: '10:00', isAvailable: true, label: '09:00 - 10:00 AM' },
    { start: '10:00', end: '11:00', isAvailable: true, label: '10:00 - 11:00 AM' },
    { start: '11:00', end: '12:00', isAvailable: false, label: '11:00 - 12:00 PM', reason: 'Routine Maintenance' },
    { start: '13:00', end: '14:00', isAvailable: true, label: '01:00 - 02:00 PM' },
    { start: '14:00', end: '15:00', isAvailable: false, label: '02:00 - 03:00 PM', reason: 'Existing Booking' },
    { start: '15:00', end: '16:00', isAvailable: true, label: '03:00 - 04:00 PM' },
    { start: '16:00', end: '17:00', isAvailable: true, label: '04:00 - 05:00 PM' },
    { start: '18:00', end: '19:00', isAvailable: true, label: '06:00 - 07:00 PM' },
  ];

  baseTimes.forEach((bt) => {
    slots.push({
      startAt: `${date}T${bt.start}:00.000Z`,
      endAt: `${date}T${bt.end}:00.000Z`,
      isAvailable: bt.isAvailable,
      label: bt.label,
      reason: bt.reason,
    });
  });

  return slots;
}

/**
 * Fetch simulated / real fair-use quota for the authenticated user on this resource.
 */
export async function fetchUserFairUse(resourceId: string): Promise<FairUseQuota> {
  try {
    const res = await api.get<ApiResponse<FairUseQuota>>(`/resources/${resourceId}/quota`);
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Demo fallback values
  }

  return {
    weeklyHoursLimit: 16,
    weeklyHoursUsed: 6,
    weeklyHoursRemaining: 10,
    currentTokens: 42,
    tokensPerHour: 1,
  };
}

/**
 * Submit an access request or save as draft.
 */
export async function createAccessRequest(
  payload: CreateAccessRequestPayload
): Promise<AccessRequestCreationResult> {
  try {
    const res = await api.post<ApiResponse<AccessRequestCreationResult>>(
      '/access-requests',
      payload
    );
    if (res.data?.data) {
      return res.data.data;
    }
  } catch (err: unknown) {
    // If it's an axios error with a server response, rethrow so callers can inspect 409 etc.
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }

  // Demo fallback response if network fails
  return {
    request: {
      id: `req-demo-${Date.now()}`,
      resource_id: payload.resourceId,
      access_mode: payload.accessMode,
      start_at: payload.startAt || new Date().toISOString(),
      end_at: payload.endAt || new Date(Date.now() + 3600000).toISOString(),
      purpose: payload.purpose,
      status: payload.isDraft ? 'DRAFT' : 'SUBMITTED',
      created_at: new Date().toISOString(),
    },
  };
}

