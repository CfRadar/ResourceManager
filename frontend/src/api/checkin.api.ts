import { api } from './client';
import type { ApiResponse } from './auth.api';

export interface SignatureData {
  type: 'TYPED' | 'DRAWN';
  text?: string;
  pngDataUrl?: string;
}

export interface GeoLocationData {
  lat: number;
  lng: number;
  accuracy?: number;
}

export interface ConditionReportInput {
  rating: number; // 1 to 5
  notes?: string;
  photos?: string[];
}

export interface CheckInPayload {
  equipmentUnitId?: string;
  accessories?: string[];
  consumables?: string[];
  conditionReport: ConditionReportInput;
  signature: SignatureData;
  geo?: GeoLocationData | null;
}

export interface CheckOutPayload {
  conditionReport: ConditionReportInput;
  accessoriesReturned?: string[];
  consumablesUsed?: string[];
  signature: SignatureData;
  geo?: GeoLocationData | null;
}

export interface StoredConditionReport {
  id?: string;
  bookingId?: string;
  reportType: 'BEFORE' | 'AFTER';
  rating: number;
  notes: string;
  cleanlinessScore: number;
  accessoriesConfirmed?: string[];
  photos?: string[];
  signature?: SignatureData;
  geo?: GeoLocationData | null;
  createdAt: string;
}

export interface ConditionReportsResponse {
  bookingId: string;
  beforeReport: StoredConditionReport | null;
  afterReport: StoredConditionReport | null;
  hasDegradation?: boolean;
}

/**
 * Perform physical check-in for a booking.
 */
export async function submitCheckIn(
  bookingId: string,
  payload: CheckInPayload
): Promise<StoredConditionReport> {
  try {
    const res = await api.post<ApiResponse<StoredConditionReport>>(
      `/bookings/${bookingId}/check-in`,
      payload
    );
    if (res.data?.data) {
      return res.data.data;
    }
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }

  // Demo fallback response
  return {
    bookingId,
    reportType: 'BEFORE',
    rating: payload.conditionReport.rating,
    notes: payload.conditionReport.notes || 'Checked in with verified condition report.',
    cleanlinessScore: payload.conditionReport.rating,
    accessoriesConfirmed: payload.accessories,
    signature: payload.signature,
    geo: payload.geo,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Perform return / check-out inspection for a booking.
 */
export async function submitCheckOut(
  bookingId: string,
  payload: CheckOutPayload
): Promise<StoredConditionReport> {
  try {
    const res = await api.post<ApiResponse<StoredConditionReport>>(
      `/bookings/${bookingId}/check-out`,
      payload
    );
    if (res.data?.data) {
      return res.data.data;
    }
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'response' in err) {
      throw err;
    }
  }

  // Demo fallback response
  return {
    bookingId,
    reportType: 'AFTER',
    rating: payload.conditionReport.rating,
    notes: payload.conditionReport.notes || 'Returned instrument.',
    cleanlinessScore: payload.conditionReport.rating,
    accessoriesConfirmed: payload.accessoriesReturned,
    signature: payload.signature,
    geo: payload.geo,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Fetch condition reports for a booking (before and after diff).
 */
export async function fetchConditionReports(
  bookingId: string
): Promise<ConditionReportsResponse> {
  try {
    const res = await api.get<ApiResponse<ConditionReportsResponse>>(
      `/bookings/${bookingId}/condition-reports`
    );
    if (res.data?.data) {
      return res.data.data;
    }
  } catch {
    // Demo fallback
  }

  const now = new Date();
  return {
    bookingId,
    beforeReport: {
      reportType: 'BEFORE',
      rating: 5,
      notes: 'Clean build surface, PEI sheet wiped down with alcohol, zero filament debris.',
      cleanlinessScore: 5,
      accessoriesConfirmed: ['Safety Goggles', 'Tool Kit', 'Brass Wire Brush', 'Power Cord'],
      createdAt: new Date(now.getTime() - 4 * 3600000).toISOString(),
    },
    afterReport: null,
    hasDegradation: false,
  };
}

