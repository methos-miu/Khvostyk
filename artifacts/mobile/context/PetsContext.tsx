import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";
import {
  computeEventStatusV2,
  getSeriesInterval,
  addInterval,
  getTodayStr as seriesGetToday,
  buildRruleString,
  getNextOccurrenceAfter,
} from "@/utils/seriesUtils";

export type Species =
  | "cat" | "dog" | "rabbit" | "hamster" | "guinea_pig"
  | "bird" | "turtle" | "reptile" | "fish" | "ferret"
  | "hedgehog" | "other";

export type Gender = "male" | "female" | null;
export type ReminderType = "deworming" | "flea_tick" | "birthday" | "checkup";
export type DocumentCategory = "analysis" | "prescription" | "insurance" | "passport" | "other";

export type HealthEventType =
  | "vaccination" | "deworming" | "flea_tick" | "checkup" | "grooming"
  | "psychologist" | "training" | "competition" | "exhibition" | "nail_trim"
  | "analysis" | "rabies" | "chipping" | "insurance" | "birthday" | "other"
  // New types
  | "vet" | "surgery" | "medication" | "sterilization" | "bath"
  | "ear_cleaning" | "teeth_cleaning" | "dog_trainer" | "walk" | "boarding"
  | "family_day" | "mating" | "certification" | "registration" | "custom";

export type HealthEventStatus = "planned" | "overdue" | "done" | "cancelled";
export type RecurrenceType = "one_time" | "regular";

/** One time-slot within a multi-slot daily event (e.g. morning medication). */
export interface CycleSlot {
  slot_name: string;        // "Ранок", "Вечір", "Точний час", editable by user
  exact_time?: string;      // "09:00" if user picked exact time
  reminder_minutes: number; // minutes before exact_time (default 30); 0 = fire at 10:00
  completed_at?: string;    // ISO timestamp when this slot was checked
  completed_by?: string;    // user id
}

export interface HealthEvent {
  id: string;
  petId: string;
  type: HealthEventType;
  title: string;
  date: string;             // YYYY-MM-DD — for regular events this is the NEXT scheduled date
  time?: string;            // legacy; prefer cycleSlots
  nextDate?: string;        // legacy
  nextTime?: string;        // legacy
  status: HealthEventStatus;
  recurrenceType: RecurrenceType;

  // ── Legacy interval (kept for backward-compat read) ──────────────────────
  repeatIntervalDays?: number;
  repeatRule?: "yearly";

  // ── Series architecture ───────────────────────────────────────────────────
  seriesId?: string;        // UUID shared by all records in a series
  isCurrent?: boolean;      // true = anchor of its series (generates future events)
  isModified?: boolean;     // true = was individually edited (stored explicitly)

  // ── RRule architecture (replaces fragile is_current/is_modified logic) ───
  rrule?: string;           // recurrence rule string, e.g. "FREQ=MONTHLY;INTERVAL=3"
  recurrenceId?: string;    // YYYY-MM-DD original scheduled date for exception records

  // ── Cycle (times-per-day) ─────────────────────────────────────────────────
  timesPerCycle?: number;   // how many times per day (default 1)
  cycleSlots?: CycleSlot[];

  // ── New interval fields (value + unit replaces repeatIntervalDays) ────────
  repeatIntervalValue?: number;
  repeatIntervalUnit?: "day" | "week" | "month" | "year";
  repeatEndDate?: string;   // YYYY-MM-DD; null = repeat indefinitely

  // ── Common ────────────────────────────────────────────────────────────────
  notes?: string;
  photos?: string[];
  contactName?: string;
  contactPhone?: string;
  contactAddress?: string;
  notificationIds?: string[];
  /** Template-specific key-value fields (template name → value string) */
  extraFields?: Record<string, string>;
  /** Template key used when creating this event (built-in type or custom template UUID) */
  templateKey?: string;
  createdAt: string;

  // ── Virtual (computed at display time, never persisted) ───────────────────
  isVirtual?: boolean;
}

export interface Vaccination {
  id: string;
  name: string;
  date: string;
  nextDate: string;
  notes?: string;
  vetName?: string;
  notificationId?: string;
}

export interface Document {
  id: string;
  name: string;
  uri: string;
  type: string;
  date: string;
  size?: number;
  category?: DocumentCategory;
}

export interface WeightEntry {
  id: string;
  date: string;
  weight: number;
}

export interface Reminder {
  id: string;
  type: ReminderType;
  date: string;
  nextDate: string;
  notes?: string;
  notificationId?: string;
}

export interface Illness {
  id: string;
  name: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface MedicalProfile {
  allergies?: string;
  chronicConditions?: string;
  vetName?: string;
  vetPhone?: string;
  bloodType?: string;
  illnesses?: Illness[];
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
  customSpecies?: string;
  breed: string;
  birthdate: string;
  adoptionDate?: string;
  weight: string;
  photoUri?: string;
  color?: string;
  gender?: Gender;
  vaccinations: Vaccination[];
  documents: Document[];
  weightHistory: WeightEntry[];
  reminders: Reminder[];
  healthEvents: HealthEvent[];
  medicalProfile?: MedicalProfile;
  length?: number;
  height?: number;
  personality?: string;
  description?: string;
  createdAt: string;
}

interface PetsContextType {
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents" | "weightHistory" | "reminders" | "healthEvents">) => Promise<Pet>;
  updatePet: (id: string, updates: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  addVaccination: (petId: string, vaccination: Omit<Vaccination, "id">) => Promise<void>;
  updateVaccination: (petId: string, vaccinationId: string, updates: Partial<Vaccination>) => Promise<void>;
  deleteVaccination: (petId: string, vaccinationId: string) => Promise<void>;
  addDocument: (petId: string, document: Omit<Document, "id">) => Promise<void>;
  deleteDocument: (petId: string, documentId: string) => Promise<void>;
  addWeightEntry: (petId: string, entry: Omit<WeightEntry, "id">) => Promise<void>;
  updateWeightEntry: (petId: string, entryId: string, weight: number) => Promise<void>;
  deleteWeightEntry: (petId: string, entryId: string) => Promise<void>;
  addReminder: (petId: string, reminder: Omit<Reminder, "id">) => Promise<void>;
  updateReminder: (petId: string, reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (petId: string, reminderId: string) => Promise<void>;
  addHealthEvent: (petId: string, event: Omit<HealthEvent, "id" | "petId" | "createdAt">) => Promise<HealthEvent>;
  updateHealthEvent: (petId: string, eventId: string, updates: Partial<HealthEvent>) => Promise<void>;
  deleteHealthEvent: (petId: string, eventId: string) => Promise<void>;
  /** Mark an event done. For regular events returns the next occurrence info. */
  completeHealthEvent: (petId: string, eventId: string) => Promise<{ nextDate?: string; modifiedFutureCount: number }>;
  /** Atomic: mark event done + create next is_current record (regular events only). */
  markDoneAndAdvance: (petId: string, eventId: string, nextDate: string) => Promise<void>;
  /** Shift series anchor to a new date (updates is_current record; optionally shifts modified events). */
  shiftSeriesAnchor: (petId: string, seriesId: string, newDate: string, shiftModified?: boolean) => Promise<void>;
  /** Delete a series future event with scope: 'this' (one record) or 'future' (all future). */
  deleteSeriesScope: (petId: string, eventId: string, scope: "this" | "future") => Promise<void>;
  /** Update a series event. scope='this' marks is_modified; scope='future' updates the anchor and drops future modified. */
  updateSeriesScope: (petId: string, eventId: string, updates: Partial<HealthEvent>, scope: "this" | "future") => Promise<void>;
  checkAndUpdateEventStatuses: () => Promise<void>;
  upsertBirthdayEvent: (petId: string, birthdate: string, title: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
  isLoaded: boolean;
  isSyncing: boolean;
  exportData: () => string;
  importData: (json: string) => Promise<boolean>;
}

const PetsContext = createContext<PetsContextType | null>(null);

const STORAGE_KEY = "@vethelper_pets";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysToStr(dateStr: string, days: number): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Advance a date string by exactly one calendar year (handles Feb-29). */
function addOneYear(dateStr: string): string {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setFullYear(d.getFullYear() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Returns the next upcoming birthday date (this year if not yet passed, else next year). */
function nextBirthdayDate(birthdate: string): string {
  const parts = birthdate.split("-");
  if (parts.length !== 3) return birthdate;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thisYear = today.getFullYear();
  const thisYearBd = new Date(thisYear, Number(parts[1]) - 1, Number(parts[2]));
  if (thisYearBd >= today) {
    return `${thisYear}-${parts[1]}-${parts[2]}`;
  }
  return `${thisYear + 1}-${parts[1]}-${parts[2]}`;
}

function computeEventStatus(event: HealthEvent, _todayStr: string): HealthEventStatus {
  return computeEventStatusV2({
    status: event.status,
    date: event.date,
    type: event.type,
    cycleSlots: event.cycleSlots,
    time: event.time,
  });
}

function extractStoragePath(photoUri?: string): string | undefined {
  if (!photoUri) return undefined;
  if (!photoUri.startsWith("https://")) return photoUri;
  const marker = "/pet-photos/";
  const idx = photoUri.indexOf(marker);
  if (idx === -1) return undefined;
  return photoUri.slice(idx + marker.length).split("?")[0];
}

function migratePet(raw: any): Pet {
  return {
    id: raw.id ?? generateId(),
    name: raw.name ?? "",
    species: raw.species ?? "other",
    customSpecies: raw.customSpecies,
    breed: raw.breed ?? "",
    birthdate: raw.birthdate ?? "",
    adoptionDate: raw.adoptionDate ?? undefined,
    weight: raw.weight ?? "",
    photoUri: raw.photoUri,
    color: raw.color,
    gender: raw.gender ?? null,
    vaccinations: raw.vaccinations ?? [],
    documents: raw.documents ?? [],
    weightHistory: raw.weightHistory ?? [],
    reminders: raw.reminders ?? [],
    healthEvents: (raw.healthEvents ?? []).map((e: any) => {
      // Migrate 'active' → 'planned'
      const rawStatus = e.status === "active" ? "planned" : e.status;
      const status: HealthEventStatus = (["planned","overdue","done","cancelled"].includes(rawStatus) ? rawStatus : "planned") as HealthEventStatus;
      const recurrenceType: RecurrenceType = (() => {
        const rt = e.recurrenceType ?? ((e.type === "birthday" || e.type === "family_day") ? "regular" : "one_time");
        return (rt === "repeating" ? "regular" : rt) as RecurrenceType;
      })();
      const repeatRule = (e.repeatRule ?? ((e.type === "birthday" || e.type === "family_day") ? "yearly" : undefined)) as "yearly" | undefined;
      // Compute rrule from existing interval fields if not already set
      const migratedRrule: string | undefined = e.rrule ?? (() => {
        if (recurrenceType !== "regular") return undefined;
        const iv = e.repeatIntervalValue as number | undefined;
        const iu = e.repeatIntervalUnit as "day" | "week" | "month" | "year" | undefined;
        if (iv && iu) return buildRruleString(iv, iu, e.repeatEndDate ?? undefined);
        if (e.repeatIntervalDays) return buildRruleString(e.repeatIntervalDays as number, "day");
        if (repeatRule === "yearly" || e.type === "birthday" || e.type === "family_day") return "FREQ=YEARLY";
        return undefined;
      })();
      return {
        ...e,
        status,
        recurrenceType,
        repeatIntervalDays: e.repeatIntervalDays ?? undefined,
        repeatRule,
        // Series fields
        seriesId: e.seriesId ?? undefined,
        isCurrent: e.isCurrent ?? (status !== "done" && status !== "cancelled" ? true : undefined),
        isModified: e.isModified ?? false,
        // RRule fields
        rrule: migratedRrule,
        recurrenceId: e.recurrenceId ?? undefined,
        // Interval fields
        repeatIntervalValue: e.repeatIntervalValue ?? undefined,
        repeatIntervalUnit: e.repeatIntervalUnit ?? undefined,
        repeatEndDate: e.repeatEndDate ?? undefined,
        // Cycle
        timesPerCycle: e.timesPerCycle ?? 1,
        cycleSlots: e.cycleSlots ?? [],
        extraFields: e.extraFields ?? undefined,
        templateKey: e.templateKey ?? undefined,
      };
    }),
    medicalProfile: raw.medicalProfile,
    length: raw.length ?? undefined,
    height: raw.height ?? undefined,
    personality: raw.personality ?? undefined,
    description: raw.description ?? undefined,
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

// ─── Supabase row → Pet assembler ────────────────────────────────────────────
function assemblePets(
  petsRows: any[],
  vaccsRows: any[],
  docsRows: any[],
  weightsRows: any[],
  remindersRows: any[],
  healthEventsRows: any[]
): Pet[] {
  return petsRows.map(p => ({
    id: p.id,
    name: p.name ?? "",
    species: (p.species as Species) ?? "other",
    customSpecies: p.custom_species ?? undefined,
    breed: p.breed ?? "",
    birthdate: p.birthdate ?? "",
    adoptionDate: p.adoption_date ?? undefined,
    weight: p.weight ?? "",
    photoUri: p.photo_url ?? undefined,
    color: p.color ?? undefined,
    gender: (p.gender as Gender) ?? null,
    medicalProfile: p.medical_profile ?? undefined,
    length: p.length ?? undefined,
    height: p.height ?? undefined,
    personality: p.personality ?? undefined,
    description: p.description ?? undefined,
    createdAt: p.created_at ?? new Date().toISOString(),
    vaccinations: vaccsRows
      .filter(v => v.pet_id === p.id)
      .map(v => ({
        id: v.id, name: v.name ?? "", date: v.date ?? "", nextDate: v.next_date ?? "",
        notes: v.notes ?? undefined, vetName: v.vet_name ?? undefined,
        notificationId: v.notification_id ?? undefined,
      })),
    documents: docsRows
      .filter(d => d.pet_id === p.id)
      .map(d => ({
        id: d.id, name: d.name ?? "", uri: d.uri ?? "", type: d.type ?? "",
        date: d.date ?? "", size: d.size ?? undefined,
        category: (d.category as DocumentCategory) ?? undefined,
      })),
    weightHistory: weightsRows
      .filter(w => w.pet_id === p.id)
      .map(w => ({ id: w.id, date: w.date ?? "", weight: Number(w.weight) })),
    reminders: remindersRows
      .filter(r => r.pet_id === p.id)
      .map(r => ({
        id: r.id, type: r.type as ReminderType, date: r.date ?? "",
        nextDate: r.next_date ?? "", notes: r.notes ?? undefined,
        notificationId: r.notification_id ?? undefined,
      })),
    healthEvents: healthEventsRows
      .filter(e => e.pet_id === p.id)
      .map(e => {
        // Migrate 'active' → 'planned' at read time
        const rawStatus = e.status === "active" ? "planned" : e.status;
        const status: HealthEventStatus = (["planned","overdue","done","cancelled"].includes(rawStatus) ? rawStatus : "planned") as HealthEventStatus;
        const recurrenceType: RecurrenceType = (e.recurrence_type === "repeating" ? "regular" : (e.recurrence_type as RecurrenceType)) ?? "one_time";
        const repeatRule = (e.repeat_rule as "yearly" | undefined) ?? undefined;
        // Compute rrule for legacy rows that predate the rrule column
        const assembledRrule: string | undefined = e.rrule ?? (() => {
          if (recurrenceType !== "regular") return undefined;
          const iv = e.repeat_interval_value as number | undefined;
          const iu = e.repeat_interval_unit as "day" | "week" | "month" | "year" | undefined;
          if (iv && iu) return buildRruleString(iv, iu, e.repeat_end_date ?? undefined);
          if (e.repeat_interval_days) return buildRruleString(e.repeat_interval_days as number, "day");
          if (repeatRule === "yearly" || e.type === "birthday" || e.type === "family_day") return "FREQ=YEARLY";
          return undefined;
        })();
        return {
          id: e.id,
          petId: e.pet_id,
          type: e.type as HealthEventType,
          title: e.title ?? "",
          date: e.date ?? "",
          time: e.time ?? undefined,
          nextDate: e.next_date ?? undefined,
          nextTime: e.next_time ?? undefined,
          status,
          recurrenceType,
          repeatIntervalDays: e.repeat_interval_days ?? undefined,
          repeatRule,
          // Series fields
          seriesId: e.series_id ?? undefined,
          isCurrent: e.is_current ?? (status !== "done" && status !== "cancelled"),
          isModified: e.is_modified ?? false,
          // RRule fields
          rrule: assembledRrule,
          recurrenceId: e.recurrence_id
            ? (typeof e.recurrence_id === "string" ? e.recurrence_id.split("T")[0] : String(e.recurrence_id))
            : undefined,
          // Cycle fields
          timesPerCycle: e.times_per_cycle ?? 1,
          cycleSlots: (() => { console.log('[PetsContext load] cycle_slots for event', e.id, ':', e.cycle_slots); return Array.isArray(e.cycle_slots) ? e.cycle_slots : []; })(),
          // Interval fields
          repeatIntervalValue: e.repeat_interval_value ?? undefined,
          repeatIntervalUnit: e.repeat_interval_unit ?? undefined,
          repeatEndDate: e.repeat_end_date ?? undefined,
          notes: e.notes ?? undefined,
          photos: Array.isArray(e.photos) ? e.photos : [],
          contactName: e.contact_name ?? undefined,
          contactPhone: e.contact_phone ?? undefined,
          contactAddress: e.contact_address ?? undefined,
          notificationIds: Array.isArray(e.notification_ids) ? e.notification_ids : [],
          extraFields: e.extra_fields && typeof e.extra_fields === "object" && !Array.isArray(e.extra_fields) ? e.extra_fields as Record<string, string> : undefined,
          templateKey: e.template_key ?? undefined,
          createdAt: e.created_at ?? new Date().toISOString(),
        };
      }),
  }));
}

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Always-current ref — updated synchronously on every render so that
  // useCallback functions with [] deps can read the latest pets without
  // being stale (avoids the stale-closure overwrite bug in updateHealthEvent).
  const petsRef = React.useRef(pets);
  petsRef.current = pets;

  // ── Initial load from local cache ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(STORAGE_KEY);
        if (data) {
          const parsed = JSON.parse(data);
          setPets(Array.isArray(parsed) ? parsed.map(migratePet) : []);
        }
      } catch (e) {
        if (__DEV__) console.error("Failed to load pets from cache", e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // ── Listen for auth changes → sync from Supabase ───────────────────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        syncFromSupabase(session.user.id);
      } else if (event === "SIGNED_OUT") {
        setPets([]);
        await AsyncStorage.removeItem(STORAGE_KEY);
      }
    });
    // Also trigger on initial load if already authenticated
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) syncFromSupabase(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch all data from Supabase and update state ──────────────────────────
  const syncFromSupabase = async (userId: string) => {
    setIsSyncing(true);
    try {
      const { data: petsRows, error } = await supabase
        .from("pets").select("*").eq("owner_id", userId);
      if (error || !petsRows?.length) { setIsSyncing(false); return; }

      const petIds = petsRows.map(p => p.id);

      // Snapshot current local health events using the ref (always fresh, unlike
      // the `pets` closure which is stale on initial mount when pets=[]).
      // Used to preserve locally-added events that haven't synced to Supabase yet
      // (e.g. insert failed due to missing migration columns, or race with slow insert).
      const localHealthEventMap = new Map(petsRef.current.map(p => [p.id, p.healthEvents ?? []]));

      const [vaccs, docs, weights, reminders, healthEventsRes] = await Promise.all([
        supabase.from("vaccinations").select("*").in("pet_id", petIds),
        supabase.from("documents").select("*").in("pet_id", petIds),
        supabase.from("weight_entries").select("*").in("pet_id", petIds),
        supabase.from("reminders").select("*").in("pet_id", petIds),
        supabase.from("health_events").select("*").in("pet_id", petIds),
      ]);

      if (healthEventsRes.error && __DEV__) {
        console.warn("Supabase health_events fetch:", healthEventsRes.error.message);
      }

      const assembled = assemblePets(
        petsRows,
        vaccs.data ?? [],
        docs.data ?? [],
        weights.data ?? [],
        reminders.data ?? [],
        // If the query failed (table missing, RLS error, etc.) pass an empty
        // array — we restore local events below, after photo URL mapping.
        healthEventsRes.data ?? []
      );

      const petsWithPhotos = await Promise.all(
        assembled.map(async (pet) => {
          const storagePath = extractStoragePath(pet.photoUri);
          if (storagePath) {
            const { data: signed } = await supabase.storage
              .from("pet-photos")
              .createSignedUrl(storagePath, 3600);
            if (signed?.signedUrl) {
              return { ...pet, photoUri: signed.signedUrl };
            }
          }
          return pet;
        })
      );

      const migratedPets = petsWithPhotos.map(pet => ({
        ...pet,
        vaccinations: pet.vaccinations ?? [],
        documents: pet.documents ?? [],
        weightHistory: pet.weightHistory ?? [],
        reminders: pet.reminders ?? [],
        // Merge strategy: start from Supabase events (or local fallback on error),
        // then re-add any locally-known events whose IDs are absent from Supabase.
        // This preserves events saved locally but not yet in Supabase (e.g. birthday
        // events when the insert failed due to a missing migration column, or a race
        // where syncFromSupabase queried before the insert completed).
        healthEvents: (() => {
          const remoteEvents = healthEventsRes.error
            ? (localHealthEventMap.get(pet.id) ?? [])
            : (pet.healthEvents ?? []);
          const localEvents = localHealthEventMap.get(pet.id) ?? [];
          const remoteIds = new Set(remoteEvents.map((e: HealthEvent) => e.id));
          const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
          const pendingLocal = localEvents.filter((e: HealthEvent) =>
            !remoteIds.has(e.id) &&
            !e.isVirtual &&
            e.createdAt && e.createdAt > sixtySecondsAgo
          );
          if (__DEV__ && pendingLocal.length > 0) {
            console.log(`[syncFromSupabase] preserving ${pendingLocal.length} local-only event(s) for pet ${pet.id}:`, pendingLocal.map((e: HealthEvent) => e.id));
          }
          return [...remoteEvents, ...pendingLocal];
        })(),
        length: pet.length ?? undefined,
        height: pet.height ?? undefined,
        personality: pet.personality ?? undefined,
        description: pet.description ?? undefined,
        medicalProfile: pet.medicalProfile ?? undefined,
      }));

      setPets(migratedPets);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPets));
    } catch (e) {
      if (__DEV__) console.warn("Supabase sync failed (offline?)", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const savePets = async (updated: Pet[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      if (__DEV__) console.error("Failed to save pets", e);
    }
  };

  // ─── PETS ─────────────────────────────────────────────────────────────────
  const addPet = useCallback(
    async (petData: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents" | "weightHistory" | "reminders" | "healthEvents">) => {
      const today = new Date();
      const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const initWeightEntry: WeightEntry | null = petData.weight
        ? { id: generateId(), date: todayIso, weight: parseFloat(petData.weight) }
        : null;
      const newPet: Pet = {
        ...petData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        vaccinations: [], documents: [],
        weightHistory: initWeightEntry ? [initWeightEntry] : [],
        reminders: [],
        healthEvents: [],
      };
      const updated = [...pets, newPet];
      setPets(updated);
      petsRef.current = updated; // sync update so callers in the same tick (e.g. upsertBirthdayEvent) can find the new pet
      await savePets(updated);

      const uid = await getCurrentUserId();
      if (uid) {
        const { error: petError } = await supabase.from("pets").insert({
          id: newPet.id, owner_id: uid, name: newPet.name,
          species: newPet.species, custom_species: newPet.customSpecies ?? null,
          breed: newPet.breed, birthdate: newPet.birthdate, weight: newPet.weight,
          gender: newPet.gender, color: newPet.color ?? null,
          photo_url: extractStoragePath(newPet.photoUri) ?? null,
          medical_profile: newPet.medicalProfile ?? null,
          length: newPet.length ?? null,
          height: newPet.height ?? null,
          personality: newPet.personality ?? null,
          description: newPet.description ?? null,
          created_at: newPet.createdAt,
        });
        if (petError && __DEV__) console.warn("Supabase addPet:", petError.message);
        if (initWeightEntry) {
          const { error: weightError } = await supabase.from("weight_entries").insert({
            id: initWeightEntry.id, pet_id: newPet.id,
            date: initWeightEntry.date, weight: initWeightEntry.weight,
          });
          if (weightError && __DEV__) console.warn("Supabase addWeightEntry (init):", weightError.message);
        }
      }
      return newPet;
    },
    [pets]
  );

  const updatePet = useCallback(
    async (id: string, updates: Partial<Pet>) => {
      const updated = pets.map(p => p.id === id ? { ...p, ...updates } : p);
      setPets(updated);
      await savePets(updated);

      getCurrentUserId().then(async uid => {
        if (!uid) return;
        const existing = pets.find(p => p.id === id);
        const merged = { ...existing, ...updates };
        const { error } = await supabase.from("pets").update({
          name: merged.name,
          species: merged.species,
          custom_species: merged.customSpecies ?? null,
          breed: merged.breed,
          birthdate: merged.birthdate,
          adoption_date: merged.adoptionDate ?? null,
          weight: merged.weight,
          gender: merged.gender ?? null,
          color: merged.color ?? null,
          photo_url: extractStoragePath(merged.photoUri) ?? null,
          medical_profile: merged.medicalProfile ?? null,
          length: merged.length ?? null,
          height: merged.height ?? null,
          personality: merged.personality ?? null,
          description: merged.description ?? null,
          updated_at: new Date().toISOString(),
        }).eq("id", id);
        if (error) {
          if (__DEV__) console.warn("Supabase updatePet (full):", error.message);
          const { error: retryError } = await supabase.from("pets").update({
            name: merged.name,
            species: merged.species,
            custom_species: merged.customSpecies ?? null,
            breed: merged.breed,
            birthdate: merged.birthdate,
            weight: merged.weight,
            gender: merged.gender ?? null,
            color: merged.color ?? null,
            photo_url: extractStoragePath(merged.photoUri) ?? null,
            medical_profile: merged.medicalProfile ?? null,
            updated_at: new Date().toISOString(),
          }).eq("id", id);
          if (retryError && __DEV__) console.warn("Supabase updatePet (base):", retryError.message);
        }
      });
    },
    [pets]
  );

  const deletePet = useCallback(
    async (id: string) => {
      const updated = pets.filter(p => p.id !== id);
      setPets(updated);
      await savePets(updated);

      getCurrentUserId().then(uid => {
        if (!uid) return;
        supabase.from("pets").delete().eq("id", id)
          .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deletePet:", error.message); });
      });
    },
    [pets]
  );

  // ─── VACCINATIONS ─────────────────────────────────────────────────────────
  const addVaccination = useCallback(
    async (petId: string, vaccination: Omit<Vaccination, "id">) => {
      const newV: Vaccination = { ...vaccination, id: generateId() };
      const updated = pets.map(p =>
        p.id === petId ? { ...p, vaccinations: [...p.vaccinations, newV] } : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("vaccinations").insert({
        id: newV.id, pet_id: petId, name: newV.name, date: newV.date,
        next_date: newV.nextDate, notes: newV.notes ?? null,
        vet_name: newV.vetName ?? null, notification_id: newV.notificationId ?? null,
      }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase addVaccination:", error.message); });
    },
    [pets]
  );

  const updateVaccination = useCallback(
    async (petId: string, vaccinationId: string, updates: Partial<Vaccination>) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, vaccinations: p.vaccinations.map(v => v.id === vaccinationId ? { ...v, ...updates } : v) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("vaccinations").update({
        name: updates.name, date: updates.date, next_date: updates.nextDate,
        notes: updates.notes ?? null, vet_name: updates.vetName ?? null,
        notification_id: updates.notificationId ?? null,
      }).eq("id", vaccinationId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateVaccination:", error.message); });
    },
    [pets]
  );

  const deleteVaccination = useCallback(
    async (petId: string, vaccinationId: string) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, vaccinations: p.vaccinations.filter(v => v.id !== vaccinationId) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("vaccinations").delete().eq("id", vaccinationId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deleteVaccination:", error.message); });
    },
    [pets]
  );

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  const addDocument = useCallback(
    async (petId: string, document: Omit<Document, "id">) => {
      const newDoc: Document = { ...document, id: generateId() };
      const updated = pets.map(p =>
        p.id === petId ? { ...p, documents: [...p.documents, newDoc] } : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("documents").insert({
        id: newDoc.id, pet_id: petId, name: newDoc.name, uri: newDoc.uri,
        type: newDoc.type, date: newDoc.date, size: newDoc.size ?? null,
        category: newDoc.category ?? null,
      }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase addDocument:", error.message); });
    },
    [pets]
  );

  const deleteDocument = useCallback(
    async (petId: string, documentId: string) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, documents: p.documents.filter(d => d.id !== documentId) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("documents").delete().eq("id", documentId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deleteDocument:", error.message); });
    },
    [pets]
  );

  // ─── WEIGHT ───────────────────────────────────────────────────────────────
  const addWeightEntry = useCallback(
    async (petId: string, entry: Omit<WeightEntry, "id">) => {
      const pet = pets.find(p => p.id === petId);
      const existing = (pet?.weightHistory ?? []).find(e => e.date === entry.date);
      if (existing) {
        const updated = pets.map(p =>
          p.id === petId
            ? { ...p, weightHistory: (p.weightHistory ?? []).map(e => e.date === entry.date ? { ...e, weight: entry.weight } : e) }
            : p
        );
        setPets(updated);
        await savePets(updated);
        supabase.from("weight_entries").update({ weight: entry.weight }).eq("id", existing.id)
          .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateWeightEntry (dedup):", error.message); });
        return;
      }
      const newEntry: WeightEntry = { ...entry, id: generateId() };
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, weightHistory: [...(p.weightHistory ?? []), newEntry] }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("weight_entries").insert({
        id: newEntry.id, pet_id: petId, date: newEntry.date, weight: newEntry.weight,
      }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase addWeightEntry:", error.message); });
    },
    [pets]
  );

  const deleteWeightEntry = useCallback(
    async (petId: string, entryId: string) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, weightHistory: (p.weightHistory ?? []).filter(e => e.id !== entryId) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("weight_entries").delete().eq("id", entryId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deleteWeightEntry:", error.message); });
    },
    [pets]
  );

  const updateWeightEntry = useCallback(
    async (petId: string, entryId: string, weight: number) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, weightHistory: (p.weightHistory ?? []).map(e => e.id === entryId ? { ...e, weight } : e) }
          : p
      );
      setPets(updated);
      await savePets(updated);
      supabase.from("weight_entries").update({ weight }).eq("id", entryId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateWeightEntry:", error.message); });
    },
    [pets]
  );

  // ─── REMINDERS ────────────────────────────────────────────────────────────
  const addReminder = useCallback(
    async (petId: string, reminder: Omit<Reminder, "id">) => {
      const newR: Reminder = { ...reminder, id: generateId() };
      const updated = pets.map(p =>
        p.id === petId ? { ...p, reminders: [...(p.reminders ?? []), newR] } : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("reminders").insert({
        id: newR.id, pet_id: petId, type: newR.type, date: newR.date,
        next_date: newR.nextDate, notes: newR.notes ?? null,
        notification_id: newR.notificationId ?? null,
      }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase addReminder:", error.message); });
    },
    [pets]
  );

  const updateReminder = useCallback(
    async (petId: string, reminderId: string, updates: Partial<Reminder>) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, reminders: (p.reminders ?? []).map(r => r.id === reminderId ? { ...r, ...updates } : r) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("reminders").update({
        type: updates.type, date: updates.date, next_date: updates.nextDate,
        notes: updates.notes ?? null, notification_id: updates.notificationId ?? null,
      }).eq("id", reminderId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateReminder:", error.message); });
    },
    [pets]
  );

  const deleteReminder = useCallback(
    async (petId: string, reminderId: string) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, reminders: (p.reminders ?? []).filter(r => r.id !== reminderId) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("reminders").delete().eq("id", reminderId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deleteReminder:", error.message); });
    },
    [pets]
  );

  // ─── HEALTH EVENTS ────────────────────────────────────────────────────────
  const addHealthEvent = useCallback(
    async (petId: string, eventData: Omit<HealthEvent, "id" | "petId" | "createdAt">): Promise<HealthEvent> => {
      const newId = generateId();
      const newSeriesId = eventData.seriesId ?? generateUUID();
      // Compute rrule from interval fields when creating a recurring event
      const computedRrule: string | undefined = eventData.rrule ?? (() => {
        if (eventData.recurrenceType !== "regular") return undefined;
        if (eventData.repeatIntervalValue && eventData.repeatIntervalUnit) {
          return buildRruleString(eventData.repeatIntervalValue, eventData.repeatIntervalUnit, eventData.repeatEndDate);
        }
        if (eventData.repeatIntervalDays) return buildRruleString(eventData.repeatIntervalDays, "day");
        if (eventData.repeatRule === "yearly" || eventData.type === "birthday" || eventData.type === "family_day") return "FREQ=YEARLY";
        return undefined;
      })();
      const newEvent: HealthEvent = {
        ...eventData,
        id: newId,
        petId,
        createdAt: new Date().toISOString(),
        seriesId: newSeriesId,
        isCurrent: true,
        isModified: false,
        rrule: computedRrule,
        recurrenceId: undefined,
      };
      let updated = pets.map(p =>
        p.id === petId ? { ...p, healthEvents: [...(p.healthEvents ?? []), newEvent] } : p
      );
      // family_day: also save adoption_date on the pet
      if (newEvent.type === "family_day" && newEvent.date) {
        updated = updated.map(p =>
          p.id === petId ? { ...p, adoptionDate: newEvent.date } : p
        );
        getCurrentUserId().then(uid => {
          if (!uid) return;
          supabase.from("pets").update({ adoption_date: newEvent.date }).eq("id", petId)
            .then(({ error }) => { if (error && __DEV__) console.warn("Supabase family_day adoptionDate:", error.message); });
        });
      }
      setPets(updated);
      savePets(updated);

      supabase.from("health_events").insert({
        id: newEvent.id,
        pet_id: petId,
        type: newEvent.type,
        title: newEvent.title,
        date: newEvent.date,
        time: newEvent.time ?? null,
        next_date: newEvent.nextDate ?? null,
        next_time: newEvent.nextTime ?? null,
        status: newEvent.status,
        recurrence_type: newEvent.recurrenceType,
        repeat_interval_days: newEvent.repeatIntervalDays ?? null,
        repeat_rule: newEvent.repeatRule ?? null,
        repeat_interval_value: newEvent.repeatIntervalValue ?? null,
        repeat_interval_unit: newEvent.repeatIntervalUnit ?? null,
        repeat_end_date: newEvent.repeatEndDate ?? null,
        series_id: newEvent.seriesId,
        is_current: true,
        is_modified: false,
        rrule: newEvent.rrule ?? null,
        recurrence_id: null,
        times_per_cycle: newEvent.timesPerCycle ?? 1,
        cycle_slots: newEvent.cycleSlots ?? [],
        notes: newEvent.notes ?? null,
        photos: newEvent.photos ?? [],
        contact_name: newEvent.contactName ?? null,
        contact_phone: newEvent.contactPhone ?? null,
        contact_address: newEvent.contactAddress ?? null,
        notification_ids: newEvent.notificationIds ?? [],
        extra_fields: newEvent.extraFields ?? {},
        template_key: newEvent.templateKey ?? null,
        created_at: newEvent.createdAt,
      }).then(({ error }) => {
        if (error && __DEV__) console.warn("Supabase addHealthEvent:", error.message);
      });

      return newEvent;
    },
    [pets]
  );

  const updateHealthEvent = useCallback(
    async (petId: string, eventId: string, updates: Partial<HealthEvent>) => {
      // Read from petsRef.current (not the closure `pets`) so this function
      // always operates on the latest committed state even when called from
      // a stale closure (e.g. the background notification task in handleSave
      // that runs after addHealthEvent has already updated pets).
      const currentPets = petsRef.current;
      const originalEvent = currentPets
        .find(p => p.id === petId)?.healthEvents
        ?.find(e => e.id === eventId);

      let petsToSave = currentPets.map(p =>
        p.id === petId
          ? { ...p, healthEvents: (p.healthEvents ?? []).map(e => e.id === eventId ? { ...e, ...updates } : e) }
          : p
      );

      // family_day: sync date → pet adoptionDate
      if (updates.date && (updates.type === "family_day" || originalEvent?.type === "family_day")) {
        petsToSave = petsToSave.map(p => p.id === petId ? { ...p, adoptionDate: updates.date } : p);
        supabase.from("pets")
          .update({ adoption_date: updates.date })
          .eq("id", petId)
          .then(({ error }) => { if (error && __DEV__) console.warn("Supabase family_day date sync:", error.message); });
      }

      // Bidirectional sync: birthday event date → pet birthdate.
      // When the event date changes, update the pet's birthdate preserving
      // the original birth year but using the new month and day.
      if (updates.date && (updates.type === "birthday" || originalEvent?.type === "birthday")) {
        const pet = currentPets.find(p => p.id === petId);
        if (pet?.birthdate) {
          const birthYear = pet.birthdate.split("-")[0];
          const newParts = updates.date.split("-");
          if (birthYear && newParts.length === 3) {
            const newBirthdate = `${birthYear}-${newParts[1]}-${newParts[2]}`;
            petsToSave = petsToSave.map(p => p.id === petId ? { ...p, birthdate: newBirthdate } : p);
            supabase.from("pets")
              .update({ birthdate: newBirthdate })
              .eq("id", petId)
              .then(({ error }) => { if (error && __DEV__) console.warn("Supabase birthday→birthdate sync:", error.message); });
          }
        }
      }

      setPets(petsToSave);
      await savePets(petsToSave);

      const supabaseUpdate: Record<string, any> = {};
      if (updates.type !== undefined) supabaseUpdate.type = updates.type;
      if (updates.title !== undefined) supabaseUpdate.title = updates.title;
      if (updates.date !== undefined) supabaseUpdate.date = updates.date;
      if ("time" in updates) supabaseUpdate.time = updates.time ?? null;
      if ("nextDate" in updates) supabaseUpdate.next_date = updates.nextDate ?? null;
      if ("nextTime" in updates) supabaseUpdate.next_time = updates.nextTime ?? null;
      if (updates.status !== undefined) supabaseUpdate.status = updates.status;
      if (updates.recurrenceType !== undefined) supabaseUpdate.recurrence_type = updates.recurrenceType;
      if ("repeatIntervalDays" in updates) supabaseUpdate.repeat_interval_days = updates.repeatIntervalDays ?? null;
      if ("repeatRule" in updates) supabaseUpdate.repeat_rule = updates.repeatRule ?? null;
      if ("repeatIntervalValue" in updates) supabaseUpdate.repeat_interval_value = updates.repeatIntervalValue ?? null;
      if ("repeatIntervalUnit" in updates) supabaseUpdate.repeat_interval_unit = updates.repeatIntervalUnit ?? null;
      if ("repeatEndDate" in updates) supabaseUpdate.repeat_end_date = updates.repeatEndDate ?? null;
      if ("isCurrent" in updates) supabaseUpdate.is_current = updates.isCurrent;
      if ("isModified" in updates) supabaseUpdate.is_modified = updates.isModified;
      if ("rrule" in updates) supabaseUpdate.rrule = updates.rrule ?? null;
      if ("recurrenceId" in updates) supabaseUpdate.recurrence_id = updates.recurrenceId ?? null;
      if ("timesPerCycle" in updates) supabaseUpdate.times_per_cycle = updates.timesPerCycle ?? 1;
      if ("cycleSlots" in updates) { console.log('[updateHealthEvent] saving cycle_slots for event', eventId, ':', updates.cycleSlots); supabaseUpdate.cycle_slots = updates.cycleSlots ?? []; }
      if ("notes" in updates) supabaseUpdate.notes = updates.notes ?? null;
      if (updates.photos !== undefined) supabaseUpdate.photos = updates.photos;
      if ("contactName" in updates) supabaseUpdate.contact_name = updates.contactName ?? null;
      if ("contactPhone" in updates) supabaseUpdate.contact_phone = updates.contactPhone ?? null;
      if ("contactAddress" in updates) supabaseUpdate.contact_address = updates.contactAddress ?? null;
      if (updates.notificationIds !== undefined) supabaseUpdate.notification_ids = updates.notificationIds;
      if (updates.extraFields !== undefined) supabaseUpdate.extra_fields = updates.extraFields;
      if ("templateKey" in updates) supabaseUpdate.template_key = updates.templateKey ?? null;

      if (Object.keys(supabaseUpdate).length === 0) return;
      const { error } = await supabase.from("health_events").update(supabaseUpdate).eq("id", eventId);
      if (error) console.error("Supabase updateHealthEvent failed:", error.message, "payload:", supabaseUpdate);
    },
    [] // no closure over `pets` — reads petsRef.current at call time instead
  );

  const deleteHealthEvent = useCallback(
    async (petId: string, eventId: string) => {
      const updated = pets.map(p =>
        p.id === petId
          ? { ...p, healthEvents: (p.healthEvents ?? []).filter(e => e.id !== eventId) }
          : p
      );
      setPets(updated);
      await savePets(updated);

      supabase.from("health_events").delete().eq("id", eventId).then(({ error }) => {
        if (error && __DEV__) console.warn("Supabase deleteHealthEvent:", error.message);
      });
    },
    [pets]
  );

  /**
   * Mark an event as done. For regular series events, returns info the screen
   * needs to decide whether to auto-advance or show a dialog.
   *
   * Returns: { nextDate?, modifiedFutureCount }
   */
  const completeHealthEvent = useCallback(
    async (petId: string, eventId: string): Promise<{ nextDate?: string; modifiedFutureCount: number }> => {
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);
      const event = pet?.healthEvents?.find(e => e.id === eventId);
      // Virtual events (id: virtual_...) are not in healthEvents — silently skip
      if (!pet || !event) return { modifiedFutureCount: 0 };

      // Mark done
      const doneEvent: HealthEvent = { ...event, status: "done", isCurrent: false };
      const newHealthEvents = (pet.healthEvents ?? []).map(e => e.id === eventId ? doneEvent : e);

      let nextDate: string | undefined;

      if (event.recurrenceType === "regular") {
        // New architecture: compute next occurrence from rrule
        if (event.rrule) {
          nextDate = getNextOccurrenceAfter(event.rrule, event.date);
        } else {
          // Legacy fallback
          const interval = getSeriesInterval(event);
          if (interval) nextDate = addInterval(event.date, interval.value, interval.unit);
        }
        // Respect repeat end date
        if (event.repeatEndDate && nextDate && nextDate > event.repeatEndDate) {
          nextDate = undefined;
        }
      }

      // Count future exception/modified records in same series (used by dialog)
      const seriesId = event.seriesId ?? event.id;
      const modifiedFuture = (pet.healthEvents ?? []).filter(
        e =>
          e.seriesId === seriesId &&
          e.id !== eventId &&
          e.date > event.date &&
          e.status !== "done" &&
          e.status !== "cancelled" &&
          (e.recurrenceId != null || e.isModified === true)
      );

      const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newHealthEvents } : p);
      setPets(updated);
      await savePets(updated);

      supabase.from("health_events")
        .update({ status: "done", is_current: false })
        .eq("id", eventId)
        .then(({ error }) => {
          if (error && __DEV__) console.warn("Supabase completeHealthEvent:", error.message);
        });

      return { nextDate, modifiedFutureCount: modifiedFuture.length };
    },
    [] // reads petsRef.current
  );

  /**
   * Mark event done AND create next occurrence as the new is_current record.
   * Used when completing a regular event on its scheduled day (silent auto-advance).
   */
  const markDoneAndAdvance = useCallback(
    async (petId: string, eventId: string, nextDate: string) => {
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);
      const event = pet?.healthEvents?.find(e => e.id === eventId);
      if (!pet || !event) return;

      const doneEvent: HealthEvent = { ...event, status: "done", isCurrent: false };
      const resetCycleSlots = (event.cycleSlots ?? []).map(
        ({ completed_at, completed_by, ...rest }) => rest
      );
      const nextStatus = computeEventStatusV2({ status: "planned", date: nextDate, type: event.type, cycleSlots: resetCycleSlots, time: event.time });
      // New anchor preserves rrule so future occurrence generation continues correctly
      const nextEvent: HealthEvent = {
        ...event,
        id: generateId(),
        date: nextDate,
        status: nextStatus,
        isCurrent: true,
        isModified: false,
        rrule: event.rrule,        // preserve rrule on new anchor
        recurrenceId: undefined,   // anchors never have recurrenceId
        notificationIds: [],
        notes: undefined,
        photos: [],
        cycleSlots: resetCycleSlots,
        createdAt: new Date().toISOString(),
      };

      // Fast local check — guards against double-tap before Supabase responds
      const alreadyExistsLocally = pet.healthEvents?.some(
        e => e.seriesId === event.seriesId && e.date === nextDate && e.isCurrent === true
      );
      if (alreadyExistsLocally) return;

      const newHealthEvents = [
        ...(pet.healthEvents ?? []).map(e => e.id === eventId ? doneEvent : e),
        nextEvent,
      ];
      const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newHealthEvents } : p);
      setPets(updated);
      await savePets(updated);

      supabase.from("health_events")
        .update({ status: "done", is_current: false })
        .eq("id", eventId)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase markDoneAndAdvance (done):", error.message); });

      // Check Supabase before inserting to prevent duplicates after re-login
      const { data: existing } = await supabase
        .from('health_events')
        .select('id')
        .eq('series_id', event.seriesId ?? event.id)
        .eq('date', nextDate)
        .eq('is_current', true)
        .single();

      if (existing) return;

      supabase.from("health_events").insert({
        id: nextEvent.id,
        pet_id: petId,
        type: nextEvent.type,
        title: nextEvent.title,
        date: nextEvent.date,
        time: nextEvent.time ?? null,
        status: nextEvent.status,
        recurrence_type: nextEvent.recurrenceType,
        repeat_interval_days: nextEvent.repeatIntervalDays ?? null,
        repeat_rule: nextEvent.repeatRule ?? null,
        repeat_interval_value: nextEvent.repeatIntervalValue ?? null,
        repeat_interval_unit: nextEvent.repeatIntervalUnit ?? null,
        repeat_end_date: nextEvent.repeatEndDate ?? null,
        series_id: nextEvent.seriesId,
        is_current: true,
        is_modified: false,
        rrule: nextEvent.rrule ?? null,
        recurrence_id: null,
        times_per_cycle: nextEvent.timesPerCycle ?? 1,
        cycle_slots: nextEvent.cycleSlots ?? [],
        notes: null,
        photos: [],
        contact_name: nextEvent.contactName ?? null,
        contact_phone: nextEvent.contactPhone ?? null,
        contact_address: nextEvent.contactAddress ?? null,
        notification_ids: [],
        extra_fields: nextEvent.extraFields ?? {},
        template_key: nextEvent.templateKey ?? null,
        created_at: nextEvent.createdAt,
      }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase markDoneAndAdvance (next):", error.message); });
    },
    []
  );

  /**
   * Shift the series anchor to a new date. Optionally shifts all future is_modified
   * records by the same delta (preserving any non-date modifications).
   */
  const shiftSeriesAnchor = useCallback(
    async (petId: string, seriesId: string, newDate: string, shiftModified = false) => {
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);
      if (!pet) return;

      const anchor = (pet.healthEvents ?? []).find(
        e => (e.seriesId === seriesId || e.id === seriesId) && e.isCurrent === true
      );
      if (!anchor) return;

      const oldDate = anchor.date;
      const deltaMs = new Date(newDate).getTime() - new Date(oldDate).getTime();
      const deltaDays = Math.round(deltaMs / (1000 * 60 * 60 * 24));

      const newEvents = (pet.healthEvents ?? []).map(e => {
        if (e.id === anchor.id) {
          return { ...e, date: newDate };
        }
        if (shiftModified && e.isModified && (e.seriesId === seriesId || e.seriesId === anchor.id) && e.date > oldDate) {
          const shifted = addInterval(e.date, deltaDays, "day");
          return { ...e, date: shifted };
        }
        return e;
      });

      const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newEvents } : p);
      setPets(updated);
      await savePets(updated);

      supabase.from("health_events").update({ date: newDate }).eq("id", anchor.id)
        .then(({ error }) => { if (error && __DEV__) console.warn("Supabase shiftSeriesAnchor:", error.message); });

      if (shiftModified) {
        const modifiedToShift = (pet.healthEvents ?? []).filter(
          e => e.isModified && (e.seriesId === seriesId || e.seriesId === anchor.id) && e.date > oldDate && e.id !== anchor.id
        );
        for (const mod of modifiedToShift) {
          const shifted = addInterval(mod.date, deltaDays, "day");
          supabase.from("health_events").update({ date: shifted }).eq("id", mod.id)
            .then(({ error }) => { if (error && __DEV__) console.warn("Supabase shiftSeriesAnchor (mod):", error.message); });
        }
      }
    },
    []
  );

  /**
   * Delete a series event with scope:
   *   'this' — delete only this event (if real; virtual events just need no DB action)
   *   'future' — delete this and all future non-done events in the series
   */
  const deleteSeriesScope = useCallback(
    async (petId: string, eventId: string, scope: "this" | "future") => {
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);
      const event = pet?.healthEvents?.find(e => e.id === eventId);
      if (!pet || !event) return;

      let idsToDelete: string[] = [];
      if (scope === "this") {
        idsToDelete = [eventId];
      } else {
        // 'future': delete anchor + all future non-done events in series
        const seriesId = event.seriesId ?? event.id;
        idsToDelete = (pet.healthEvents ?? [])
          .filter(e =>
            (e.seriesId === seriesId || e.id === seriesId) &&
            e.date >= event.date &&
            e.status !== "done" &&
            e.status !== "cancelled" &&
            !e.isVirtual
          )
          .map(e => e.id);
      }

      const newEvents = (pet.healthEvents ?? []).filter(e => !idsToDelete.includes(e.id));
      const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newEvents } : p);
      setPets(updated);
      await savePets(updated);

      for (const id of idsToDelete) {
        supabase.from("health_events").delete().eq("id", id)
          .then(({ error }) => { if (error && __DEV__) console.warn("Supabase deleteSeriesScope:", error.message); });
      }
    },
    []
  );

  /**
   * Update a series event with scope:
   *   'this' — mark isModified=true, create a real record if virtual
   *   'future' — update the anchor's series parameters; delete future modified records
   */
  const updateSeriesScope = useCallback(
    async (petId: string, eventId: string, updates: Partial<HealthEvent>, scope: "this" | "future") => {
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);
      const event = pet?.healthEvents?.find(e => e.id === eventId);
      if (!pet || !event) return;

      if (scope === "this") {
        // "Edit only this occurrence" → create exception record (recurrenceId = this date)
        const isVirtual = event.isVirtual;
        const newId = isVirtual ? generateId() : eventId;
        const updatedEvent: HealthEvent = {
          ...event,
          ...updates,
          id: newId,
          isModified: true,
          isCurrent: false,
          isVirtual: undefined,
          // Exception record: links back to its original scheduled date
          recurrenceId: event.date,
          // Exceptions don't own the rrule — clear it
          rrule: undefined,
        };
        let newEvents: HealthEvent[];
        if (isVirtual) {
          newEvents = [...(pet.healthEvents ?? []), updatedEvent];
        } else {
          newEvents = (pet.healthEvents ?? []).map(e => e.id === eventId ? updatedEvent : e);
        }
        const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newEvents } : p);
        setPets(updated);
        await savePets(updated);

        if (isVirtual) {
          supabase.from("health_events").insert({
            id: updatedEvent.id, pet_id: petId, type: updatedEvent.type, title: updatedEvent.title,
            date: updatedEvent.date, time: updatedEvent.time ?? null, status: updatedEvent.status,
            recurrence_type: updatedEvent.recurrenceType, series_id: updatedEvent.seriesId,
            is_current: false, is_modified: true,
            rrule: null,
            recurrence_id: updatedEvent.recurrenceId ?? null,
            times_per_cycle: updatedEvent.timesPerCycle ?? 1, cycle_slots: updatedEvent.cycleSlots ?? [],
            repeat_interval_value: updatedEvent.repeatIntervalValue ?? null,
            repeat_interval_unit: updatedEvent.repeatIntervalUnit ?? null,
            repeat_end_date: updatedEvent.repeatEndDate ?? null,
            notes: updatedEvent.notes ?? null, photos: updatedEvent.photos ?? [],
            extra_fields: updatedEvent.extraFields ?? {}, template_key: updatedEvent.templateKey ?? null,
            notification_ids: updatedEvent.notificationIds ?? [], created_at: updatedEvent.createdAt,
          }).then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateSeriesScope (insert):", error.message); });
        } else {
          supabase.from("health_events").update({
            ...updates,
            is_modified: true,
            is_current: false,
            rrule: null,
            recurrence_id: updatedEvent.recurrenceId ?? null,
          }).eq("id", eventId)
            .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateSeriesScope (update):", error.message); });
        }
      } else {
        // scope = 'future': update anchor + delete all future exception records
        const seriesId = event.seriesId ?? event.id;
        const anchor = (pet.healthEvents ?? []).find(e => (e.seriesId === seriesId || e.id === seriesId) && e.isCurrent === true);
        if (!anchor) return;

        // Delete future exception records (new arch: recurrenceId set) and legacy modified records
        const futureExceptionIds = (pet.healthEvents ?? [])
          .filter(e =>
            e.seriesId === seriesId &&
            e.date >= event.date &&
            (e.recurrenceId != null || e.isModified === true)
          )
          .map(e => e.id);

        // Compute new rrule if interval fields changed
        const newRrule: string | undefined = (() => {
          const iv = (updates.repeatIntervalValue ?? anchor.repeatIntervalValue) as number | undefined;
          const iu = (updates.repeatIntervalUnit ?? anchor.repeatIntervalUnit) as "day" | "week" | "month" | "year" | undefined;
          const ed = updates.repeatEndDate ?? anchor.repeatEndDate;
          if (iv && iu) return buildRruleString(iv, iu, ed);
          return updates.rrule ?? anchor.rrule;
        })();

        const updatedAnchor: HealthEvent = { ...anchor, ...updates, rrule: newRrule };
        const newEvents = (pet.healthEvents ?? [])
          .filter(e => !futureExceptionIds.includes(e.id))
          .map(e => e.id === anchor.id ? updatedAnchor : e);

        const updated = currentPets.map(p => p.id === petId ? { ...p, healthEvents: newEvents } : p);
        setPets(updated);
        await savePets(updated);

        supabase.from("health_events").update({ ...updates, rrule: newRrule ?? null }).eq("id", anchor.id)
          .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateSeriesScope (anchor):", error.message); });

        for (const id of futureExceptionIds) {
          supabase.from("health_events").delete().eq("id", id)
            .then(({ error }) => { if (error && __DEV__) console.warn("Supabase updateSeriesScope (del exception):", error.message); });
        }
      }
    },
    []
  );

  const checkAndUpdateEventStatuses = useCallback(async () => {
    const currentPets = petsRef.current;

    const updatedPets = currentPets.map(pet => {
      const updatedEvents: HealthEvent[] = [];
      let petChanged = false;

      for (const event of pet.healthEvents ?? []) {
        if (event.status === "done" || event.status === "cancelled" || event.isVirtual) {
          updatedEvents.push(event);
          continue;
        }

        const newStatus = computeEventStatus(event, ""); // uses computeEventStatusV2 internally
        if (newStatus !== event.status) {
          petChanged = true;
          updatedEvents.push({ ...event, status: newStatus });
        } else {
          updatedEvents.push(event);
        }
      }

      if (petChanged) return { ...pet, healthEvents: updatedEvents };
      return pet;
    });

    const anyChanged = updatedPets.some((p, i) => p !== currentPets[i]);
    if (!anyChanged) return;

    setPets(updatedPets);
    await savePets(updatedPets);

    // Sync status changes to Supabase (only stored events)
    for (const pet of updatedPets) {
      for (const event of pet.healthEvents ?? []) {
        if (event.isVirtual) continue;
        const original = currentPets
          .find(p => p.id === pet.id)?.healthEvents
          ?.find(e => e.id === event.id);
        if (original && original.status !== event.status) {
          supabase.from("health_events")
            .update({ status: event.status })
            .eq("id", event.id)
            .then(({ error }) => {
              if (error && __DEV__) console.warn("Supabase statusCheck update:", error.message);
            });
        }
      }
    }
  }, []);

  // ─── BIRTHDAY UPSERT ──────────────────────────────────────────────────────
  const upsertBirthdayEvent = useCallback(
    async (petId: string, birthdate: string, title: string) => {
      if (!birthdate) return;
      const currentPets = petsRef.current;
      const pet = currentPets.find(p => p.id === petId);

      if (__DEV__) {
        console.log("[upsertBirthdayEvent] petId:", petId, "found in petsRef:", !!pet, "birthdate:", birthdate);
      }

      if (!pet) {
        if (__DEV__) console.warn("[upsertBirthdayEvent] pet not found in petsRef.current — was petsRef updated after addPet?");
        return;
      }

      const bdDate = nextBirthdayDate(birthdate);
      // Only match an active (non-terminal) birthday event. Excluding 'done' is
      // critical: after a birthday auto-completes, the done event must NOT be
      // found here — otherwise upsertBirthdayEvent updates the done record
      // instead of the newly-created planned one, producing a duplicate.
      const existing = (pet.healthEvents ?? []).find(
        e => e.type === "birthday" && e.status !== "cancelled" && e.status !== "done"
      );

      if (__DEV__) {
        console.log("[upsertBirthdayEvent] bdDate:", bdDate, "existing event:", existing?.id ?? "none", "existing status:", existing?.status ?? "none");
      }

      if (existing) {
        if (existing.date !== bdDate) {
          const updated = petsRef.current.map(p =>
            p.id === petId
              ? { ...p, healthEvents: (p.healthEvents ?? []).map(e => e.id === existing.id ? { ...e, date: bdDate } : e) }
              : p
          );
          setPets(updated);
          petsRef.current = updated;
          await savePets(updated);
          const { error } = await supabase.from("health_events")
            .update({ date: bdDate })
            .eq("id", existing.id);
          if (__DEV__) console.log("[upsertBirthdayEvent] update result — error:", error?.message ?? "none");
        } else {
          if (__DEV__) console.log("[upsertBirthdayEvent] date unchanged, no-op");
        }
      } else {
        const todayStr = getTodayStr();
        const newSeriesId = generateUUID();
        const newEvent: HealthEvent = {
          id: generateId(),
          petId,
          type: "birthday",
          title,
          date: bdDate,
          status: bdDate >= todayStr ? "planned" : "overdue",
          recurrenceType: "regular",
          repeatRule: "yearly",
          repeatIntervalValue: 1,
          repeatIntervalUnit: "year",
          rrule: "FREQ=YEARLY",
          recurrenceId: undefined,
          seriesId: newSeriesId,
          isCurrent: true,
          isModified: false,
          timesPerCycle: 1,
          cycleSlots: [],
          notificationIds: [],
          createdAt: new Date().toISOString(),
        };
        const updated = petsRef.current.map(p =>
          p.id === petId ? { ...p, healthEvents: [...(p.healthEvents ?? []), newEvent] } : p
        );
        setPets(updated);
        petsRef.current = updated;
        await savePets(updated);
        const { error } = await supabase.from("health_events").insert({
          id: newEvent.id, pet_id: petId, type: newEvent.type, title: newEvent.title,
          date: newEvent.date, status: newEvent.status,
          recurrence_type: newEvent.recurrenceType,
          repeat_rule: newEvent.repeatRule,
          repeat_interval_value: 1, repeat_interval_unit: "year",
          rrule: "FREQ=YEARLY",
          recurrence_id: null,
          series_id: newSeriesId, is_current: true, is_modified: false,
          times_per_cycle: 1, cycle_slots: [],
          notification_ids: [],
          created_at: newEvent.createdAt,
        });
        if (__DEV__) console.log("[upsertBirthdayEvent] insert result — id:", newEvent.id, "error:", error?.message ?? "none");
      }
    },
    []
  );

  // ─── HELPERS ──────────────────────────────────────────────────────────────
  const getPet = useCallback(
    (id: string) => pets.find(p => p.id === id),
    [pets]
  );

  const exportData = useCallback((): string => {
    return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), pets }, null, 2);
  }, [pets]);

  const importData = useCallback(async (json: string): Promise<boolean> => {
    try {
      const parsed = JSON.parse(json);
      const petsData: Pet[] = (parsed.pets ?? parsed).map(migratePet);
      setPets(petsData);
      await savePets(petsData);
      return true;
    } catch {
      return false;
    }
  }, []);

  // ── Run status check once after initial data load ──────────────────────────
  useEffect(() => {
    if (isLoaded) {
      checkAndUpdateEventStatuses();
    }
  }, [isLoaded]);

  return (
    <PetsContext.Provider
      value={{
        pets, addPet, updatePet, deletePet,
        addVaccination, updateVaccination, deleteVaccination,
        addDocument, deleteDocument,
        addWeightEntry, updateWeightEntry, deleteWeightEntry,
        addReminder, updateReminder, deleteReminder,
        addHealthEvent, updateHealthEvent, deleteHealthEvent,
        completeHealthEvent, markDoneAndAdvance, shiftSeriesAnchor,
        deleteSeriesScope, updateSeriesScope,
        checkAndUpdateEventStatuses, upsertBirthdayEvent,
        getPet, isLoaded, isSyncing,
        exportData, importData,
      }}
    >
      {children}
    </PetsContext.Provider>
  );
}

export function usePets() {
  const ctx = useContext(PetsContext);
  if (!ctx) throw new Error("usePets must be used within PetsProvider");
  return ctx;
}
