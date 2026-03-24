// ─── CATS (sorted alphabetically / А-Я) ─────────────────────────────────────

export const CAT_BREEDS_UK = [
  "Абіссінська","Американська короткошерста","Американська жорсткошерста","Американський бобтейл",
  "Ашера","Балійська","Бенгальська","Бірманська",
  "Британська висловуха","Британська довгошерста","Британська короткошерста","Британська прямовуха",
  "Бомбейська","Бурманська","Бурмілла","Буттерфляй (Турецький ван-патерн)",
  "Генетта","Гімалайська","Гавана-браун","Девон-рекс",
  "Єгипетська мау","Екзотична короткошерста","Карельський бобтейл","Каліфорнійська строката",
  "Корніш-рекс","Курильський бобтейл","Лаперм","Ліоноголова",
  "Лікой (Кішка-вовк)","Мейн-кун","Мюнхкін","Невська маскарадна",
  "Норвезька лісова","Нібелунг","Оцикет","Орієнтальна",
  "Орієнтальна довгошерста","Перська","Перська шиншилова","Пікся-боб",
  "Рагдол","Рагамафін","Руська блакитна","Рекс (Урал-рекс)",
  "Селкірк-рекс","Сіамська","Сибірська","Сінгапурська",
  "Сноу-шу","Сомалійська","Сафарі","Саванна",
  "Тайська","Тойгер","Тонкінська","Турецька ангора",
  "Турецький ван","Уайт-крестед","Хайленд-фолд","Хайленд-стрейт",
  "Шартрез","Шотландська висловуха","Шотландська прямовуха","Японський бобтейл",
  "Скотіш-фолд","Скотіш-стрейт","Змішана порода (метис)",
].sort((a, b) => a.localeCompare(b, "uk"));

export const CAT_BREEDS_EN = [
  "Abyssinian","American Bobtail","American Curl","American Shorthair",
  "American Wirehair","Asian Smoke","Ashera","Australian Mist",
  "Balinese","Bengal","Birman","Bombay",
  "British Longhair","British Shorthair","British Shorthair (Folded)","British Shorthair (Straight)",
  "Burmese","Burmilla","California Spangled","Chartreux",
  "Chausie","Cheetoh","Cornish Rex","Cymric",
  "Devon Rex","Egyptian Mau","Exotic Shorthair","Genetta",
  "Havana Brown","Highland Fold","Highland Straight","Himalayan",
  "Japanese Bobtail","Karelian Bobtail","Kurilean Bobtail","LaPerm",
  "Lionhead (Lykoi)","Lykoi","Maine Coon","Manx",
  "Munchkin","Nebelung","Neva Masquerade","Norwegian Forest Cat",
  "Ocicat","Oriental","Oriental Longhair","Persian",
  "Persian Chinchilla","Pixie-Bob","Ragdoll","Ragamuffin",
  "Russian Blue","Safari","Savannah","Scottish Fold",
  "Scottish Straight","Selkirk Rex","Siamese","Siberian",
  "Singapura","Snowshoe","Sokoke","Somali",
  "Thai","Tonkinese","Toyger","Turkish Angora",
  "Turkish Van","Ural Rex","Mixed Breed",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── DOGS (sorted А-Я) ───────────────────────────────────────────────────────

export const DOG_BREEDS_UK = [
  "Австралійська вівчарка","Австралійський хілер","Аїді (Марокканська вівчарка)","Айну (Хоккайдо)",
  "Акіта-іну","Аляскинський маламут","Американський бульдог","Американський кокер-спанієль",
  "Американський стафордширський тер'єр","Афганська борзая","Аффенпінчер","Бассет-гаунд",
  "Бедлінгтон-тер'єр","Бельгійська вівчарка Грюнендаль","Бельгійська вівчарка Лакенуа",
  "Бельгійська вівчарка Малінуа","Бельгійська вівчарка Тервюрен","Бернський зенненхунд",
  "Бігль","Бішон фризе","Боксер","Бордер-коллі","Бордер-тер'єр",
  "Бостон-тер'єр","Бульдог (англійський)","Бульмастиф","Веймаранер","Вельш-корgi пемброкський",
  "Вест-хайленд-вайт-тер'єр","Вижла (угорська)","Голден ретрівер","Грейхаунд",
  "Далматинець","Доберман","Джек-рассел-тер'єр","Дратгар (німецький жорсткошерстий легавий)",
  "Єгипетська гончак (фараонова)","Єврейська вівчарка (Колі гладкошерста)",
  "Ірландський вольфгонд","Ірландський сетер","Ірландський тер'єр","Іспанська легава",
  "Кавалер-кінг-чарльз-спанієль","Кане-корсо","Карликовий пінчер","Керн-тер'єр",
  "Китайська хохлата","Коккер-спанієль (англійський)","Коллі (шотландська) довгошерста",
  "Корги (кардиган)","Лабрадор ретрівер","Левретка (іт. грейхаунд)","Леонбергер",
  "Лхаса апсо","Мальтезе","Маламут аляскинський","Мексиканська гола (Шолоітцкуінтлі)",
  "Міні-пінчер","Мопс","Німецька вівчарка","Ньюфаундленд",
  "Норфолкський тер'єр","Норвіцький тер'єр","Папійон","Парсон-рассел-тер'єр",
  "Перуанська гола собака","Пекінес","Пудель (великий)","Пудель (іграшковий)",
  "Пудель (малий)","Ротвейлер","Родезійський рідгбек","Самоїд",
  "Сенбернар","Сібірський хаскі","Сілкі-тер'єр","Скай-тер'єр",
  "Стафордширський бультер'єр","Такса","Тибетський мастиф","Уіппет",
  "Фараонова гончак","Французький бульдог","Чихуахуа","Шарпей",
  "Шетландська вівчарка","Ши-тцу","Шнауцер (великий)","Шнауцер (карликовий)",
  "Шнауцер (середній)","Шпіц (великий)","Шпіц (карликовий/Поммеранський)",
  "Ейрдейль-тер'єр","Скотч-тер'єр","Йоркширський тер'єр","Акіта (американська)",
  "Аргентинський дог","Змішана порода (двірняга)",
].sort((a, b) => a.localeCompare(b, "uk"));

export const DOG_BREEDS_EN = [
  "Afghan Hound","Airedale Terrier","Akita","Akita (American)",
  "Alaskan Malamute","American Bulldog","American Cocker Spaniel","American Staffordshire Terrier",
  "Argentine Dogo","Australian Cattle Dog (Heeler)","Australian Shepherd","Basenji",
  "Basset Hound","Beagle","Bedlington Terrier","Belgian Groenendael",
  "Belgian Laekenois","Belgian Malinois","Belgian Tervuren","Bernese Mountain Dog",
  "Bichon Frise","Border Collie","Border Terrier","Boston Terrier",
  "Boxer","Bulldog (English)","Bullmastiff","Cairn Terrier",
  "Cane Corso","Cavalier King Charles Spaniel","Chihuahua","Chinese Crested",
  "Chow Chow","Cocker Spaniel (English)","Collie (Rough)","Collie (Smooth)",
  "Dachshund","Dalmatian","Doberman","English Setter",
  "French Bulldog","German Shepherd","German Wirehaired Pointer","Golden Retriever",
  "Greyhound","Hokkaido (Ainu)","Hovawart","Husky (Siberian)",
  "Hungarian Vizsla","Irish Setter","Irish Terrier","Irish Wolfhound",
  "Italian Greyhound","Jack Russell Terrier","Japanese Spitz","King Charles Spaniel",
  "Labrador Retriever","Leonberger","Lhasa Apso","Maltese",
  "Mexican Hairless (Xolo)","Miniature Pinscher","Miniature Schnauzer","Newfoundland",
  "Norfolk Terrier","Norwegian Elkhound","Norwich Terrier","Papillon",
  "Parson Russell Terrier","Pekingese","Peruvian Hairless","Pharaoh Hound",
  "Pomeranian","Poodle (Miniature)","Poodle (Standard)","Poodle (Toy)",
  "Pug","Rhodesian Ridgeback","Rottweiler","Saint Bernard",
  "Samoyed","Scottish Terrier","Shar Pei","Shetland Sheepdog",
  "Shih Tzu","Silky Terrier","Skye Terrier","Staffordshire Bull Terrier",
  "Standard Schnauzer","Tibetan Mastiff","Vizsla (Wirehaired)","Weimaraner",
  "Welsh Corgi (Cardigan)","Welsh Corgi (Pembroke)","West Highland White Terrier","Whippet",
  "Yorkshire Terrier","Mixed Breed (Mutt)",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── RABBITS (А-Я) ──────────────────────────────────────────────────────────

export const RABBIT_BREEDS_UK = [
  "Ангорський (англійський)","Ангорський (французький)","Ангорський (гігантський)","Ангорський (сатиновий)",
  "Атласний","Атласний карлик","Бельгійський заєць","Британський велетень",
  "Голландський","Гіганський лоп","Джерсі вулі","Каліфорнійський",
  "Карликовий лоп","Лаперм (кучерявий)","Ліоноголовий","Мінілоп",
  "Метелик","Нідерландський карлик","Новозеландський","Палометський",
  "Рекс","Рекс мінімальний","Сатиновий","Сільвер",
  "Сільвер мартен","Стандартний шиншила","Тан","Текс (Рекс Міні)",
  "Французький лоп","Хавана","Хімалайський","Хаттіа",
  "Чорно-сріблястий","Американський лоп","Флорида Вайт","Британська гігантська",
  "Дієговий","Гарлекін","Змішана порода",
].sort((a, b) => a.localeCompare(b, "uk"));

export const RABBIT_BREEDS_EN = [
  "American","American Lop","Angora (English)","Angora (French)",
  "Angora (Giant)","Angora (Satin)","Belgian Hare","Beveren",
  "British Giant","Californian","Checkered Giant","Chinchilla Standard",
  "Cinnamon","Continental Giant","Dutch","Dwarf Hotot",
  "Dwarf Lop","Florida White","French Lop","Giant Lop",
  "Harlequin","Havana","Himalayan","Holland Lop",
  "Jersey Wooly","LaPerm","Lionhead","Mini Lop",
  "Mini Rex","Mini Satin","Netherland Dwarf","New Zealand",
  "Palomino","Rex","Satin","Silver",
  "Silver Marten","Tan","Velveteen Lop","Mixed Breed",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── HAMSTERS (А-Я) ─────────────────────────────────────────────────────────

export const HAMSTER_BREEDS_UK = [
  "Джунгарський (Зимовий Білий)","Джунгарський блакитний сапфір","Джунгарський мармуровий",
  "Джунгарський опаловий","Джунгарський перловий","Джунгарський сніговий",
  "Кампбелла","Китайський","Роборовський",
  "Сирійський (Золотистий)","Сирійський довгошерстий","Сирійський кремовий",
  "Сирійський медовий","Сирійський рекс","Сирійський сатиновий",
  "Сирійський сріблястий","Сирійський чорний","Сирійський шоколадний",
  "Сирійський жовтий","Змішаний",
].sort((a, b) => a.localeCompare(b, "uk"));

export const HAMSTER_BREEDS_EN = [
  "Campbell's Dwarf","Chinese","Djungarian (Winter White) Blue Sapphire",
  "Djungarian (Winter White) Marble","Djungarian (Winter White) Opal",
  "Djungarian (Winter White) Pearl","Djungarian (Winter White) Standard",
  "Roborovski","Syrian (Golden)","Syrian Black",
  "Syrian Chocolate","Syrian Cream","Syrian Honey",
  "Syrian Long-Haired","Syrian Rex","Syrian Satin",
  "Syrian Silver","Syrian Yellow","Mixed",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── GUINEA PIGS (А-Я) ──────────────────────────────────────────────────────

export const GUINEA_PIG_BREEDS_UK = [
  "Абіссінська","Абіссінська сатинова","Альпака","Американська",
  "Американська сатинова","Балдвін (безшерста)","Корона (Коронована)","Коронована сатинова",
  "Лункарія","Мерино","Перуанська","Перуанська сатинова",
  "Помпадур","Рекс","Розетова","Скінні (безшерста)",
  "Текселька","Тедді","Тедді сатинова","Уайт-крестед",
  "Шелті","Метис","Змішана порода",
].sort((a, b) => a.localeCompare(b, "uk"));

export const GUINEA_PIG_BREEDS_EN = [
  "Abyssinian","Abyssinian Satin","Alpaca","American",
  "American Satin","Baldwin (Hairless)","Coronet","Coronet Satin",
  "Lunkarya","Merino","Peruvian","Peruvian Satin",
  "Pompador","Rex","Rosette","Sheltie",
  "Skinny (Hairless)","Teddy","Teddy Satin","Texel",
  "White-Crested","Mixed Breed",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── BIRDS (А-Я) ─────────────────────────────────────────────────────────────

export const BIRD_SPECIES_UK = [
  "Агапорніс (Нерозлучники)","Ара","Амазон","Африканський сірий (Жако)",
  "Бенгальський амадін","Буддерієгар (Хвилястий папуга)","В'юрок","Еклектус",
  "Зеброва амадін","Зяблик","Зоряна корзиночка","Ібіс",
  "Какаду","Каїк","Канарка (колір)","Канарка (поза)",
  "Канарка (спів)","Карелла (Корела)","Кардинал","Клинохвостий папуга",
  "Лорі","Лорікет","Ловберд (Нерозлучник)","Монах-папуга",
  "Папуга Мейєра","Папуга-пігмей (Горобчиковий)","Піонус","Рожеворужний папуга",
  "Розелла","Сенегальський папуга","Снігур","Щиглик",
  "Чиж","Чорноголовий каїк","Ямайський лорі","Змішана / невизначена",
].sort((a, b) => a.localeCompare(b, "uk"));

export const BIRD_SPECIES_EN = [
  "African Grey (Jaco)","Amazon","Budgerigar (Budgie)","Caique",
  "Canary (Color)","Canary (Posture)","Canary (Song)","Cape Parrot",
  "Cardinal","Chaffinch","Cockatiel","Cockatoo",
  "Cordon Bleu","Eclectus","Finch (Bengalese)","Finch (Goldfinch)",
  "Finch (Greenfinch)","Finch (Siskin)","Finch (Zebra)","Gouldian Finch",
  "Lineolated Parakeet","Lory","Lorikeet","Lovebird",
  "Macaw","Meyer's Parrot","Monk Parakeet","Parrotlet",
  "Pionus","Rose-Ringed Parakeet","Rosella","Senegal Parrot",
  "Mixed / Unknown",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── TURTLES (А-Я) ───────────────────────────────────────────────────────────

export const TURTLE_BREEDS_UK = [
  "Алдабрська черепаха","Африканська шпорна черепаха (Сульката)","Балканська черепаха",
  "Болотяна черепаха (Європейська)","Водяна черепаха (Китайська)","Водяна черепаха (Японська)",
  "Гоферна черепаха","Грецька (Шпорна) черепаха","Єгипетська черепаха",
  "Зірчаста (Індійська) черепаха","Зірчаста (Шрі-Ланкійська) черепаха","Іспанська черепаха",
  "Каспійська черепаха","Леопардова черепаха","Матамата","М'якотіла черепаха (Тріоникс)",
  "Пантерна черепаха","Пустельна черепаха","Радіата (Мадагаскарська)","Розкладна черепаха",
  "Середземноморська черепаха","Середньоазіатська (Кинодоросний) черепаха","Слонова черепаха",
  "Техаська коробчата черепаха","Флоридська гоферна черепаха","Черепаха Германна",
  "Черепаха червоновуха (Акватична)","Черепаха-каймановий","Невідома / Змішана",
].sort((a, b) => a.localeCompare(b, "uk"));

export const TURTLE_BREEDS_EN = [
  "Aldabra Giant Tortoise","African Spurred Tortoise (Sulcata)","Balkan Tortoise",
  "Box Turtle (Eastern)","Box Turtle (Western)","Desert Tortoise",
  "Egyptian Tortoise","European Pond Turtle","Florida Gopher Tortoise",
  "German Tortoise (Hermann's)","Gopher Tortoise","Greek (Spur-Thighed) Tortoise",
  "Indian Star Tortoise","Leopard Tortoise","Mata Mata","Mediterranean Tortoise",
  "Painted Turtle","Pancake Tortoise","Panther Tortoise","Radiated Tortoise",
  "Red-Eared Slider","Russian Tortoise","Snapping Turtle","Softshell Turtle",
  "Sri Lanka Star Tortoise","Texas Tortoise","Unknown / Mixed",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── REPTILES (А-Я) ──────────────────────────────────────────────────────────

export const REPTILE_BREEDS_UK = [
  "Аксолотль","Бородата агама","Блакитноязика сцинка","Веселкова боа",
  "Гекон (Добовий)","Гекон (Крестатий)","Гекон (Леопардовий)","Гекон (Токі)",
  "Гекон (Хмарний)","Змія-молочна","Ігуана зелена","Ігуана скальна",
  "Каліфорнійський кінгснейк","Карпетний пітон","Кинодонт (синьоязична ящірка)",
  "Кукурудзяна змія","Королівський боа","Королівський пітон","Мексиканський чорний кінгснейк",
  "Пантерний хамелеон","Пакманова (Рогата) жаба","Рогата жаба","Тегу (аргентинський)",
  "Тигровий пітон","Хамелеон Веілюса","Хамелеон Джексона","Хамелеон Намібійський",
  "Хогноуз (Свинорилна змія)","Зелений анол","Зелений пітон","Ящірка-монітор",
  "Змішана / Невизначена",
].sort((a, b) => a.localeCompare(b, "uk"));

export const REPTILE_BREEDS_EN = [
  "Axolotl","Bearded Dragon","Blue-Tongued Skink","Boa Constrictor",
  "Burmese Python","California Kingsnake","Carpet Python","Corn Snake",
  "Crested Gecko","Day Gecko","Green Anole","Green Iguana",
  "Green Tree Python","Jackson's Chameleon","Leopard Gecko","Milk Snake",
  "Mexican Black Kingsnake","Monitor Lizard","Pacman (Horned) Frog","Panther Chameleon",
  "Rock Iguana","Rainbow Boa","Rhinoceros Iguana","Sand Boa",
  "Sinaloan Milk Snake","Savannah Monitor","Spiny-Tailed Iguana","Tokay Gecko",
  "Torquilla (Worm Snake)","Veiled Chameleon","Western Hognose","Yellow-Bellied Slider",
  "Argentine Black and White Tegu","Mixed / Unknown",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── FISH (А-Я) ──────────────────────────────────────────────────────────────

export const FISH_BREEDS_UK = [
  "Арована","Ангеліч","Барбус вишневий","Барбус тигровий",
  "Барбус суматранський","Бета (Петушок)","Гупі","Гурамі",
  "Гурамі перлоносний","Дискус","Даніо реріо","Єлоу (Жовта цихліда)",
  "Золота рибка","Кардинальська тетра","Клоун (Риба-клоун)","Коі (Карп коі)",
  "Коридорас","Ліліовий гурамі","Мандаринка","Меченосець",
  "Молінезія","Неонова тетра","Оскар (Цихліда-оскар)","Пірання",
  "Платі","Плекостомус","Раджа Самудра","Радужна рибка",
  "Сомик-акул","Тетра чорна","Цихліда блакитна","Цихліда-паву",
  "Фронтоза","Змішана / Невизначена",
].sort((a, b) => a.localeCompare(b, "uk"));

export const FISH_BREEDS_EN = [
  "Angelfish","Arowana","Bala Shark","Betta (Siamese Fighting Fish)",
  "Black Skirt Tetra","Bristlenose Pleco","Cardinal Tetra","Cherry Barb",
  "Clownfish","Corydoras Catfish","Discus","Frontosa Cichlid",
  "Goldfish","Gourami (Dwarf)","Gourami (Kissing)","Gourami (Pearl)",
  "Guppy","Koi Carp","Mandarin Fish","Molly",
  "Neon Tetra","Otocinclus","Oscar (Velvet Cichlid)","Peacock Cichlid",
  "Piranha","Platy","Plecostomus","Rainbowfish",
  "Siamese Algae Eater","Swordtail","Tiger Barb","Zebra Danio",
  "Yellow Cichlid","Mixed / Unknown",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── FERRETS (А-Я) ───────────────────────────────────────────────────────────

export const FERRET_TYPES_UK = [
  "Альбінос","Білий з блакитними очима","Горностай (Чорновершинний)","Дарк-айд білий",
  "Млечний шлях (Sable Mitt)","Пегий (Blazed)","Рябий","Самурай (Panda)",
  "Сіро-метелик","Соболиний","Стерлінговий сільвер","Темно-коричневий",
  "Хромований","Цинамон","Шоколадний","Шоколадний метелик",
  "Метис / Невизначений",
].sort((a, b) => a.localeCompare(b, "uk"));

export const FERRET_TYPES_EN = [
  "Albino","Blaze","Blue-Eyed White","Champagne",
  "Chocolate","Chocolate Mitt","Chocolate Sable","Cinnamon",
  "Cinnamon Mitt","Dark-Eyed White","Panda","Roan",
  "Sable","Sable Mitt","Silver","Sterling Silver",
  "Mixed / Unknown",
].sort((a, b) => a.localeCompare(b, "en"));

// ─── HEDGEHOGS (А-Я) ─────────────────────────────────────────────────────────

export const HEDGEHOG_BREEDS_UK = [
  "Африканський (Чотирипалий Пігмей)","Алжирський","Амурський (Сибірський)",
  "Арабський","Довгоушний (Гемійохін)","Єгипетський","Є'Ропейський",
  "Китайський","Їжак Брандта","Їжак Мак-Нейла","Їжак Даурії",
  "Їжак Пустельний","Їжак Смугастий","Сомалійський","Капський",
  "Метис / Невизначений",
].sort((a, b) => a.localeCompare(b, "uk"));

export const HEDGEHOG_BREEDS_EN = [
  "African Pygmy (Four-Toed)","Algerian","Amur","Arabian",
  "Brandt's","Chinese","Daurian","Desert",
  "Egyptian","European","Four-Toed (Standard)","Hugh's",
  "Long-Eared","Somali","Southern African","Striped",
  "Mixed / Unknown",
].sort((a, b) => a.localeCompare(b, "en"));
