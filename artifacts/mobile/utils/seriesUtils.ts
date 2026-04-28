/**
 * seriesUtils.ts
 *
 * Core business logic for the health event series architecture:
 *   - Date arithmetic (addInterval, getLimitDate)
 *   - Status computation (no 'active', slot-aware overdue thresholds)
 *   - RRule-based virtual event generation from series anchors
 *   - Today-indicator helper (UI-only orange state)
 */

import { RRule } from "rrule";
import type { HealthEvent, HealthEventStatus, CycleSlot } from "@/context/PetsContext";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function dateStrToDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dateToStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Add value/unit to a date string, returning the new date string.
 * unit: "day" | "week" | "month" | "year"
 */
export function addInterval(dateStr: string, value: number, unit: string): string {
  const d = dateStrToDate(dateStr);
  switch (unit) {
    case "day":
      d.setDate(d.getDate() + value);
      break;
    case "week":
      d.setDate(d.getDate() + value * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + value);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + value);
      break;
    default:
      d.setDate(d.getDate() + value);
  }
  return dateToStr(d);
}

/** Returns today + 1 year as YYYY-MM-DD. Absolute display limit. */
export function getLimitDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return dateToStr(d);
}

/** True if the given date string equals today. */
export function isToday(dateStr: string): boolean {
  return dateStr === getTodayStr();
}

// ─── RRule helpers ────────────────────────────────────────────────────────────

/** Strip non-standard custom flags (X-...) from rrule string before parsing */
function stripCustomFlags(rruleStr: string): string {
  return rruleStr.replace(/;?X-[A-Z0-9-]+=\w+/g, "");
}

/** Convert YYYY-MM-DD string to UTC midnight Date for RRule usage */
function dateStrToUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Convert a UTC Date from RRule back to YYYY-MM-DD string */
function utcDateToStr(date: Date): string {
  return (
    `${date.getUTCFullYear()}-` +
    `${String(date.getUTCMonth() + 1).padStart(2, "0")}-` +
    `${String(date.getUTCDate()).padStart(2, "0")}`
  );
}

/**
 * Build an rrule string from an interval value/unit pair.
 * e.g. buildRruleString(3, "month") → "FREQ=MONTHLY;INTERVAL=3"
 */
export function buildRruleString(
  value: number,
  unit: "day" | "week" | "month" | "year",
  endDate?: string,
  afterCompletion?: boolean
): string {
  const freqMap: Record<string, string> = {
    day: "DAILY", week: "WEEKLY", month: "MONTHLY", year: "YEARLY",
  };
  let rrule = `FREQ=${freqMap[unit] ?? "DAILY"}`;
  if (value > 1) rrule += `;INTERVAL=${value}`;
  if (endDate) rrule += `;UNTIL=${endDate.replace(/-/g, "")}T000000Z`;
  if (afterCompletion) rrule += ";X-AFTER-COMPLETION=TRUE";
  return rrule;
}

/** True if the rrule has the X-AFTER-COMPLETION=TRUE custom flag */
export function isAfterCompletion(rruleStr: string): boolean {
  return rruleStr.includes("X-AFTER-COMPLETION=TRUE");
}

/**
 * Extract SeriesInterval from an rrule string.
 * Returns null if the string can't be parsed.
 */
function getIntervalFromRrule(rruleStr: string): SeriesInterval | null {
  const freqMatch = rruleStr.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/);
  if (!freqMatch) return null;
  const intervalMatch = rruleStr.match(/INTERVAL=(\d+)/);
  const interval = intervalMatch ? parseInt(intervalMatch[1], 10) : 1;
  const unitMap: Record<string, string> = {
    DAILY: "day", WEEKLY: "week", MONTHLY: "month", YEARLY: "year",
  };
  const unit = unitMap[freqMatch[1]];
  return unit ? { value: interval, unit } : null;
}

/**
 * Get the next occurrence strictly after currentDateStr using an rrule string.
 * The rrule start (dtstart) is set to currentDateStr.
 * Returns undefined if the series has ended.
 */
export function getNextOccurrenceAfter(rruleStr: string, currentDateStr: string): string | undefined {
  const dtstart = dateStrToUTC(currentDateStr);
  const cleanStr = stripCustomFlags(rruleStr);
  try {
    const options = RRule.parseString(cleanStr);
    const rule = new RRule({ ...options, dtstart });
    const next = rule.after(dtstart, false);
    return next ? utcDateToStr(next) : undefined;
  } catch {
    return undefined;
  }
}

// ─── Overdue threshold ────────────────────────────────────────────────────────

/**
 * Returns the moment (Date) after which an event at the given date/slots/time
 * transitions from "planned" → "overdue".
 *
 * Rules per spec:
 *   - birthday / family_day → null (never overdue)
 *   - Exact time slot → 3 h after that time
 *   - "Весь день" / "Вечір" → 00:00 next day
 *   - "Перша половина дня" / "Ранок" → 12:00 same day
 *   - "Друга половина дня" / "День" → 18:00 same day
 *   - Legacy events with event.time → 3 h after that time
 *   - No time info → 00:00 next day
 */
export function getOverdueThreshold(
  dateStr: string,
  eventType: string,
  cycleSlots?: CycleSlot[],
  legacyTime?: string
): Date | null {
  if (eventType === "birthday" || eventType === "family_day") return null;

  const eventDate = dateStrToDate(dateStr);

  if (cycleSlots && cycleSlots.length > 0) {
    // For a multi-slot event: overdue when the LAST slot's threshold is crossed.
    // (A single late slot doesn't mark the whole event overdue — that's partial.)
    let latest: Date | null = null;
    for (const slot of cycleSlots) {
      const t = slotThreshold(eventDate, slot);
      if (!latest || t > latest) latest = t;
    }
    return latest;
  }

  // Legacy: time field
  if (legacyTime) {
    const [h, m] = legacyTime.split(":").map(Number);
    const t = new Date(eventDate);
    t.setHours((h ?? 9) + 3, m ?? 0, 0, 0);
    return t;
  }

  // Default: next day midnight
  const t = new Date(eventDate);
  t.setDate(t.getDate() + 1);
  t.setHours(0, 0, 0, 0);
  return t;
}

function slotThreshold(eventDate: Date, slot: CycleSlot): Date {
  const t = new Date(eventDate);
  if (slot.exact_time) {
    const [h, m] = slot.exact_time.split(":").map(Number);
    t.setHours((h ?? 9) + 3, m ?? 0, 0, 0);
    return t;
  }
  switch (slot.slot_name) {
    case "Весь день":
    case "Вечір":
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      break;
    case "Перша половина дня":
    case "Ранок":
      t.setHours(12, 0, 0, 0);
      break;
    case "Друга половина дня":
    case "День":
      t.setHours(18, 0, 0, 0);
      break;
    default:
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
  }
  return t;
}

// ─── Status computation (v2, no 'active') ────────────────────────────────────

/**
 * Compute the persisted status for a health event.
 * "today + planned" is returned as "planned" — the UI decides to render it orange.
 */
export function computeEventStatusV2(event: {
  status: HealthEventStatus;
  date: string;
  type: string;
  cycleSlots?: CycleSlot[];
  time?: string;
}): HealthEventStatus {
  if (event.status === "done" || event.status === "cancelled") return event.status;

  const today = getTodayStr();
  if (event.date > today) return "planned";

  const threshold = getOverdueThreshold(event.date, event.type, event.cycleSlots, event.time);
  if (!threshold) return "planned"; // birthday / family_day never overdue

  const now = new Date();
  return now >= threshold ? "overdue" : "planned";
}

// ─── Series interval extraction ───────────────────────────────────────────────

export interface SeriesInterval {
  value: number;
  unit: string; // "day" | "week" | "month" | "year"
}

export function getSeriesInterval(event: HealthEvent): SeriesInterval | null {
  // New architecture: parse from rrule string
  if (event.rrule) {
    const fromRrule = getIntervalFromRrule(event.rrule);
    if (fromRrule) return fromRrule;
  }
  // Legacy fallback
  if (event.repeatIntervalValue && event.repeatIntervalUnit) {
    return { value: event.repeatIntervalValue, unit: event.repeatIntervalUnit };
  }
  if (event.repeatIntervalDays) {
    return { value: event.repeatIntervalDays, unit: "day" };
  }
  if (event.repeatRule === "yearly") {
    return { value: 1, unit: "year" };
  }
  return null;
}

// ─── Virtual event generation ─────────────────────────────────────────────────

/**
 * Generate all display events for a series anchor within [anchor.date, limitDate].
 *
 * New architecture (anchor.rrule set):
 *   Uses RRule to generate occurrences. Exception records (recurrenceId set)
 *   or legacy modified records override virtual occurrences at matching dates.
 *
 * Legacy path (no rrule): uses addInterval loop, same as before.
 *
 * Virtual events have isVirtual=true and a deterministic id.
 */
export function generateSeriesEvents(
  anchor: HealthEvent,
  exceptions: HealthEvent[] = [],
  limitDate?: string
): HealthEvent[] {
  const limit = limitDate ?? getLimitDate();

  // ── New rrule-based path ──────────────────────────────────────────────────
  if (anchor.rrule && anchor.recurrenceType !== "one_time") {
    const dtstart = dateStrToUTC(anchor.date);
    const endDate = dateStrToUTC(limit);
    const cleanStr = stripCustomFlags(anchor.rrule);

    let dates: Date[];
    try {
      const options = RRule.parseString(cleanStr);
      const rule = new RRule({ ...options, dtstart });
      // inclusive=true includes anchor.date itself — we exclude it because
      // the rule record is already shown directly in the list
      dates = rule.between(dtstart, endDate, true).filter(d => utcDateToStr(d) !== anchor.date);
    } catch {
      return [anchor];
    }

    // Exception lookup: by recurrenceId (new) or by date (legacy isModified)
    const exceptionByDate = new Map<string, HealthEvent>();
    for (const e of exceptions) {
      exceptionByDate.set(e.recurrenceId ?? e.date, e);
    }

    return dates.map((date) => {
      const dateStr = utcDateToStr(date);
      const exception = exceptionByDate.get(dateStr);
      if (exception) return exception;
      if (dateStr === anchor.date) return anchor;
      return {
        ...anchor,
        id: `virtual_${anchor.seriesId ?? anchor.id}_${dateStr}`,
        date: dateStr,
        status: "planned" as HealthEventStatus,
        isCurrent: false,
        isVirtual: true,
        notificationIds: [],
        notes: undefined,
        photos: [],
        cycleSlots: anchor.cycleSlots?.map(s => ({ ...s, completed_at: undefined, completed_by: undefined })),
      };
    });
  }

  // ── Legacy interval-loop path (no rrule) ──────────────────────────────────
  const interval = getSeriesInterval(anchor);
  if (!interval || anchor.recurrenceType === "one_time") {
    return [anchor];
  }

  const modByDate = new Map(exceptions.map((e) => [e.recurrenceId ?? e.date, e]));
  const results: HealthEvent[] = [];

  let cur = anchor.date;
  while (true) {
    const next = addInterval(cur, interval.value, interval.unit);
    if (next > limit) break;
    if (anchor.repeatEndDate && next > anchor.repeatEndDate) break;
    results.push(modByDate.get(next) ?? {
      ...anchor,
      id: `virtual_${anchor.seriesId ?? anchor.id}_${next}`,
      date: next,
      status: "planned" as HealthEventStatus,
      isCurrent: false,
      isVirtual: true,
      notificationIds: [],
      notes: undefined,
      photos: [],
      cycleSlots: anchor.cycleSlots?.map(s => ({ ...s, completed_at: undefined, completed_by: undefined })),
    });
    cur = next;
  }

  return results;
}

/**
 * Build the full set of display events for a pet's health event list.
 *
 * Future virtual events are derived purely from rrule + the latest real record
 * date in each series — independent of isCurrent, making the timeline self-healing.
 */
export function getDisplayEvents(
  healthEvents: HealthEvent[],
  limitDate?: string
): HealthEvent[] {
  const limit = limitDate ?? getLimitDate();

  // All real stored records — shown as-is, no transformation
  const realRecords = healthEvents.filter(e => !e.isVirtual);

  // Group records by series
  const seriesMap = new Map<string, HealthEvent[]>();
  for (const e of realRecords) {
    if (e.recurrenceType !== 'regular') continue;
    const sid = e.seriesId ?? e.id;
    if (!seriesMap.has(sid)) seriesMap.set(sid, []);
    seriesMap.get(sid)!.push(e);
  }

  // For each series derive future virtual events purely from rrule + latest real date.
  // This is independent of isCurrent, making the timeline self-healing.
  const allVirtual: HealthEvent[] = [];

  for (const [, records] of seriesMap) {
    // Find the rule-defining record: any record with rrule set
    const ruleDef = records.find(e => e.rrule && e.rrule.length > 0);
    if (!ruleDef) continue;

    // Latest real date in this series — start generation from here
    const latestDate = records.reduce(
      (max, r) => r.date > max ? r.date : max,
      records[0].date
    );

    // Dates already covered by real records — never generate virtual for these
    const realDatesInSeries = new Set(records.map(r => r.date));

    // Exception records (modified or cancelled virtual occurrences)
    const exceptions = records.filter(
      r => r.recurrenceId != null || r.isModified === true
    );

    // Synthesize an anchor at latestDate to drive generateSeriesEvents
    const virtualAnchor: HealthEvent = {
      ...ruleDef,
      date: latestDate,
    };
    const virtuals = generateSeriesEvents(virtualAnchor, exceptions, limit);

    // Filter out virtuals on dates already represented by real records
    const filtered = virtuals.filter(
      v => v.isVirtual === true && !realDatesInSeries.has(v.date)
    );
    allVirtual.push(...filtered);
  }

  return [...realRecords, ...allVirtual];
}

// ─── Default slot configurations ──────────────────────────────────────────────

export interface SlotConfig {
  slot_name: string;
  use_exact_time: boolean;
  exact_time: string;
  reminder_minutes: number;
}

export function defaultSlotsForCount(count: number): SlotConfig[] {
  if (count === 1) {
    return [{ slot_name: "Весь день", use_exact_time: false, exact_time: "", reminder_minutes: 30 }];
  }
  if (count === 2) {
    return [
      { slot_name: "Перша половина дня", use_exact_time: false, exact_time: "", reminder_minutes: 30 },
      { slot_name: "Друга половина дня", use_exact_time: false, exact_time: "", reminder_minutes: 30 },
    ];
  }
  if (count === 3) {
    return [
      { slot_name: "Ранок", use_exact_time: false, exact_time: "", reminder_minutes: 30 },
      { slot_name: "День",  use_exact_time: false, exact_time: "", reminder_minutes: 30 },
      { slot_name: "Вечір", use_exact_time: false, exact_time: "", reminder_minutes: 30 },
    ];
  }
  // 4+
  return Array.from({ length: count }, (_, i) => ({
    slot_name: ordinalSlotName(i + 1),
    use_exact_time: false,
    exact_time: "",
    reminder_minutes: 30,
  }));
}

export function ordinalSlotName(n: number): string {
  const names = ["Перший", "Другий", "Третій", "Четвертий", "П'ятий", "Шостий"];
  const base = names[n - 1] ?? `${n}-й`;
  return `${base} прийом`;
}

export const SINGLE_SLOT_OPTIONS = [
  "Весь день",
  "Перша половина дня",
  "Друга половина дня",
  "Ранок",
  "День",
  "Вечір",
  "Точний час",
];

/** Convert SlotConfig[] → CycleSlot[] for storage */
export function slotsToStorage(slots: SlotConfig[]): CycleSlot[] {
  return slots.map((s) => ({
    slot_name: s.slot_name === "Точний час" && s.use_exact_time ? "Точний час" : s.slot_name,
    exact_time: s.use_exact_time && s.exact_time ? s.exact_time : undefined,
    reminder_minutes: s.reminder_minutes,
  }));
}

/** Convert CycleSlot[] (from storage) → SlotConfig[] for form editing */
export function storageToSlots(stored: CycleSlot[]): SlotConfig[] {
  return stored.map((s) => ({
    slot_name: s.slot_name,
    use_exact_time: !!s.exact_time,
    exact_time: s.exact_time ?? "",
    reminder_minutes: s.reminder_minutes,
  }));
}

// ─── Notification fire times ──────────────────────────────────────────────────

/** Returns the Date at which a notification should fire for a given slot on a given event date. */
export function slotNotificationTime(eventDateStr: string, slot: CycleSlot): Date {
  const d = dateStrToDate(eventDateStr);
  if (slot.exact_time) {
    const [h, m] = slot.exact_time.split(":").map(Number);
    d.setHours(h, m, 0, 0);
    d.setMinutes(d.getMinutes() - (slot.reminder_minutes ?? 30));
    return d;
  }
  // No exact time → fire at 10:00
  d.setHours(10, 0, 0, 0);
  return d;
}
