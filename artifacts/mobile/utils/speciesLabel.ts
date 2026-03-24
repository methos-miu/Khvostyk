import { Species, Gender } from "@/context/PetsContext";
import { getAnimalName } from "@/constants/animals";

export function getSpeciesLabel(
  species: Species,
  gender: Gender,
  lang: "uk" | "en" = "uk",
  customSpecies?: string
): string {
  // Delegate to the central animal name lookup
  const name = getAnimalName(species, customSpecies, lang);

  // For cat/dog apply gendered forms
  if (species === "cat" && lang === "uk") {
    if (gender === "male") return "Кіт";
    if (gender === "female") return "Кішка";
    return "Кіт / Кішка";
  }
  if (species === "cat") return "Cat";

  if (species === "dog" && lang === "uk") {
    if (gender === "male") return "Пес";
    if (gender === "female") return "Собачка";
    return "Собака";
  }
  if (species === "dog") return "Dog";

  return name;
}
