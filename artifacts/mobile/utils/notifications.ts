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
    const nextDate = new Date(vaccination.nextDate);
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
  const next = new Date(nextDate);
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

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateShort(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("uk-UA", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function calculateAge(birthdate: string): string {
  const birth = new Date(birthdate);
  const now = new Date();
  const years = now.getFullYear() - birth.getFullYear();
  const months = now.getMonth() - birth.getMonth();

  if (years === 0) {
    const m = months < 0 ? months + 12 : months;
    if (m === 0) return "Менше місяця";
    return `${m} міс.`;
  }

  const adjustedYears = months < 0 ? years - 1 : years;
  if (adjustedYears === 1) return "1 рік";
  if (adjustedYears >= 2 && adjustedYears <= 4) return `${adjustedYears} роки`;
  return `${adjustedYears} років`;
}
