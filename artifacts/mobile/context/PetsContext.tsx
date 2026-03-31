import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { supabase } from "@/lib/supabase";

export type Species =
  | "cat" | "dog" | "rabbit" | "hamster" | "guinea_pig"
  | "bird" | "turtle" | "reptile" | "fish" | "ferret"
  | "hedgehog" | "other";

export type Gender = "male" | "female" | null;
export type ReminderType = "deworming" | "flea_tick" | "birthday" | "checkup";
export type DocumentCategory = "analysis" | "prescription" | "insurance" | "passport" | "other";

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
  weight: string;
  photoUri?: string;
  color?: string;
  gender?: Gender;
  vaccinations: Vaccination[];
  documents: Document[];
  weightHistory: WeightEntry[];
  reminders: Reminder[];
  medicalProfile?: MedicalProfile;
  length?: number;
  height?: number;
  personality?: string;
  description?: string;
  createdAt: string;
}

interface PetsContextType {
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents" | "weightHistory" | "reminders">) => Promise<Pet>;
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
    weight: raw.weight ?? "",
    photoUri: raw.photoUri,
    color: raw.color,
    gender: raw.gender ?? null,
    vaccinations: raw.vaccinations ?? [],
    documents: raw.documents ?? [],
    weightHistory: raw.weightHistory ?? [],
    reminders: raw.reminders ?? [],
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
  remindersRows: any[]
): Pet[] {
  return petsRows.map(p => ({
    id: p.id,
    name: p.name ?? "",
    species: (p.species as Species) ?? "other",
    customSpecies: p.custom_species ?? undefined,
    breed: p.breed ?? "",
    birthdate: p.birthdate ?? "",
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
  }));
}

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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
        console.error("Failed to load pets from cache", e);
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
      const [vaccs, docs, weights, reminders] = await Promise.all([
        supabase.from("vaccinations").select("*").in("pet_id", petIds),
        supabase.from("documents").select("*").in("pet_id", petIds),
        supabase.from("weight_entries").select("*").in("pet_id", petIds),
        supabase.from("reminders").select("*").in("pet_id", petIds),
      ]);

      const assembled = assemblePets(
        petsRows,
        vaccs.data ?? [],
        docs.data ?? [],
        weights.data ?? [],
        reminders.data ?? []
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
        length: pet.length ?? undefined,
        height: pet.height ?? undefined,
        personality: pet.personality ?? undefined,
        description: pet.description ?? undefined,
        medicalProfile: pet.medicalProfile ?? undefined,
      }));

      setPets(migratedPets);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(migratedPets));
    } catch (e) {
      console.warn("Supabase sync failed (offline?)", e);
    } finally {
      setIsSyncing(false);
    }
  };

  const savePets = async (updated: Pet[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save pets", e);
    }
  };

  // ─── PETS ─────────────────────────────────────────────────────────────────
  const addPet = useCallback(
    async (petData: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents" | "weightHistory" | "reminders">) => {
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
      };
      const updated = [...pets, newPet];
      setPets(updated);
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
        if (petError) console.warn("Supabase addPet:", petError.message);
        if (initWeightEntry) {
          const { error: weightError } = await supabase.from("weight_entries").insert({
            id: initWeightEntry.id, pet_id: newPet.id,
            date: initWeightEntry.date, weight: initWeightEntry.weight,
          });
          if (weightError) console.warn("Supabase addWeightEntry (init):", weightError.message);
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
          console.warn("Supabase updatePet (full):", error.message);
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
          if (retryError) console.warn("Supabase updatePet (base):", retryError.message);
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
          .then(({ error }) => { if (error) console.warn("Supabase deletePet:", error.message); });
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
      }).then(({ error }) => { if (error) console.warn("Supabase addVaccination:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase updateVaccination:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase deleteVaccination:", error.message); });
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
      }).then(({ error }) => { if (error) console.warn("Supabase addDocument:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase deleteDocument:", error.message); });
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
          .then(({ error }) => { if (error) console.warn("Supabase updateWeightEntry (dedup):", error.message); });
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
      }).then(({ error }) => { if (error) console.warn("Supabase addWeightEntry:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase deleteWeightEntry:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase updateWeightEntry:", error.message); });
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
      }).then(({ error }) => { if (error) console.warn("Supabase addReminder:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase updateReminder:", error.message); });
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
        .then(({ error }) => { if (error) console.warn("Supabase deleteReminder:", error.message); });
    },
    [pets]
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

  return (
    <PetsContext.Provider
      value={{
        pets, addPet, updatePet, deletePet,
        addVaccination, updateVaccination, deleteVaccination,
        addDocument, deleteDocument,
        addWeightEntry, updateWeightEntry, deleteWeightEntry,
        addReminder, updateReminder, deleteReminder,
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
