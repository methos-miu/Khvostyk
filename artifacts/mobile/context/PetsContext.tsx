import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Species =
  | "cat"
  | "dog"
  | "rabbit"
  | "hamster"
  | "guinea_pig"
  | "bird"
  | "turtle"
  | "reptile"
  | "fish"
  | "ferret"
  | "hedgehog"
  | "other";

export type Gender = "male" | "female" | null;

export interface Vaccination {
  id: string;
  name: string;
  date: string;
  nextDate: string;
  notes?: string;
  vetName?: string;
}

export interface Document {
  id: string;
  name: string;
  uri: string;
  type: string;
  date: string;
  size?: number;
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
  createdAt: string;
}

interface PetsContextType {
  pets: Pet[];
  addPet: (pet: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents">) => Promise<Pet>;
  updatePet: (id: string, updates: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
  addVaccination: (petId: string, vaccination: Omit<Vaccination, "id">) => Promise<void>;
  updateVaccination: (petId: string, vaccinationId: string, updates: Partial<Vaccination>) => Promise<void>;
  deleteVaccination: (petId: string, vaccinationId: string) => Promise<void>;
  addDocument: (petId: string, document: Omit<Document, "id">) => Promise<void>;
  deleteDocument: (petId: string, documentId: string) => Promise<void>;
  getPet: (id: string) => Pet | undefined;
  isLoaded: boolean;
}

const PetsContext = createContext<PetsContextType | null>(null);

const STORAGE_KEY = "@vethelper_pets";

function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
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
      if (data) setPets(JSON.parse(data));
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
    async (petData: Omit<Pet, "id" | "createdAt" | "vaccinations" | "documents">) => {
      const newPet: Pet = {
        ...petData,
        id: generateId(),
        createdAt: new Date().toISOString(),
        vaccinations: [],
        documents: [],
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

  const getPet = useCallback(
    (id: string) => pets.find((p) => p.id === id),
    [pets]
  );

  return (
    <PetsContext.Provider
      value={{
        pets,
        addPet,
        updatePet,
        deletePet,
        addVaccination,
        updateVaccination,
        deleteVaccination,
        addDocument,
        deleteDocument,
        getPet,
        isLoaded,
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
