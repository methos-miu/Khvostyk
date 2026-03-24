import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

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

export interface MedicalProfile {
  allergies?: string;
  chronicConditions?: string;
  vetName?: string;
  vetPhone?: string;
}

export interface Pet {
  id: string;
  name: string;
  species: Species;
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
  deleteWeightEntry: (petId: string, entryId: string) => Promise<void>;
  addReminder: (petId: string, reminder: Omit<Reminder, "id">) => Promise<void>;
  updateReminder: (petId: string, reminderId: string, updates: Partial<Reminder>) => Promise<void>;
  deleteReminder: (petId: string, reminderId: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
  isLoaded: boolean;
  exportData: () => string;
  importData: (json: string) => Promise<boolean>;
}

const PetsContext = createContext<PetsContextType | null>(null);

const STORAGE_KEY = "@vethelper_pets";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}

function migratePet(raw: any): Pet {
  return {
    id: raw.id ?? generateId(),
    name: raw.name ?? "",
    species: raw.species ?? "other",
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
    createdAt: raw.createdAt ?? new Date().toISOString(),
  };
}

export function PetsProvider({ children }: { children: React.ReactNode }) {
  const [pets, setPets] = useState<Pet[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    loadPets();
  }, []);

  const loadPets = async () => {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        setPets(Array.isArray(parsed) ? parsed.map(migratePet) : []);
      }
    } catch (e) {
      console.error("Failed to load pets", e);
    } finally {
      setIsLoaded(true);
    }
  };

  const savePets = async (updated: Pet[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save pets", e);
    }
  };

  const addPet = useCallback(
    async (petData: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents" | "weightHistory" | "reminders">) => {
      const newPet: Pet = {
        ...petData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        vaccinations: [],
        documents: [],
        weightHistory: [],
        reminders: [],
      };
      const updated = [...pets, newPet];
      setPets(updated);
      await savePets(updated);
      return newPet;
    },
    [pets]
  );

  const updatePet = useCallback(
    async (id: string, updates: Partial<Pet>) => {
      const updated = pets.map((p) => (p.id === id ? { ...p, ...updates } : p));
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const deletePet = useCallback(
    async (id: string) => {
      const updated = pets.filter((p) => p.id !== id);
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const addVaccination = useCallback(
    async (petId: string, vaccination: Omit<Vaccination, "id">) => {
      const newV: Vaccination = { ...vaccination, id: generateId() };
      const updated = pets.map((p) =>
        p.id === petId ? { ...p, vaccinations: [...p.vaccinations, newV] } : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const updateVaccination = useCallback(
    async (petId: string, vaccinationId: string, updates: Partial<Vaccination>) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, vaccinations: p.vaccinations.map((v) => v.id === vaccinationId ? { ...v, ...updates } : v) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const deleteVaccination = useCallback(
    async (petId: string, vaccinationId: string) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, vaccinations: p.vaccinations.filter((v) => v.id !== vaccinationId) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const addDocument = useCallback(
    async (petId: string, document: Omit<Document, "id">) => {
      const newDoc: Document = { ...document, id: generateId() };
      const updated = pets.map((p) =>
        p.id === petId ? { ...p, documents: [...p.documents, newDoc] } : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const deleteDocument = useCallback(
    async (petId: string, documentId: string) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, documents: p.documents.filter((d) => d.id !== documentId) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const addWeightEntry = useCallback(
    async (petId: string, entry: Omit<WeightEntry, "id">) => {
      const newEntry: WeightEntry = { ...entry, id: generateId() };
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, weightHistory: [...(p.weightHistory ?? []), newEntry] }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const deleteWeightEntry = useCallback(
    async (petId: string, entryId: string) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, weightHistory: (p.weightHistory ?? []).filter((e) => e.id !== entryId) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const addReminder = useCallback(
    async (petId: string, reminder: Omit<Reminder, "id">) => {
      const newR: Reminder = { ...reminder, id: generateId() };
      const updated = pets.map((p) =>
        p.id === petId ? { ...p, reminders: [...(p.reminders ?? []), newR] } : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const updateReminder = useCallback(
    async (petId: string, reminderId: string, updates: Partial<Reminder>) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, reminders: (p.reminders ?? []).map((r) => r.id === reminderId ? { ...r, ...updates } : r) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const deleteReminder = useCallback(
    async (petId: string, reminderId: string) => {
      const updated = pets.map((p) =>
        p.id === petId
          ? { ...p, reminders: (p.reminders ?? []).filter((r) => r.id !== reminderId) }
          : p
      );
      setPets(updated);
      await savePets(updated);
    },
    [pets]
  );

  const getPet = useCallback(
    (id: string) => pets.find((p) => p.id === id),
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
        addWeightEntry, deleteWeightEntry,
        addReminder, updateReminder, deleteReminder,
        getPet, isLoaded,
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
