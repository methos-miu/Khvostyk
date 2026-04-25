import { MaterialCommunityIcons } from "@expo/vector-icons";

import { Colors } from "@/constants/colors";
import { HealthEventType } from "@/context/PetsContext";

// ─── Icon map ─────────────────────────────────────────────────────────────────

export function getHealthEventIcon(
  type: HealthEventType
): React.ComponentProps<typeof MaterialCommunityIcons>["name"] {
  const map: Partial<Record<HealthEventType, React.ComponentProps<typeof MaterialCommunityIcons>["name"]>> = {
    vaccination:   "needle",
    deworming:     "pill",
    flea_tick:     "shield",
    checkup:       "stethoscope",
    grooming:      "content-cut",
    psychologist:  "head-cog-outline",
    training:      "dog-service",
    competition:   "trophy-outline",
    exhibition:    "star-outline",
    nail_trim:     "hand-saw",
    analysis:      "test-tube",
    rabies:        "needle",
    chipping:      "chip",
    insurance:     "shield-check-outline",
    birthday:      "gift-outline",
    other:         "calendar-check-outline",
    // New types
    vet:           "stethoscope",
    surgery:       "medical-bag",
    medication:    "pill",
    sterilization: "content-cut",
    bath:          "shower",
    ear_cleaning:  "ear-hearing",
    teeth_cleaning:"tooth-outline",
    dog_trainer:   "dog-service",
    walk:          "walk",
    boarding:      "home-outline",
    family_day:    "heart-outline",
    mating:        "cards-heart",
    certification: "certificate-outline",
    registration:  "card-account-details-outline",
    custom:        "star-circle-outline",
  };
  return map[type] ?? "calendar-check-outline";
}

// ─── Color map ────────────────────────────────────────────────────────────────

export function getHealthEventColor(type: HealthEventType): string {
  const map: Partial<Record<HealthEventType, string>> = {
    vaccination:   Colors.primary,
    deworming:     "#8B5E8C",
    flea_tick:     "#E8A020",
    checkup:       "#4A7BB5",
    grooming:      "#E91E63",
    psychologist:  "#00BCD4",
    training:      "#FF5722",
    competition:   "#FFC107",
    exhibition:    "#9C27B0",
    nail_trim:     "#607D8B",
    analysis:      "#009688",
    rabies:        Colors.primary,
    chipping:      "#795548",
    insurance:     Colors.accentGreen,
    birthday:      "#E91E63",
    other:         Colors.textSecondary,
    // New types
    vet:           "#4A7BB5",
    surgery:       "#E53935",
    medication:    "#8B5E8C",
    sterilization: "#5A8C3E",
    bath:          "#2196F3",
    ear_cleaning:  "#009688",
    teeth_cleaning:"#00BCD4",
    dog_trainer:   "#FF5722",
    walk:          "#43A047",
    boarding:      "#7B1FA2",
    family_day:    "#E91E63",
    mating:        "#C62828",
    certification: "#F9A825",
    registration:  "#1565C0",
    custom:        Colors.accentPurple,
  };
  return map[type] ?? Colors.primary;
}

// ─── Template field definition ────────────────────────────────────────────────

export interface TemplateFieldDef {
  key: string;
  label: string;
  labelEn: string;
  placeholder?: string;
  placeholderEn?: string;
  /** "text" = single line | "multiline" = textarea | "date" = date picker | "picker" = option list */
  type: "text" | "date" | "multiline" | "picker";
  options?: string[];
  optionsEn?: string[];
}

export interface BuiltinTemplate {
  key: HealthEventType;
  name: string;
  nameEn: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>["name"];
  color: string;
  /** Label for the main title/name field */
  titleLabel: string;
  titleLabelEn: string;
  titlePlaceholder: string;
  titlePlaceholderEn: string;
  /** Template-specific extra fields beyond common ones */
  extraFields: TemplateFieldDef[];
  /** If true, only shown when pet species is "dog" */
  dogOnly?: boolean;
}

// ─── Built-in templates ───────────────────────────────────────────────────────

export const BUILTIN_TEMPLATES: BuiltinTemplate[] = [
  {
    key: "vaccination",
    name: "Вакцинація",
    nameEn: "Vaccination",
    icon: "needle",
    color: Colors.primary,
    titleLabel: "Назва вакцини",
    titleLabelEn: "Vaccine name",
    titlePlaceholder: "Напр. Рабізін, Нобівак...",
    titlePlaceholderEn: "e.g. Rabigen, Nobivac...",
    extraFields: [
      { key: "next_due_date",  label: "Наступна дата",  labelEn: "Next due date",  type: "date" },
      { key: "clinic",         label: "Клініка",         labelEn: "Clinic",          placeholder: "Назва клініки",        placeholderEn: "Clinic name",    type: "text" },
      { key: "doctor",         label: "Лікар",           labelEn: "Doctor",          placeholder: "ПІБ лікаря",           placeholderEn: "Doctor name",    type: "text" },
    ],
  },
  {
    key: "vet",
    name: "Ветеринар",
    nameEn: "Vet Visit",
    icon: "stethoscope",
    color: "#4A7BB5",
    titleLabel: "Причина візиту",
    titleLabelEn: "Reason for visit",
    titlePlaceholder: "Напр. Плановий огляд...",
    titlePlaceholderEn: "e.g. Routine checkup...",
    extraFields: [
      { key: "clinic",       label: "Клініка",          labelEn: "Clinic",        placeholder: "Назва клініки",                         placeholderEn: "Clinic name",                          type: "text" },
      { key: "doctor",       label: "Лікар",            labelEn: "Doctor",        placeholder: "ПІБ лікаря",                            placeholderEn: "Doctor name",                          type: "text" },
      { key: "diagnosis",    label: "Діагноз",          labelEn: "Diagnosis",     placeholder: "Діагноз або висновок...",               placeholderEn: "Diagnosis or conclusion...",           type: "multiline" },
      { key: "prescription", label: "Призначення",      labelEn: "Prescription",  placeholder: "Призначені препарати або процедури...", placeholderEn: "Prescribed medications or procedures...", type: "multiline" },
    ],
  },
  {
    key: "analysis",
    name: "Аналізи",
    nameEn: "Lab Tests",
    icon: "test-tube",
    color: "#009688",
    titleLabel: "Тип аналізу",
    titleLabelEn: "Analysis type",
    titlePlaceholder: "Напр. Загальний аналіз крові...",
    titlePlaceholderEn: "e.g. Complete blood count...",
    extraFields: [
      { key: "lab_name",     label: "Лабораторія",   labelEn: "Lab name",  placeholder: "Назва лабораторії",   placeholderEn: "Laboratory name",          type: "text" },
      { key: "results_text", label: "Результати",    labelEn: "Results",   placeholder: "Опис результатів...", placeholderEn: "Results description...",    type: "multiline" },
    ],
  },
  {
    key: "surgery",
    name: "Операція",
    nameEn: "Surgery",
    icon: "medical-bag",
    color: "#E53935",
    titleLabel: "Вид операції",
    titleLabelEn: "Operation type",
    titlePlaceholder: "Напр. Видалення новоутворення...",
    titlePlaceholderEn: "e.g. Tumor removal...",
    extraFields: [
      { key: "clinic",          label: "Клініка",          labelEn: "Clinic",          placeholder: "Назва клініки", placeholderEn: "Clinic name",   type: "text" },
      { key: "doctor",          label: "Хірург",           labelEn: "Surgeon",         placeholder: "ПІБ хірурга",  placeholderEn: "Surgeon name",  type: "text" },
      { key: "anesthesia_type", label: "Тип анестезії",    labelEn: "Anesthesia type", type: "text" },
      { key: "outcome",         label: "Результат",        labelEn: "Outcome",         placeholder: "Перебіг та результат операції...", placeholderEn: "Surgery course and outcome...", type: "multiline" },
    ],
  },
  {
    key: "medication",
    name: "Прийом ліків",
    nameEn: "Medication",
    icon: "pill",
    color: "#8B5E8C",
    titleLabel: "Назва ліків",
    titleLabelEn: "Medication name",
    titlePlaceholder: "Напр. Антибіотик...",
    titlePlaceholderEn: "e.g. Antibiotic...",
    extraFields: [
      { key: "dose",            label: "Дозування",           labelEn: "Dose",             placeholder: "Напр. 5 мг двічі на день",  placeholderEn: "e.g. 5 mg twice daily",  type: "text" },
      { key: "frequency",       label: "Частота прийому",     labelEn: "Frequency",        placeholder: "Напр. Двічі на день",       placeholderEn: "e.g. Twice daily",       type: "text" },
      { key: "course_duration", label: "Тривалість курсу",    labelEn: "Course duration",  placeholder: "Напр. 7 днів",              placeholderEn: "e.g. 7 days",            type: "text" },
    ],
  },
  {
    key: "deworming",
    name: "Глистогінне",
    nameEn: "Deworming",
    icon: "pill",
    color: "#8B5E8C",
    titleLabel: "Назва препарату",
    titleLabelEn: "Product name",
    titlePlaceholder: "Напр. Дронтал, Мільбемакс...",
    titlePlaceholderEn: "e.g. Drontal, Milbemax...",
    extraFields: [
      { key: "dose",         label: "Дозування",    labelEn: "Dose",          type: "text" },
      { key: "next_due_date",label: "Наступна дата",labelEn: "Next due date", type: "date" },
    ],
  },
  {
    key: "flea_tick",
    name: "Від бліх та кліщів",
    nameEn: "Flea & Tick",
    icon: "shield",
    color: "#E8A020",
    titleLabel: "Назва засобу",
    titleLabelEn: "Product name",
    titlePlaceholder: "Напр. Frontline, Bravecto...",
    titlePlaceholderEn: "e.g. Frontline, Bravecto...",
    extraFields: [
      { key: "next_due_date", label: "Наступна дата", labelEn: "Next due date", type: "date" },
    ],
  },
  {
    key: "sterilization",
    name: "Стерилізація/кастрація",
    nameEn: "Sterilization",
    icon: "content-cut",
    color: "#5A8C3E",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Стерилізація / кастрація",
    titlePlaceholderEn: "Sterilization / castration",
    extraFields: [
      { key: "clinic",  label: "Клініка",  labelEn: "Clinic",   placeholder: "Назва клініки", placeholderEn: "Clinic name",  type: "text" },
      { key: "doctor",  label: "Лікар",    labelEn: "Doctor",   placeholder: "ПІБ лікаря",    placeholderEn: "Doctor name",  type: "text" },
      { key: "outcome", label: "Результат",labelEn: "Outcome",  type: "multiline" },
    ],
  },
  {
    key: "chipping",
    name: "Чіпування",
    nameEn: "Microchipping",
    icon: "chip",
    color: "#795548",
    titleLabel: "Номер чіпу",
    titleLabelEn: "Chip number",
    titlePlaceholder: "Напр. 804098102345678",
    titlePlaceholderEn: "e.g. 804098102345678",
    extraFields: [
      { key: "registration_number", label: "Реєстраційний номер", labelEn: "Registration number", type: "text" },
      { key: "org",                 label: "Організація",          labelEn: "Organization",        type: "text" },
    ],
  },
  {
    key: "grooming",
    name: "Грумінг",
    nameEn: "Grooming",
    icon: "content-cut",
    color: "#E91E63",
    titleLabel: "Грумер / салон",
    titleLabelEn: "Groomer / salon",
    titlePlaceholder: "Ім'я грумера або назва салону",
    titlePlaceholderEn: "Groomer name or salon",
    extraFields: [
      { key: "services_list",    label: "Перелік послуг",  labelEn: "Services list",    placeholder: "Напр. Стрижка, ванна...", placeholderEn: "e.g. Haircut, bath...", type: "multiline" },
      { key: "next_appointment", label: "Наступний запис", labelEn: "Next appointment", type: "date" },
    ],
  },
  {
    key: "nail_trim",
    name: "Стрижка кігтів",
    nameEn: "Nail Trim",
    icon: "hand-saw",
    color: "#607D8B",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Стрижка кігтів",
    titlePlaceholderEn: "Nail trim",
    extraFields: [
      { key: "location_type", label: "Де проводилось", labelEn: "Where",     type: "picker", options: ["Вдома", "Салон", "Ветклініка"], optionsEn: ["Home", "Salon", "Vet clinic"] },
      { key: "next_date",     label: "Наступна дата",  labelEn: "Next date", type: "date" },
    ],
  },
  {
    key: "bath",
    name: "Купання",
    nameEn: "Bath",
    icon: "shower",
    color: "#2196F3",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Купання",
    titlePlaceholderEn: "Bath",
    extraFields: [
      { key: "shampoo_used",  label: "Шампунь",  labelEn: "Shampoo used",  type: "text" },
      { key: "location_type", label: "Місце",    labelEn: "Location",      type: "picker", options: ["Вдома", "Салон", "Ветклініка"], optionsEn: ["Home", "Salon", "Vet clinic"] },
    ],
  },
  {
    key: "ear_cleaning",
    name: "Чистка вух",
    nameEn: "Ear Cleaning",
    icon: "ear-hearing",
    color: "#009688",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Чистка вух",
    titlePlaceholderEn: "Ear cleaning",
    extraFields: [
      { key: "product_used", label: "Засіб", labelEn: "Product used", type: "text" },
    ],
  },
  {
    key: "teeth_cleaning",
    name: "Чистка зубів",
    nameEn: "Teeth Cleaning",
    icon: "tooth-outline",
    color: "#00BCD4",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Чистка зубів",
    titlePlaceholderEn: "Teeth cleaning",
    extraFields: [
      { key: "product_used", label: "Засіб", labelEn: "Product used", type: "text" },
    ],
  },
  {
    key: "training",
    name: "Тренування",
    nameEn: "Training",
    icon: "dog-service",
    color: "#FF5722",
    titleLabel: "Тип тренування",
    titleLabelEn: "Training type",
    titlePlaceholder: "Напр. Базова слухняність",
    titlePlaceholderEn: "e.g. Basic obedience",
    extraFields: [
      { key: "trainer_name", label: "Тренер",     labelEn: "Trainer",   placeholder: "Ім'я тренера",    placeholderEn: "Trainer name",  type: "text" },
      { key: "duration",     label: "Тривалість", labelEn: "Duration",  placeholder: "Напр. 60 хв",     placeholderEn: "e.g. 60 min",   type: "text" },
      { key: "result",       label: "Результат",  labelEn: "Result",    type: "multiline" },
    ],
  },
  {
    key: "psychologist",
    name: "Зоопсихолог",
    nameEn: "Animal Behaviorist",
    icon: "head-cog-outline",
    color: "#00BCD4",
    titleLabel: "Ім'я спеціаліста",
    titleLabelEn: "Specialist name",
    titlePlaceholder: "ПІБ спеціаліста",
    titlePlaceholderEn: "Specialist full name",
    extraFields: [
      { key: "reason",          label: "Причина звернення", labelEn: "Reason",          type: "multiline" },
      { key: "recommendations", label: "Рекомендації",      labelEn: "Recommendations", type: "multiline" },
    ],
  },
  {
    key: "dog_trainer",
    name: "Кінолог",
    nameEn: "Dog Trainer",
    icon: "dog-service",
    color: "#FF5722",
    dogOnly: true,
    titleLabel: "Ім'я кінолога",
    titleLabelEn: "Trainer name",
    titlePlaceholder: "ПІБ кінолога",
    titlePlaceholderEn: "Trainer full name",
    extraFields: [
      { key: "commands_trained", label: "Відпрацьовані команди", labelEn: "Commands trained", placeholder: "Напр. Сидіти, Лежати, Поряд...", placeholderEn: "e.g. Sit, Down, Heel...", type: "multiline" },
    ],
  },
  {
    key: "competition",
    name: "Змагання",
    nameEn: "Competition",
    icon: "trophy-outline",
    color: "#FFC107",
    titleLabel: "Назва змагань",
    titleLabelEn: "Competition name",
    titlePlaceholder: "Напр. Чемпіонат України 2026",
    titlePlaceholderEn: "e.g. National Championship 2026",
    extraFields: [
      { key: "location",      label: "Місце проведення", labelEn: "Location",    type: "text" },
      { key: "result",        label: "Результат",        labelEn: "Result",      type: "text" },
      { key: "place",         label: "Місце / звання",   labelEn: "Place/title", type: "text" },
    ],
  },
  {
    key: "exhibition",
    name: "Виставка",
    nameEn: "Exhibition",
    icon: "star-outline",
    color: "#9C27B0",
    titleLabel: "Назва виставки",
    titleLabelEn: "Exhibition name",
    titlePlaceholder: "Напр. Виставка «Кращий друг»",
    titlePlaceholderEn: "e.g. Best in Show Exhibition",
    extraFields: [
      { key: "location",       label: "Місце проведення", labelEn: "Location",       type: "text" },
      { key: "judge",          label: "Суддя",            labelEn: "Judge",          type: "text" },
      { key: "result",         label: "Результат",        labelEn: "Result",         type: "text" },
      { key: "title_received", label: "Отримане звання",  labelEn: "Title received", type: "text" },
    ],
  },
  {
    key: "certification",
    name: "Сертифікація",
    nameEn: "Certification",
    icon: "certificate-outline",
    color: "#F9A825",
    titleLabel: "Назва сертифікату",
    titleLabelEn: "Certificate name",
    titlePlaceholder: "Напр. Сертифікат слухняності",
    titlePlaceholderEn: "e.g. Obedience certificate",
    extraFields: [
      { key: "org",         label: "Організація",  labelEn: "Organization", type: "text" },
      { key: "expiry_date", label: "Дійсний до",   labelEn: "Expiry date",  type: "date" },
    ],
  },
  {
    key: "walk",
    name: "Вигул",
    nameEn: "Walk",
    icon: "walk",
    color: "#43A047",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "Вигул",
    titlePlaceholderEn: "Walk",
    extraFields: [
      { key: "walker_name",  label: "Вигульник",         labelEn: "Walker name",  placeholder: "Ім'я вигульника",   placeholderEn: "Walker name",    type: "text" },
      { key: "duration",     label: "Тривалість",        labelEn: "Duration",     placeholder: "Напр. 30 хв",       placeholderEn: "e.g. 30 min",    type: "text" },
      { key: "route_notes",  label: "Маршрут / нотатки", labelEn: "Route notes",  type: "multiline" },
    ],
  },
  {
    key: "boarding",
    name: "Перетримка",
    nameEn: "Boarding",
    icon: "home-outline",
    color: "#7B1FA2",
    titleLabel: "Ситтер / Заклад",
    titleLabelEn: "Sitter / Facility",
    titlePlaceholder: "Ім'я ситтера або назва закладу",
    titlePlaceholderEn: "Sitter name or facility name",
    extraFields: [
      { key: "sitter_name", label: "Ситтер",           labelEn: "Sitter",    type: "text" },
      { key: "location",    label: "Адреса",            labelEn: "Location",  type: "text" },
      { key: "end_date",    label: "Дата повернення",   labelEn: "End date",  type: "date" },
    ],
  },
  {
    key: "birthday",
    name: "День народження",
    nameEn: "Birthday",
    icon: "gift-outline",
    color: "#E91E63",
    titleLabel: "Назва",
    titleLabelEn: "Name",
    titlePlaceholder: "День народження",
    titlePlaceholderEn: "Birthday",
    extraFields: [], // Special: uses pet birth date, no extra fields
  },
  {
    key: "family_day",
    name: "День появи в сім'ї",
    nameEn: "Adoption Day",
    icon: "heart-outline",
    color: "#E91E63",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "День появи в сім'ї",
    titlePlaceholderEn: "Adoption day",
    extraFields: [
      { key: "where_from", label: "Звідки", labelEn: "Where from", type: "picker", options: ["Притулок", "Заводчик", "Інше"], optionsEn: ["Shelter", "Breeder", "Other"] },
    ],
  },
  {
    key: "mating",
    name: "В'язка",
    nameEn: "Mating",
    icon: "cards-heart",
    color: "#C62828",
    titleLabel: "Опис",
    titleLabelEn: "Description",
    titlePlaceholder: "В'язка",
    titlePlaceholderEn: "Mating",
    extraFields: [
      { key: "partner_name",          label: "Ім'я партнера",         labelEn: "Partner name",         type: "text" },
      { key: "breed",                 label: "Порода партнера",       labelEn: "Partner breed",        type: "text" },
      { key: "owner_contact",         label: "Контакт власника",      labelEn: "Owner contact",        type: "text" },
      { key: "expected_litter_date",  label: "Очікувана дата помету", labelEn: "Expected litter date", type: "date" },
    ],
  },
  {
    key: "insurance",
    name: "Страховка",
    nameEn: "Insurance",
    icon: "shield-check-outline",
    color: Colors.accentGreen,
    titleLabel: "Страховик / поліс",
    titleLabelEn: "Insurer / policy",
    titlePlaceholder: "Назва страховика або номер поліса",
    titlePlaceholderEn: "Insurer name or policy number",
    extraFields: [
      { key: "policy_number", label: "Номер поліса", labelEn: "Policy number", type: "text" },
      { key: "coverage",      label: "Покриття",     labelEn: "Coverage",      type: "multiline" },
      { key: "expiry_date",   label: "Дійсний до",   labelEn: "Expiry date",   type: "date" },
    ],
  },
  {
    key: "registration",
    name: "Реєстрація",
    nameEn: "Registration",
    icon: "card-account-details-outline",
    color: "#1565C0",
    titleLabel: "Реєстраційний номер",
    titleLabelEn: "Registration number",
    titlePlaceholder: "Напр. UA-2026-12345",
    titlePlaceholderEn: "e.g. UA-2026-12345",
    extraFields: [
      { key: "org",         label: "Організація", labelEn: "Organization", type: "text" },
      { key: "expiry_date", label: "Дійсний до",  labelEn: "Expiry date",  type: "date" },
    ],
  },
  {
    key: "other",
    name: "Інше",
    nameEn: "Other",
    icon: "calendar-check-outline",
    color: Colors.textSecondary,
    titleLabel: "Назва події",
    titleLabelEn: "Event name",
    titlePlaceholder: "Опишіть подію...",
    titlePlaceholderEn: "Describe the event...",
    extraFields: [],
  },
];

// ─── Lookup helpers ──────────────────────────────────────────────────────────

/** Map from template key (including backwards-compat keys) → BuiltinTemplate */
const _templateMap = new Map<string, BuiltinTemplate>();
for (const t of BUILTIN_TEMPLATES) {
  _templateMap.set(t.key, t);
}
// Backwards compat: checkup → vet, rabies → vaccination
_templateMap.set("checkup", _templateMap.get("vet")!);
_templateMap.set("rabies",  _templateMap.get("vaccination")!);

export function getTemplateByKey(key: string): BuiltinTemplate | undefined {
  return _templateMap.get(key);
}

// ─── Recommended repeat intervals ────────────────────────────────────────────

/** Returns the recommended repeat interval in days for a given event type, or null if none. */
export function getRecommendedIntervalDays(type: HealthEventType): number | null {
  const map: Partial<Record<HealthEventType, number>> = {
    vaccination:    365,
    insurance:      365,
    registration:   365,
    certification:  365,
    deworming:      90,
    flea_tick:      90,
    vet:            180,
    checkup:        180,
    analysis:       180,
    grooming:       30,
    nail_trim:      30,
    ear_cleaning:   30,
    teeth_cleaning: 30,
    bath:           14,
  };
  return map[type] ?? null;
}

/** Smart default repeat interval (value + unit) per template type.
 *  Returns null if no smart default. birthday and family_day always use 1 year (not changeable). */
export function getSmartIntervalDefault(
  type: HealthEventType
): { value: number; unit: "day" | "week" | "month" | "year" } | null {
  const map: Partial<Record<HealthEventType, { value: number; unit: "day" | "week" | "month" | "year" }>> = {
    vaccination:    { value: 1,  unit: "year"  },
    deworming:      { value: 3,  unit: "month" },
    flea_tick:      { value: 3,  unit: "month" },
    vet:            { value: 6,  unit: "month" },
    checkup:        { value: 6,  unit: "month" },
    analysis:       { value: 6,  unit: "month" },
    grooming:       { value: 1,  unit: "month" },
    nail_trim:      { value: 1,  unit: "month" },
    ear_cleaning:   { value: 1,  unit: "month" },
    teeth_cleaning: { value: 1,  unit: "month" },
    bath:           { value: 2,  unit: "week"  },
    insurance:      { value: 1,  unit: "year"  },
    registration:   { value: 1,  unit: "year"  },
    certification:  { value: 1,  unit: "year"  },
    birthday:       { value: 1,  unit: "year"  },
    family_day:     { value: 1,  unit: "year"  },
  };
  return map[type] ?? null;
}

/** Human-readable interval label (Ukrainian). */
export function intervalLabel(value: number, unit: string, lang: "uk" | "en" = "uk"): string {
  if (lang === "en") {
    const u = unit === "day" ? "day" : unit === "week" ? "week" : unit === "month" ? "month" : "year";
    return `${value} ${u}${value !== 1 ? "s" : ""}`;
  }
  // Ukrainian
  if (unit === "day") {
    if (value % 10 === 1 && value % 100 !== 11) return `${value} день`;
    if ([2, 3, 4].includes(value % 10) && ![12, 13, 14].includes(value % 100)) return `${value} дні`;
    return `${value} днів`;
  }
  if (unit === "week") {
    if (value === 1) return "1 тиж.";
    if (value < 5) return `${value} тиж.`;
    return `${value} тиж.`;
  }
  if (unit === "month") {
    if (value === 1) return "1 міс.";
    if (value < 5) return `${value} міс.`;
    return `${value} міс.`;
  }
  if (unit === "year") {
    if (value === 1) return "1 рік";
    if (value < 5) return `${value} роки`;
    return `${value} років`;
  }
  return `${value} ${unit}`;
}

/** Returns a BuiltinTemplate for any known key, or a generic fallback. */
export function getTemplateOrFallback(key: string): BuiltinTemplate {
  return (
    _templateMap.get(key) ?? {
      key: "other" as HealthEventType,
      name: key,
      nameEn: key,
      icon: "calendar-check-outline",
      color: Colors.textSecondary,
      titleLabel: "Назва події",
      titleLabelEn: "Event name",
      titlePlaceholder: "",
      titlePlaceholderEn: "",
      extraFields: [],
    }
  );
}
