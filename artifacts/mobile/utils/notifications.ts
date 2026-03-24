import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { Pet, Vaccination } from "@/context/PetsContext";

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
        title: "Нагадування про вакцинацію",
        body: `${pet.name} потребує вакцинації "${vaccination.name}" через тиждень!`,
        data: { petId: pet.id, vaccinationId: vaccination.id },
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

export async function cancelVaccinationReminder(notificationId: string): Promise<void> {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (e) {
    console.error("Failed to cancel notification", e);
  }
}

export function getDaysUntilVaccination(nextDate: string): number {
  const now = new Date();
  const next = parseDate(nextDate);
  if (!next) return 999;
  const diff = next.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function getVaccinationStatus(nextDate: string): "overdue" | "soon" | "upcoming" | "ok" {
  const days = getDaysUntilVaccination(nextDate);
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

  // Try DD-MM-YYYY (primary format)
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
      year >= 1900 &&
      year <= 2100
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
      year >= 1900 &&
      year <= 2100
    ) return d;
  }

  return null;
}

/**
 * Converts user input DD-MM-YYYY to ISO YYYY-MM-DD for storage
 */
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
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = parseDate(dateString);
  if (!date) return dateString || "—";
  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
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
    const m = (months < 0 ? months + 12 : months);
    return lang === "uk" ? `${m} міс.` : `${m} mo.`;
  }

  if (lang === "en") return adjustedYears === 1 ? "1 year" : `${adjustedYears} years`;

  if (adjustedYears === 1) return "1 рік";
  if (adjustedYears >= 2 && adjustedYears <= 4) return `${adjustedYears} роки`;
  return `${adjustedYears} років`;
}
