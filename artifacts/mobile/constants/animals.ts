export interface AnimalEntry {
  key: string;
  nameUk: string;
  nameEn: string;
  emoji: string;
  categoryKey: string;
}

export interface AnimalCategory {
  key: string;
  labelUk: string;
  labelEn: string;
  animals: AnimalEntry[];
}

export const ANIMAL_CATEGORIES: AnimalCategory[] = [
  {
    key: "domestic",
    labelUk: "СВІЙСЬКІ",
    labelEn: "DOMESTIC",
    animals: [
      { key: "rabbit",       nameUk: "Кролик",           nameEn: "Rabbit",        emoji: "🐰", categoryKey: "domestic" },
      { key: "hamster",      nameUk: "Хом'як",            nameEn: "Hamster",       emoji: "🐹", categoryKey: "domestic" },
      { key: "guinea_pig",   nameUk: "Морська свинка",    nameEn: "Guinea Pig",    emoji: "🐾", categoryKey: "domestic" },
      { key: "chinchilla",   nameUk: "Шиншила",           nameEn: "Chinchilla",    emoji: "🐭", categoryKey: "domestic" },
      { key: "rat",          nameUk: "Пацюк",             nameEn: "Rat",           emoji: "🐀", categoryKey: "domestic" },
      { key: "mouse",        nameUk: "Миша",              nameEn: "Mouse",         emoji: "🐭", categoryKey: "domestic" },
      { key: "hedgehog",     nameUk: "Їжак",              nameEn: "Hedgehog",      emoji: "🦔", categoryKey: "domestic" },
      { key: "ferret",       nameUk: "Тхір",              nameEn: "Ferret",        emoji: "🦡", categoryKey: "domestic" },
      { key: "degu",         nameUk: "Дегу",              nameEn: "Degu",          emoji: "🐀", categoryKey: "domestic" },
      { key: "sugar_glider", nameUk: "Цукровий поссум",   nameEn: "Sugar Glider",  emoji: "🐿️", categoryKey: "domestic" },
    ],
  },
  {
    key: "birds",
    labelUk: "ПТАХИ",
    labelEn: "BIRDS",
    animals: [
      { key: "budgie",       nameUk: "Папуга хвилястий",  nameEn: "Budgerigar",    emoji: "🦜", categoryKey: "birds" },
      { key: "cockatoo",     nameUk: "Какаду",            nameEn: "Cockatoo",      emoji: "🦜", categoryKey: "birds" },
      { key: "cockatiel",    nameUk: "Корела",            nameEn: "Cockatiel",     emoji: "🦜", categoryKey: "birds" },
      { key: "macaw",        nameUk: "Ара",               nameEn: "Macaw",         emoji: "🦜", categoryKey: "birds" },
      { key: "canary",       nameUk: "Канарка",           nameEn: "Canary",        emoji: "🐤", categoryKey: "birds" },
      { key: "zebra_finch",  nameUk: "Зебровий амадин",   nameEn: "Zebra Finch",   emoji: "🐦", categoryKey: "birds" },
      { key: "pigeon",       nameUk: "Голуб",             nameEn: "Pigeon",        emoji: "🕊️", categoryKey: "birds" },
      { key: "chicken",      nameUk: "Курка",             nameEn: "Chicken",       emoji: "🐔", categoryKey: "birds" },
      { key: "duck",         nameUk: "Качка",             nameEn: "Duck",          emoji: "🦆", categoryKey: "birds" },
      { key: "goose",        nameUk: "Гусак",             nameEn: "Goose",         emoji: "🦢", categoryKey: "birds" },
      { key: "turkey",       nameUk: "Індик",             nameEn: "Turkey",        emoji: "🦃", categoryKey: "birds" },
      { key: "peacock",      nameUk: "Павич",             nameEn: "Peacock",       emoji: "🦚", categoryKey: "birds" },
    ],
  },
  {
    key: "reptiles",
    labelUk: "РЕПТИЛІЇ",
    labelEn: "REPTILES",
    animals: [
      { key: "land_turtle",      nameUk: "Черепаха сухопутна", nameEn: "Land Turtle",     emoji: "🐢", categoryKey: "reptiles" },
      { key: "water_turtle",     nameUk: "Черепаха водна",     nameEn: "Water Turtle",    emoji: "🐢", categoryKey: "reptiles" },
      { key: "lizard",           nameUk: "Ящірка",             nameEn: "Lizard",          emoji: "🦎", categoryKey: "reptiles" },
      { key: "gecko",            nameUk: "Геко",               nameEn: "Gecko",           emoji: "🦎", categoryKey: "reptiles" },
      { key: "chameleon",        nameUk: "Хамелеон",           nameEn: "Chameleon",       emoji: "🦎", categoryKey: "reptiles" },
      { key: "bearded_dragon",   nameUk: "Бородата агама",     nameEn: "Bearded Dragon",  emoji: "🦎", categoryKey: "reptiles" },
      { key: "iguana",           nameUk: "Ігуана",             nameEn: "Iguana",          emoji: "🦎", categoryKey: "reptiles" },
      { key: "snake",            nameUk: "Змія",               nameEn: "Snake",           emoji: "🐍", categoryKey: "reptiles" },
      { key: "monitor",          nameUk: "Варан",              nameEn: "Monitor Lizard",  emoji: "🦎", categoryKey: "reptiles" },
      { key: "corn_snake",       nameUk: "Кукурудзяний вуж",   nameEn: "Corn Snake",      emoji: "🐍", categoryKey: "reptiles" },
    ],
  },
  {
    key: "amphibians",
    labelUk: "ЗЕМНОВОДНІ",
    labelEn: "AMPHIBIANS",
    animals: [
      { key: "frog",        nameUk: "Жаба",       nameEn: "Frog",        emoji: "🐸", categoryKey: "amphibians" },
      { key: "axolotl",     nameUk: "Аксолотль",  nameEn: "Axolotl",     emoji: "🦎", categoryKey: "amphibians" },
      { key: "newt",        nameUk: "Тритон",     nameEn: "Newt",        emoji: "🦎", categoryKey: "amphibians" },
      { key: "salamander",  nameUk: "Саламандра", nameEn: "Salamander",  emoji: "🦎", categoryKey: "amphibians" },
    ],
  },
  {
    key: "fish",
    labelUk: "РИБИ",
    labelEn: "FISH",
    animals: [
      { key: "goldfish",   nameUk: "Золота рибка",        nameEn: "Goldfish",        emoji: "🐠", categoryKey: "fish" },
      { key: "guppy",      nameUk: "Гупі",                nameEn: "Guppy",           emoji: "🐟", categoryKey: "fish" },
      { key: "neon",       nameUk: "Неон",                nameEn: "Neon Tetra",      emoji: "🐟", categoryKey: "fish" },
      { key: "betta",      nameUk: "Бета",                nameEn: "Betta Fish",      emoji: "🐡", categoryKey: "fish" },
      { key: "angelfish",  nameUk: "Скалярія",            nameEn: "Angelfish",       emoji: "🐟", categoryKey: "fish" },
      { key: "cichlid",    nameUk: "Цихліда",             nameEn: "Cichlid",         emoji: "🐟", categoryKey: "fish" },
      { key: "aqua_turtle",nameUk: "Акваріумна черепаха", nameEn: "Aquarium Turtle", emoji: "🐢", categoryKey: "fish" },
      { key: "discus",     nameUk: "Дискус",              nameEn: "Discus",          emoji: "🐟", categoryKey: "fish" },
    ],
  },
  {
    key: "insects",
    labelUk: "КОМАХИ",
    labelEn: "INSECTS",
    animals: [
      { key: "stick_insect", nameUk: "Паличник",    nameEn: "Stick Insect",      emoji: "🦗", categoryKey: "insects" },
      { key: "mantis",       nameUk: "Богомол",     nameEn: "Mantis",            emoji: "🦗", categoryKey: "insects" },
      { key: "tarantula",    nameUk: "Тарантул",    nameEn: "Tarantula",         emoji: "🕷️", categoryKey: "insects" },
      { key: "scorpion",     nameUk: "Скорпіон",    nameEn: "Scorpion",          emoji: "🦂", categoryKey: "insects" },
      { key: "ants",         nameUk: "Мурахи",      nameEn: "Ants",              emoji: "🐜", categoryKey: "insects" },
      { key: "rhino_beetle", nameUk: "Жук-носоріг", nameEn: "Rhinoceros Beetle", emoji: "🪲", categoryKey: "insects" },
      { key: "butterfly",    nameUk: "Метелик",     nameEn: "Butterfly",         emoji: "🦋", categoryKey: "insects" },
    ],
  },
  {
    key: "farm",
    labelUk: "ФЕРМА",
    labelEn: "FARM",
    animals: [
      { key: "horse",       nameUk: "Кінь",     nameEn: "Horse",        emoji: "🐴", categoryKey: "farm" },
      { key: "pony",        nameUk: "Поні",     nameEn: "Pony",         emoji: "🐴", categoryKey: "farm" },
      { key: "cow",         nameUk: "Корова",   nameEn: "Cow",          emoji: "🐄", categoryKey: "farm" },
      { key: "goat",        nameUk: "Коза",     nameEn: "Goat",         emoji: "🐐", categoryKey: "farm" },
      { key: "sheep",       nameUk: "Вівця",    nameEn: "Sheep",        emoji: "🐑", categoryKey: "farm" },
      { key: "pig",         nameUk: "Свиня",    nameEn: "Pig",          emoji: "🐷", categoryKey: "farm" },
      { key: "farm_rabbit", nameUk: "Кріль",    nameEn: "Farm Rabbit",  emoji: "🐰", categoryKey: "farm" },
      { key: "llama",       nameUk: "Лама",     nameEn: "Llama",        emoji: "🦙", categoryKey: "farm" },
      { key: "alpaca",      nameUk: "Альпака",  nameEn: "Alpaca",       emoji: "🦙", categoryKey: "farm" },
      { key: "donkey",      nameUk: "Осел",     nameEn: "Donkey",       emoji: "🫏", categoryKey: "farm" },
      { key: "mule",        nameUk: "Мул",      nameEn: "Mule",         emoji: "🫏", categoryKey: "farm" },
    ],
  },
  {
    key: "exotic",
    labelUk: "ЗООПАРК / ЕКЗОТИКА",
    labelEn: "ZOO / EXOTIC",
    animals: [
      { key: "raccoon",   nameUk: "Єнот",    nameEn: "Raccoon",   emoji: "🦝", categoryKey: "exotic" },
      { key: "fox",       nameUk: "Лисиця",  nameEn: "Fox",       emoji: "🦊", categoryKey: "exotic" },
      { key: "wolf",      nameUk: "Вовк",    nameEn: "Wolf",      emoji: "🐺", categoryKey: "exotic" },
      { key: "lion",      nameUk: "Лев",     nameEn: "Lion",      emoji: "🦁", categoryKey: "exotic" },
      { key: "tiger",     nameUk: "Тигр",    nameEn: "Tiger",     emoji: "🐯", categoryKey: "exotic" },
      { key: "leopard",   nameUk: "Леопард", nameEn: "Leopard",   emoji: "🐆", categoryKey: "exotic" },
      { key: "cheetah",   nameUk: "Гепард",  nameEn: "Cheetah",   emoji: "🐆", categoryKey: "exotic" },
      { key: "bear",      nameUk: "Ведмідь", nameEn: "Bear",      emoji: "🐻", categoryKey: "exotic" },
      { key: "monkey",    nameUk: "Мавпа",   nameEn: "Monkey",    emoji: "🐒", categoryKey: "exotic" },
      { key: "kangaroo",  nameUk: "Кенгуру", nameEn: "Kangaroo",  emoji: "🦘", categoryKey: "exotic" },
      { key: "penguin",   nameUk: "Пінгвін", nameEn: "Penguin",   emoji: "🐧", categoryKey: "exotic" },
      { key: "crocodile", nameUk: "Крокодил",nameEn: "Crocodile", emoji: "🐊", categoryKey: "exotic" },
      { key: "ostrich",   nameUk: "Страус",  nameEn: "Ostrich",   emoji: "🦤", categoryKey: "exotic" },
      { key: "zebra",     nameUk: "Зебра",   nameEn: "Zebra",     emoji: "🦓", categoryKey: "exotic" },
      { key: "giraffe",   nameUk: "Жираф",   nameEn: "Giraffe",   emoji: "🦒", categoryKey: "exotic" },
      { key: "elephant",  nameUk: "Слон",    nameEn: "Elephant",  emoji: "🐘", categoryKey: "exotic" },
      { key: "hippo",     nameUk: "Бегемот", nameEn: "Hippo",     emoji: "🦛", categoryKey: "exotic" },
      { key: "rhino",     nameUk: "Носоріг", nameEn: "Rhino",     emoji: "🦏", categoryKey: "exotic" },
    ],
  },
  {
    key: "sea",
    labelUk: "МОРСЬКІ",
    labelEn: "SEA",
    animals: [
      { key: "dolphin",   nameUk: "Дельфін",       nameEn: "Dolphin",   emoji: "🐬", categoryKey: "sea" },
      { key: "seal",      nameUk: "Тюлень",        nameEn: "Seal",      emoji: "🦭", categoryKey: "sea" },
      { key: "porpoise",  nameUk: "Морська свиня",  nameEn: "Porpoise",  emoji: "🐬", categoryKey: "sea" },
      { key: "octopus",   nameUk: "Осьминіг",      nameEn: "Octopus",   emoji: "🐙", categoryKey: "sea" },
      { key: "jellyfish", nameUk: "Медуза",         nameEn: "Jellyfish", emoji: "🪼", categoryKey: "sea" },
    ],
  },
];

export const ALL_ANIMALS: AnimalEntry[] = ANIMAL_CATEGORIES.flatMap(c => c.animals);

export function findAnimalByKey(key: string): AnimalEntry | undefined {
  return ALL_ANIMALS.find(a => a.key === key);
}

// Legacy species codes from old system → animal key mapping
const LEGACY_TO_KEY: Record<string, string> = {
  rabbit:     "rabbit",
  hamster:    "hamster",
  guinea_pig: "guinea_pig",
  bird:       "budgie",
  turtle:     "land_turtle",
  reptile:    "lizard",
  fish:       "goldfish",
  ferret:     "ferret",
  hedgehog:   "hedgehog",
};

export function getAnimalEmoji(species: string, customSpecies?: string): string {
  if (species === "cat") return "🐱";
  if (species === "dog") return "🐶";

  if (customSpecies) {
    const byKey = findAnimalByKey(customSpecies);
    if (byKey) return byKey.emoji;
  }

  // Legacy backward compat
  if (LEGACY_TO_KEY[species]) {
    const entry = findAnimalByKey(LEGACY_TO_KEY[species]);
    if (entry) return entry.emoji;
  }

  return "🐾";
}

export function getAnimalName(species: string, customSpecies: string | undefined, lang: "uk" | "en"): string {
  if (species === "cat") return lang === "uk" ? "Кіт" : "Cat";
  if (species === "dog") return lang === "uk" ? "Собака" : "Dog";

  if (customSpecies) {
    const byKey = findAnimalByKey(customSpecies);
    if (byKey) return lang === "uk" ? byKey.nameUk : byKey.nameEn;
    // custom user text — return as-is
    return customSpecies;
  }

  // Legacy backward compat
  if (LEGACY_TO_KEY[species]) {
    const entry = findAnimalByKey(LEGACY_TO_KEY[species]);
    if (entry) return lang === "uk" ? entry.nameUk : entry.nameEn;
  }

  return lang === "uk" ? "Інше" : "Other";
}

// Normalize a legacy species for use as customSpecies in the new system
export function legacySpeciesKey(species: string): string | undefined {
  return LEGACY_TO_KEY[species];
}

export const MAIN_SPECIES_EMOJI: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
};
