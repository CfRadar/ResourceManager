import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { fetchAvailableSlots, type TimeSlot } from '../../api/accessRequests.api';

interface SlotPickerProps {
  resourceId: string;
  selectedStartAt: string | null;
  selectedEndAt: string | null;
  onSelectSlot: (startAt: string, endAt: string) => void;
  conflictAlternativeSlots?: TimeSlot[];
}

export const SlotPicker: React.FC<SlotPickerProps> = ({
  resourceId,
  selectedStartAt,
  selectedEndAt,
  onSelectSlot,
  conflictAlternativeSlots = [],
}) => {
  // Generate next 7 days for the date selector
  const days = React.useMemo(() => {
    const list: Array<{ label: string; dateStr: string; dayName: string; dayNum: number }> = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : dayName;
      list.push({ label, dateStr, dayName, dayNum });
    }
    return list;
  }, []);

  const [selectedDate, setSelectedDate] = useState<string>(days[0].dateStr);
  const [durationMin, setDurationMin] = useState<number>(60);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedOccupiedSlot, setSelectedOccupiedSlot] = useState<TimeSlot | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadSlots() {
      setIsLoading(true);
      try {
        const fetched = await fetchAvailableSlots(resourceId, selectedDate, durationMin);
        if (isMounted) {
          setSlots(fetched);
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadSlots();
    return () => {
      isMounted = false;
    };
  }, [resourceId, selectedDate, durationMin]);

  // Group slots into Morning, Afternoon, Evening
  const groupedSlots = React.useMemo(() => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    slots.forEach((s) => {
      const hour = new Date(s.startAt).getUTCHours();
      if (hour < 12) {
        morning.push(s);
      } else if (hour < 17) {
        afternoon.push(s);
      } else {
        evening.push(s);
      }
    });

    return { morning, afternoon, evening };
  }, [slots]);

  const availableAlternatives = React.useMemo(() => {
    if (conflictAlternativeSlots.length > 0) return conflictAlternativeSlots;
    return slots.filter((s) => s.isAvailable).slice(0, 3);
  }, [conflictAlternativeSlots, slots]);

  const formatSlotTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'UTC',
    });
  };

  return (
    <div className="space-y-6">
      {/* Date & Duration Row */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-blue-600" />
            Select Reservation Date
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Times shown in local lab timezone (UTC). Minimum lead notice applied.
          </p>
        </div>

        {/* Duration selector */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> Duration:
          </span>
          {[60, 120, 240].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => setDurationMin(mins)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all ${
                durationMin === mins
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {mins / 60}h
            </button>
          ))}
        </div>
      </div>

      {/* 7-day tabs */}
      <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {days.map((day) => {
          const isSelected = selectedDate === day.dateStr;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => {
                setSelectedDate(day.dateStr);
                setSelectedOccupiedSlot(null);
              }}
              className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                isSelected
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 ring-2 ring-blue-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-[11px] font-medium text-slate-500">{day.label}</span>
              <span className="text-sm font-bold mt-0.5">{day.dayNum}</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                {day.dayName}
              </span>
            </button>
          );
        })}
      </div>

      {/* Occupied Warning Banner & Quick Alternatives */}
      {selectedOccupiedSlot && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
          <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Selected slot ({formatSlotTime(selectedOccupiedSlot.startAt)} - {formatSlotTime(selectedOccupiedSlot.endAt)}) is occupied: {selectedOccupiedSlot.reason || 'Existing reservation'}.
            </span>
          </div>
          {availableAlternatives.length > 0 && (
            <div className="pt-2">
              <span className="text-[11px] font-bold text-amber-900 block mb-1.5">
                Suggested alternatives available on this day:
              </span>
              <div className="flex flex-wrap gap-2">
                {availableAlternatives.map((alt) => (
                  <button
                    key={alt.startAt}
                    type="button"
                    onClick={() => {
                      setSelectedOccupiedSlot(null);
                      onSelectSlot(alt.startAt, alt.endAt);
                    }}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    {formatSlotTime(alt.startAt)} - {formatSlotTime(alt.endAt)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Slots Grid */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-xs">Checking availability & calculating slots...</span>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Morning Slots */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                🌅 Morning (08:00 - 12:00)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ({groupedSlots.morning.filter((s) => s.isAvailable).length} available)
              </span>
            </div>
            {groupedSlots.morning.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled slots</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {groupedSlots.morning.map((slot) => renderSlotButton(slot))}
              </div>
            )}
          </div>

          {/* Afternoon Slots */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                ☀️ Afternoon (12:00 - 17:00)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ({groupedSlots.afternoon.filter((s) => s.isAvailable).length} available)
              </span>
            </div>
            {groupedSlots.afternoon.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled slots</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {groupedSlots.afternoon.map((slot) => renderSlotButton(slot))}
              </div>
            )}
          </div>

          {/* Evening Slots */}
          <div>
            <div className="flex items-center gap-2 mb-2.5">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                🌙 Evening (17:00 - 21:00)
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                ({groupedSlots.evening.filter((s) => s.isAvailable).length} available)
              </span>
            </div>
            {groupedSlots.evening.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No scheduled slots</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {groupedSlots.evening.map((slot) => renderSlotButton(slot))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Selected slot confirmation banner */}
      {selectedStartAt && selectedEndAt && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CheckCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <div>
              <span className="text-xs font-bold text-blue-900 block">
                Selected Booking Window:
              </span>
              <span className="text-xs text-blue-700 font-medium">
                {new Date(selectedStartAt).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                • {formatSlotTime(selectedStartAt)} - {formatSlotTime(selectedEndAt)} ({durationMin} mins)
              </span>
            </div>
          </div>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
            Available
          </span>
        </div>
      )}
    </div>
  );

  function renderSlotButton(slot: TimeSlot) {
    const isSelected = selectedStartAt === slot.startAt && selectedEndAt === slot.endAt;

    if (!slot.isAvailable) {
      return (
        <button
          key={slot.startAt}
          type="button"
          onClick={() => setSelectedOccupiedSlot(slot)}
          className="p-2.5 rounded-xl border border-dashed border-red-200 bg-red-50/50 hover:bg-red-100/60 text-left transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 line-through">
              {formatSlotTime(slot.startAt)}
            </span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded-sm">
              Occupied
            </span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5 truncate group-hover:text-red-700">
            {slot.reason || 'Click for alternatives'}
          </span>
        </button>
      );
    }

    return (
      <button
        key={slot.startAt}
        type="button"
        onClick={() => {
          setSelectedOccupiedSlot(null);
          onSelectSlot(slot.startAt, slot.endAt);
        }}
        className={`p-2.5 rounded-xl border text-left transition-all ${
          isSelected
            ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
            : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40 text-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
            {formatSlotTime(slot.startAt)}
          </span>
          {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <span
          className={`text-[10px] block mt-0.5 font-medium ${
            isSelected ? 'text-blue-100' : 'text-slate-500'
          }`}
        >
          to {formatSlotTime(slot.endAt)}
        </span>
      </button>
    );
  }
};
