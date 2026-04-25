import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Pet, Vaccination, HealthEvent } from "@/context/PetsContext";
import {
  generateSeriesEvents,
  getSeriesInterval,
  slotNotificationTime,
  getTodayStr,
  addInterval,
  dateStrToDate,
} from "@/utils/seriesUtils";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleVaccinationReminder(
  pet: Pet,
  vaccination: Vaccination
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const nextDate = parseDate(vaccination.nextDate);
    if (!nextDate) return null;
    const reminderDate = new Date(nextDate);
    reminderDate.setDate(reminderDate.getDate() - 7);
    if (reminderDate <= new Date()) return null;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Нагадування про вакцинацію 💉",
        body: `${pet.name} потребує вакцинації "${vaccination.name}" через тиждень!`,
        data: { petId: pet.id, vaccinationId: vaccination.id, type: "vaccination" },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
    return id;
  } catch (e) {
    console.error("Failed to schedule notification", e);
    return null;
  }
}

/** Schedule birthday notification for a pet:
 *  - 1 day before (8:00)
 *  - On the birthday itself (9:00)
 *  Returns array of scheduled notification IDs.
 */
export async function scheduleBirthdayReminders(pet: Pet): Promise<string[]> {
  if (Platform.OS === "web") return [];
  const birth = parseDate(pet.birthdate);
  if (!birth) return [];

  const now = new Date();
  const thisYear = now.getFullYear();

  // Next birthday date (this year or next)
  let nextBirthday = new Date(thisYear, birth.getMonth(), birth.getDate());
  if (nextBirthday <= now) {
    nextBirthday = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
  }

  const ids: string[] = [];

  try {
    // 1 day before at 8:00
    const dayBefore = new Date(nextBirthday);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(8, 0, 0, 0);
    if (dayBefore > now) {
      const id1 = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Завтра день народження! 🎂",
          body: `Завтра у ${pet.name} день народження! Підготуйте подарунок 🎁`,
          data: { petId: pet.id, type: "birthday_eve" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: dayBefore,
        },
      });
      ids.push(id1);
    }

    // On the birthday at 9:00
    const onDay = new Date(nextBirthday);
    onDay.setHours(9, 0, 0, 0);
    if (onDay > now) {
      const id2 = await Notifications.scheduleNotificationAsync({
        content: {
          title: `Сьогодні день народження ${pet.name}! 🎂`,
          body: `Вітаємо ${pet.name} з днем народження! 🥳🐾`,
          data: { petId: pet.id, type: "birthday" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: onDay,
        },
      });
      ids.push(id2);
    }
  } catch (e) {
    console.error("Failed to schedule birthday reminder", e);
  }

  return ids;
}

/** Schedule generic reminders for deworming, flea/tick, checkup */
export async function scheduleGenericReminder(
  pet: Pet,
  type: "deworming" | "flea_tick" | "checkup",
  nextDate: string,
  lang: "uk" | "en" = "uk"
): Promise<string | null> {
  if (Platform.OS === "web") return null;
  try {
    const date = parseDate(nextDate);
    if (!date) return null;
    const reminderDate = new Date(date);
    reminderDate.setDate(reminderDate.getDate() - 3);
    if (reminderDate <= new Date()) return null;

    const TITLES: Record<string, { uk: string; en: string }> = {
      deworming: { uk: "Глистогінні 💊", en: "Deworming 💊" },
      flea_tick: { uk: "Засоби від бліх та кліщів 🐛", en: "Flea & Tick Treatment 🐛" },
      checkup: { uk: "Плановий огляд у ветеринара 🏥", en: "Routine Vet Checkup 🏥" },
    };
    const BODIES: Record<string, { uk: string; en: string }> = {
      deworming: { uk: `Через 3 дні ${pet.name} потребує глистогінних!`, en: `${pet.name} needs deworming in 3 days!` },
      flea_tick: { uk: `Через 3 дні ${pet.name} потребує засобів від бліх та кліщів!`, en: `${pet.name} needs flea/tick treatment in 3 days!` },
      checkup: { uk: `Через 3 дні плановий огляд ${pet.name} у ветеринара!`, en: `${pet.name}'s routine vet checkup is in 3 days!` },
    };

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: TITLES[type]?.[lang] ?? "Нагадування",
        body: BODIES[type]?.[lang] ?? "",
        data: { petId: pet.id, type },
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderDate,
      },
    });
    return id;
  } catch (e) {
    console.error("Failed to schedule generic reminder", e);
    return null;
  }
}

export async function cancelNotification(id: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch (e) {
    console.error("Failed to cancel notification", e);
  }
}

// Legacy alias
export const cancelVaccinationReminder = cancelNotification;

export function getDaysUntil(dateString: string): number {
  const now = new Date();
  const next = parseDate(dateString);
  if (!next) return 999;
  const diff = next.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// Alias for vaccination
export const getDaysUntilVaccination = getDaysUntil;

export function getVaccinationStatus(nextDate: string): "overdue" | "soon" | "upcoming" | "ok" {
  const days = getDaysUntil(nextDate);
  if (days < 0) return "overdue";
  if (days <= 7) return "soon";
  if (days <= 30) return "upcoming";
  return "ok";
}

/**
 * Parses a date string in DD-MM-YYYY or YYYY-MM-DD format.
 * Returns null for invalid dates.
 */
export function parseDate(dateString: string): Date | null {
  if (!dateString || typeof dateString !== "string") return null;
  const trimmed = dateString.trim();

  // Try DD-MM-YYYY (primary user input format)
  const dmyMatch = trimmed.match(/^(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const d = new Date(year, month, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day &&
      year >= 1900 && year <= 2100
    ) return d;
  }

  // Try YYYY-MM-DD (ISO format, used internally)
  const isoMatch = trimmed.match(/^(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10) - 1;
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month, day);
    if (
      d.getFullYear() === year &&
      d.getMonth() === month &&
      d.getDate() === day &&
      year >= 1900 && year <= 2100
    ) return d;
  }

  return null;
}

/** Converts user input DD-MM-YYYY to ISO YYYY-MM-DD for storage */
export function toISODate(input: string): string | null {
  const d = parseDate(input);
  if (!d) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return dateString || "—";
  return date.toLocaleDateString("uk-UA", {
    day: "numeric", month: "long", year: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return dateString || "—";
  return date.toLocaleDateString("uk-UA", {
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}

/** Next birthday date for a pet (this year or next if already passed) */
export function getNextBirthday(birthdate: string): Date | null {
  const birth = parseDate(birthdate);
  if (!birth) return null;
  const now = new Date();
  const thisYear = now.getFullYear();
  let next = new Date(thisYear, birth.getMonth(), birth.getDate());
  if (next <= now) next = new Date(thisYear + 1, birth.getMonth(), birth.getDate());
  return next;
}

/**
 * Schedule up to 4 notifications for a health event:
 *  7 days before, 3 days before, 1 day before (all at 09:00),
 *  and at the exact event time on the day itself.
 * Uses nextDate if set, otherwise date.
 * Returns the scheduled notification IDs.
 */
export async function scheduleHealthEventReminders(
  pet: Pet,
  event: HealthEvent,
  lang: "uk" | "en" = "uk"
): Promise<string[]> {
  if (Platform.OS === "web") return [];

  const targetStr = event.nextDate || event.date;
  const targetDate = parseDate(targetStr);
  if (!targetDate) return [];

  const timeParts = (event.nextTime || event.time || "09:00").split(":").map(Number);
  const eventHour = timeParts[0] ?? 9;
  const eventMinute = timeParts[1] ?? 0;

  const now = new Date();
  const ids: string[] = [];

  const trySchedule = async (fireDate: Date, offsetDays: number): Promise<void> => {
    if (fireDate <= now) return;
    try {
      const title =
        lang === "uk"
          ? `Нагадування: ${event.title}`
          : `Reminder: ${event.title}`;
      const body =
        offsetDays === 0
          ? lang === "uk"
            ? `Сьогодні: ${event.title} (${pet.name})`
            : `Today: ${event.title} (${pet.name})`
          : lang === "uk"
          ? `Через ${offsetDays} дн.: ${event.title} (${pet.name})`
          : `In ${offsetDays} day${offsetDays === 1 ? "" : "s"}: ${event.title} (${pet.name})`;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data: { petId: pet.id, eventId: event.id, type: "health_event" },
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
        },
      });
      ids.push(id);
    } catch (e) {
      if (__DEV__) console.warn("scheduleHealthEventReminders:", e);
    }
  };

  const makeDate = (daysOffset: number, hour: number, minute: number): Date => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() - daysOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  await trySchedule(makeDate(7, 9, 0), 7);
  await trySchedule(makeDate(3, 9, 0), 3);
  await trySchedule(makeDate(1, 9, 0), 1);
  await trySchedule(makeDate(0, eventHour, eventMinute), 0);

  return ids;
}

export async function cancelHealthEventNotifications(ids: string[]): Promise<void> {
  if (Platform.OS === "web") return;
  for (const id of ids) {
    await cancelNotification(id).catch(() => {});
  }
}

// ─── NEW: Schedule notifications for next 3 days per slot ────────────────────

/**
 * Schedule notifications for a health event for the next `daysAhead` days.
 * For each occurrence within that window:
 *   - Slots with exact_time → fire at (exact_time - reminder_minutes)
 *   - Slots without exact_time → fire at 10:00
 * Replaces the old scheduleHealthEventReminders for new-style events.
 */
export async function scheduleSeriesNotifications(
  pet: Pet,
  anchor: HealthEvent,
  lang: "uk" | "en" = "uk",
  daysAhead = 3
): Promise<string[]> {
  if (Platform.OS === "web") return [];

  const today = getTodayStr();
  const limitDate = addInterval(today, daysAhead, "day");
  const occurrences = generateSeriesEvents(anchor, [], limitDate);

  const now = new Date();
  const ids: string[] = [];

  for (const event of occurrences) {
    if (event.date < today || event.date > limitDate) continue;

    const slots = (event.cycleSlots && event.cycleSlots.length > 0)
      ? event.cycleSlots
      : [{ slot_name: "Весь день", reminder_minutes: 0, exact_time: event.time ?? undefined }];

    for (const slot of slots) {
      const fireDate = slotNotificationTime(event.date, slot);
      if (fireDate <= now) continue;

      const slotLabel = slot.slot_name !== "Весь день" ? ` (${slot.slot_name})` : "";
      const title = lang === "uk"
        ? `Нагадування: ${event.title}${slotLabel}`
        : `Reminder: ${event.title}${slotLabel}`;
      const body = lang === "uk"
        ? `${pet.name} — ${event.title}`
        : `${pet.name} — ${event.title}`;

      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title,
            body,
            data: { petId: pet.id, eventId: event.id, type: "health_event" },
            sound: true,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: fireDate,
          },
        });
        ids.push(id);
      } catch (e) {
        if (__DEV__) console.warn("scheduleSeriesNotifications:", e);
      }
    }
  }

  return ids;
}

/**
 * Schedule a daily 09:00 reminder if there are any overdue events.
 * Should be called on every app open. Returns the notification ID or null.
 */
export async function scheduleOverdueReminder(
  hasOverdue: boolean,
  lang: "uk" | "en" = "uk"
): Promise<string | null> {
  if (Platform.OS === "web" || !hasOverdue) return null;

  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: lang === "uk" ? "У вас є прострочені події" : "You have overdue events",
        body: lang === "uk"
          ? "Перевірте список подій та відмітьте виконані"
          : "Check your events list and mark completed ones",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: tomorrow,
      },
    });
    return id;
  } catch (e) {
    if (__DEV__) console.warn("scheduleOverdueReminder:", e);
    return null;
  }
}

/**
 * Refresh all health event notifications for all pets.
 * Cancels existing notifications and reschedules for the next 3 days.
 * Should be called on every app open.
 */
export async function refreshAllEventNotifications(
  pets: Pet[],
  lang: "uk" | "en" = "uk"
): Promise<void> {
  if (Platform.OS === "web") return;

  // Cancel all existing scheduled notifications
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    if (__DEV__) console.warn("refreshAllEventNotifications cancel:", e);
  }

  const today = getTodayStr();
  let hasOverdue = false;

  for (const pet of pets) {
    const anchors = (pet.healthEvents ?? []).filter(
      e => e.isCurrent === true || (e.isCurrent === undefined && e.status !== "done" && e.status !== "cancelled")
    );

    for (const anchor of anchors) {
      if (anchor.status === "overdue" || (anchor.date < today && anchor.status !== "done")) {
        hasOverdue = true;
      }
      try {
        const ids = await scheduleSeriesNotifications(pet, anchor, lang, 3);
        // Note: we don't persist these IDs in the new architecture since we refresh on every open
        void ids;
      } catch (e) {
        if (__DEV__) console.warn("refreshAllEventNotifications:", e);
      }
    }
  }

  await scheduleOverdueReminder(hasOverdue, lang);
}

export function calculateAge(
  birthdate: string,
  lang: "uk" | "en" = "uk"
): string {
  const birth = parseDate(birthdate);
  if (!birth) return "—";

  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years < 0) return "—";

  if (years === 0) {
    const m = months < 0 ? months + 12 : months;
    if (m === 0) return lang === "uk" ? "< 1 міс." : "< 1 mo.";
    return lang === "uk" ? `${m} міс.` : `${m} mo.`;
  }

  const adjustedYears = months < 0 ? years - 1 : years;
  if (adjustedYears <= 0) {
    const m = months < 0 ? months + 12 : months;
    return lang === "uk" ? `${m} міс.` : `${m} mo.`;
  }

  if (lang === "en") return adjustedYears === 1 ? "1 year" : `${adjustedYears} years`;

  if (adjustedYears === 1) return "1 рік";
  if (adjustedYears >= 2 && adjustedYears <= 4) return `${adjustedYears} роки`;
  return `${adjustedYears} років`;
}
