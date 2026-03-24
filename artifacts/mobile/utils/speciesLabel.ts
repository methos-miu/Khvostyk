import { Species, Gender } from "@/context/PetsContext";

/** Returns gendered species label in Ukrainian */
const UK_LABELS: Record<Species, { male: string; female: string; neutral: string }> = {
  cat:       { male: "Кіт",           female: "Кішка",        neutral: "Кіт / Кішка" },
  dog:       { male: "Пес",           female: "Собачка",      neutral: "Собака" },
  rabbit:    { male: "Кролик",        female: "Крольчиха",    neutral: "Кролик" },
  hamster:   { male: "Хом'як",        female: "Хом'ячка",     neutral: "Хом'як" },
  guinea_pig:{ male: "Морський свин", female: "Морська свинка",neutral: "Морська свинка" },
  bird:      { male: "Птах",          female: "Птаха",        neutral: "Птах" },
  turtle:    { male: "Черепах",       female: "Черепаха",     neutral: "Черепаха" },
  reptile:   { male: "Рептилій",      female: "Рептилія",     neutral: "Рептилія" },
  fish:      { male: "Рибка",         female: "Рибка",        neutral: "Рибка" },
  ferret:    { male: "Тхір",          female: "Тхориця",      neutral: "Тхір" },
  hedgehog:  { male: "Їжак",          female: "Їжачиха",      neutral: "Їжак" },
  other:     { male: "Улюбленець",    female: "Улюбленка",    neutral: "Інше" },
};

const EN_LABELS: Record<Species, { male: string; female: string; neutral: string }> = {
  cat:       { male: "Cat",         female: "Cat",          neutral: "Cat" },
  dog:       { male: "Dog",         female: "Dog",          neutral: "Dog" },
  rabbit:    { male: "Rabbit",      female: "Rabbit",       neutral: "Rabbit" },
  hamster:   { male: "Hamster",     female: "Hamster",      neutral: "Hamster" },
  guinea_pig:{ male: "Guinea Pig",  female: "Guinea Pig",   neutral: "Guinea Pig" },
  bird:      { male: "Bird",        female: "Bird",         neutral: "Bird" },
  turtle:    { male: "Turtle",      female: "Turtle",       neutral: "Turtle" },
  reptile:   { male: "Reptile",     female: "Reptile",      neutral: "Reptile" },
  fish:      { male: "Fish",        female: "Fish",         neutral: "Fish" },
  ferret:    { male: "Ferret",      female: "Ferret",       neutral: "Ferret" },
  hedgehog:  { male: "Hedgehog",    female: "Hedgehog",     neutral: "Hedgehog" },
  other:     { male: "Pet",         female: "Pet",          neutral: "Other" },
};

export function getSpeciesLabel(
  species: Species,
  gender: Gender,
  lang: "uk" | "en" = "uk",
  customSpecies?: string
): string {
  if (species === "other" && customSpecies?.trim()) {
    return customSpecies.trim();
  }
  const map = lang === "uk" ? UK_LABELS : EN_LABELS;
  const entry = map[species] ?? map.other;
  if (gender === "male") return entry.male;
  if (gender === "female") return entry.female;
  return entry.neutral;
}
