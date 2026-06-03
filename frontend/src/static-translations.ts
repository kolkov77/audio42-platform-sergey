import type { LocaleCode } from "./i18n"

type TranslationSet = Partial<Record<Exclude<LocaleCode, "ru">, string>>

const STATIC_TEXT: Record<string, TranslationSet> = {
  "Аудиогиды": { en: "Audio guides", zh: "语音导览", de: "Audioguides" },
  "по Кемерово": { en: "in Kemerovo", zh: "克麦罗沃", de: "in Kemerowo" },
  "Кемерово": { en: "Kemerovo", zh: "克麦罗沃", de: "Kemerowo" },
  "Навигация": { en: "Navigation", zh: "导航", de: "Navigation" },
  "Покупка и документы": { en: "Purchase & documents", zh: "购买与文件", de: "Kauf & Dokumente" },
  "Понятно": { en: "Got it", zh: "明白", de: "Verstanden" },
  "Сайт использует технические данные": {
    en: "This site uses technical data",
    zh: "本网站使用技术数据",
    de: "Diese Website nutzt technische Daten",
  },
  "политике ПДн": { en: "privacy policy", zh: "隐私政策", de: "Datenschutzerklärung" },
  "согласии на обработку ПДн": {
    en: "personal data consent",
    zh: "个人数据处理同意书",
    de: "Einwilligung zur Datenverarbeitung",
  },
  "© Яндекс": { en: "© Yandex", zh: "© Yandex", de: "© Yandex" },
  "Яндекс": { en: "Yandex", zh: "Yandex", de: "Yandex" },
  "С": { en: "S", zh: "S", de: "S" },
  "Аудиогид42": { en: "AudioGuide42", zh: "语音导览42", de: "AudioGuide42" },
  "Колков Сергей Анатольевич (ИП)": {
    en: "Sergey Kolkov, sole proprietor",
    zh: "谢尔盖·科尔科夫，个体经营者",
    de: "Sergey Kolkov, Einzelunternehmer",
  },
  "Сергей Колков": { en: "Sergey Kolkov", zh: "谢尔盖·科尔科夫", de: "Sergey Kolkov" },
  "Суровая Родина": { en: "Severe Homeland", zh: "严酷的故乡", de: "Strenge Heimat" },
  "Эй, Кемерово": { en: "Hey, Kemerovo", zh: "嘿，克麦罗沃", de: "Hey, Kemerowo" },
  "О проекте": { en: "About", zh: "项目介绍", de: "Über das Projekt" },
  "Экскурсии": { en: "Tours", zh: "游览", de: "Touren" },
  "Маршруты": { en: "Routes", zh: "路线", de: "Routen" },
  "Экскурсоводы": { en: "Guides", zh: "讲解员", de: "Guides" },
  "Экскурсовод": { en: "Guide", zh: "讲解员", de: "Guide" },
  "Слушайте так, как вам удобно": { en: "Listen the way you like", zh: "按您方便的方式收听", de: "Hören Sie so, wie es Ihnen passt" },
  "Карта": { en: "Map", zh: "地图", de: "Karte" },
  "API Карт": { en: "Map API", zh: "地图 API", de: "Karten-API" },
  "Кабинет": { en: "Account", zh: "账户", de: "Konto" },
  "Оплата": { en: "Payment", zh: "支付", de: "Zahlung" },
  "Маршрут": { en: "Route", zh: "路线", de: "Route" },
  "72 часа": { en: "72 hours", zh: "72 小时", de: "72 Stunden" },
  "3 ч": { en: "3 h", zh: "3 小时", de: "3 Std." },
  "2 ч 30 мин": { en: "2 h 30 min", zh: "2 小时 30 分钟", de: "2 Std. 30 Min." },
  "Бесплатно": { en: "Free", zh: "免费", de: "Kostenlos" },
  "Бонус": { en: "Bonus", zh: "附加", de: "Bonus" },
  "Бонусный трек": { en: "Bonus track", zh: "附加音频", de: "Bonus-Track" },
  "Бонусные треки": { en: "Bonus tracks", zh: "附加音频", de: "Bonus-Tracks" },
  "Дополнительные аудиоматериалы к экскурсии": {
    en: "Additional audio materials for this tour",
    zh: "本次导览的补充音频材料",
    de: "Zusätzliche Audiomaterialien zu dieser Tour",
  },
  "Описание трека будет добавлено экскурсоводом.": {
    en: "The guide will add the track description.",
    zh: "讲解员稍后会添加音频说明。",
    de: "Die Trackbeschreibung wird vom Guide ergänzt.",
  },
  "Запись маршрута": { en: "Route recording", zh: "路线音频", de: "Routenaufnahme" },
  "Доступ открыт": { en: "Access open", zh: "已开放", de: "Zugang offen" },
  "ВКонтакте": { en: "VK", zh: "VK", de: "VK" },
  "Почта": { en: "Email", zh: "电子邮件", de: "E-Mail" },
  "Сайт автора": { en: "Author website", zh: "作者网站", de: "Website des Autors" },
  "Сайт экскурсовода": { en: "Guide website", zh: "讲解员网站", de: "Guide-Website" },
  "Полный доступ": { en: "Full access", zh: "完整访问", de: "Voller Zugang" },
  "После оплаты экскурсия открывается без ограничения числа прослушиваний.": {
    en: "After payment, the tour opens with unlimited listening during the access period.",
    zh: "付款后，在访问期内可以不限次数收听导览。",
    de: "Nach der Zahlung ist die Tour während der Zugangszeit ohne Begrenzung der Wiedergaben verfügbar.",
  },
  "Точки интереса, линии маршрута и текущее местоположение на прогулке.": {
    en: "Points of interest, route lines, and your current location during the walk.",
    zh: "兴趣点、路线线条以及步行时的当前位置。",
    de: "Orte von Interesse, Routenlinien und der aktuelle Standort während des Spaziergangs.",
  },
  "Говорит Кемерово: люди, события, легенды": {
    en: "Kemerovo speaks: people, events, legends",
    zh: "克麦罗沃在讲述：人物、事件与传说",
    de: "Kemerowo spricht: Menschen, Ereignisse, Legenden",
  },
  "Официальная история Кемерово отсчитывается с 1918 года. Но город начался гораздо раньше — более 350 лет назад, во времена освоения Сибири. С Верхотомского острога, поставленного на Томи в 1665 году, и первых деревень рядом с ним: Щеглова и Комарова.": {
    en: "Kemerovo's official history dates back to 1918. But the city began much earlier, more than 350 years ago, during the exploration of Siberia: with the Verkhotomsky ostrog, founded on the Tom in 1665, and the first villages nearby, Shcheglova and Komarova.",
    zh: "克麦罗沃的官方历史始于1918年。但这座城市开始得更早，距今350多年，可追溯到西伯利亚开发时期：1665年建在托木河畔的韦尔霍托姆斯基堡，以及附近最早的村庄谢格洛瓦和科马罗瓦。",
    de: "Die offizielle Geschichte Kemerowos beginnt 1918. Doch die Stadt entstand viel früher, vor mehr als 350 Jahren, während der Erschließung Sibiriens: mit dem 1665 an der Tom errichteten Verkhotomsky-Ostrog und den ersten Dörfern in der Nähe, Schtscheglowa und Komarowa.",
  },
  "Позже сюда придёт Большой угольный век. Сначала — Копикуз, затем международная индустриальная колония АИК «Кузбасс», шахты, заводы и стратегический интерес государства к добыче чёрного золота.": {
    en: "Later, the great coal age arrived here. First came Kopikuz, then the international industrial colony AIC Kuzbass, mines, factories, and the state's strategic interest in extracting black gold.",
    zh: "后来，这里迎来了伟大的煤炭时代。先是科皮库兹，随后是国际工业殖民地AIC“库兹巴斯”、矿井、工厂，以及国家对开采黑色黄金的战略兴趣。",
    de: "Später kam hier das große Kohlezeitalter an. Zuerst Kopikus, dann die internationale Industriekolonie AIC „Kusbass“, Bergwerke, Fabriken und das strategische Interesse des Staates an der Förderung des schwarzen Goldes.",
  },
  "Так постепенно сложился характер Кемерово: сибирский, упрямый, немного суровый и привыкший жить между рекой, углём и большой историей.": {
    en: "This is how Kemerovo's character gradually formed: Siberian, stubborn, a little severe, and used to living between the river, coal, and a large history.",
    zh: "克麦罗沃的性格就这样逐渐形成：西伯利亚式的、执拗的、略显严峻的，并习惯生活在河流、煤炭与宏大历史之间。",
    de: "So formte sich allmählich Kemerowos Charakter: sibirisch, eigensinnig, ein wenig streng und daran gewöhnt, zwischen Fluss, Kohle und großer Geschichte zu leben.",
  },
  "Наши аудиогиды рассказывают о городе от самых первых поселений до наших дней.": {
    en: "Our audio guides tell the story of the city from its earliest settlements to the present day.",
    zh: "我们的语音导览讲述这座城市从最早聚落到今天的故事。",
    de: "Unsere Audioguides erzählen von der Stadt von den ersten Siedlungen bis heute.",
  },
  "Маршруты доступны на русском, английском, немецком и китайском языках.": {
    en: "Routes are available in Russian, English, German, and Chinese.",
    zh: "路线提供俄语、英语、德语和中文版本。",
    de: "Die Routen sind auf Russisch, Englisch, Deutsch und Chinesisch verfügbar.",
  },
  "Оплата всеми типами карт, включая UnionPay и выпущенные зарубежными банками Visa, Mastercard.": {
    en: "Payment is available with all card types, including UnionPay and Visa or Mastercard cards issued by foreign banks.",
    zh: "支持所有类型银行卡付款，包括银联以及境外银行发行的 Visa、Mastercard。",
    de: "Zahlung mit allen Kartentypen, einschließlich UnionPay sowie Visa und Mastercard von ausländischen Banken.",
  },
  "Смотреть экскурсии": { en: "View tours", zh: "查看游览", de: "Touren ansehen" },
  "Открыть карту": { en: "Open map", zh: "打开地图", de: "Karte öffnen" },
  "Рекомендуем порядок, но не ограничиваем слушателя": {
    en: "We suggest an order without limiting the listener",
    zh: "推荐顺序，但不限制听众",
    de: "Empfiehlt eine Reihenfolge, begrenzt aber den Hörer nicht",
  },
  "Маршрут задаётся автором, но пользователь может начать его с любой точки города и запускать нужный трек в удобной последовательности.": {
    en: "The author defines the route, but the listener can start it from any point in the city and play the needed track in a convenient order.",
    zh: "路线由作者设定，但购买后用户可以在城市中的任意位置行走，并按方便的顺序播放所需音轨。",
    de: "Der Autor legt die Route fest, nach dem Kauf kann der Nutzer sich frei bewegen und Tracks in passender Reihenfolge starten.",
  },
  "Каталог и страницы туров": { en: "Catalog and tour pages", zh: "目录和游览页面", de: "Katalog und Tourseiten" },
  "Выберите маршрут, посмотрите описание, продолжительность и стоимость, а перед покупкой послушайте голос автора.": {
    en: "Choose a route, review the description, duration and price, and listen to the author's voice before purchase.",
    zh: "选择路线，查看说明、时长和价格，并在购买前试听作者的声音。",
    de: "Wählen Sie eine Route, prüfen Sie Beschreibung, Dauer und Preis und hören Sie vor dem Kauf die Stimme des Autors.",
  },
  "Покупка доступа": { en: "Buying access", zh: "购买访问权", de: "Zugang kaufen" },
  "На странице оплаты можно ввести промокод, принять условия покупки и открыть экскурсию на 72 часа после оплаты.": {
    en: "On the payment page you can enter a promo code, accept the purchase terms, and unlock the tour for 72 hours after payment.",
    zh: "在付款页面可以输入优惠码、接受购买条款，并在付款后解锁导览 72 小时。",
    de: "Auf der Zahlungsseite können Sie einen Promocode eingeben, die Kaufbedingungen akzeptieren und die Tour nach Zahlung 72 Stunden freischalten.",
  },
  "Личный кабинет": { en: "Personal account", zh: "个人账户", de: "Persönliches Konto" },
  "В личном кабинете сохраняются покупки, активные экскурсии и срок доступа к ним.": {
    en: "The account stores purchases, active tours, and their access period.",
    zh: "个人账户会保存购买记录、已开通导览及其访问期限。",
    de: "Im Konto werden Käufe, aktive Touren und deren Zugangszeit gespeichert.",
  },
  "Авторская прогулка по центру Кемерово по мотивам маршрута «10 000 шагов»: около 7 км, знакомые места и живой разговор о городе.": {
    en: "An author-led walk through central Kemerovo inspired by the “10,000 steps” route: about 7 km, familiar places, and a lively conversation about the city.",
    zh: "受“10,000 步”路线启发的克麦罗沃市中心作者步行导览：约 7 公里，熟悉的地点和关于城市的生动讲述。",
    de: "Ein autorengeführter Spaziergang durch das Zentrum von Kemerowo nach der Route „10.000 Schritte“: etwa 7 km, vertraute Orte und ein lebendiges Stadtgespräch.",
  },
  "Прогулка по Кемерово от Сергея Колкова: характер города, память места и ключевые точки центра.": {
    en: "A Kemerovo walk by Sergey Kolkov: the city's character, memory of place, and key points in the center.",
    zh: "谢尔盖·科尔科夫的克麦罗沃步行导览：城市性格、地点记忆和市中心关键点。",
    de: "Ein Spaziergang durch Kemerowo von Sergey Kolkov: Stadtcharakter, Erinnerung des Ortes und zentrale Punkte.",
  },
  "Автор книги «Суровая Родина» и городских маршрутов по Кемерово": {
    en: "Author of “Severe Homeland” and city routes around Kemerovo",
    zh: "《严酷的故乡》作者，克麦罗沃城市路线创作者",
    de: "Autor von „Strenge Heimat“ und Stadtrouten in Kemerowo",
  },
  "Автор книги «Суровая Родина» о Кемерово.": {
    en: "Author of the book “Severe Homeland” about Kemerovo.",
    zh: "关于克麦罗沃的《严酷的故乡》一书作者。",
    de: "Autor des Buches „Strenge Heimat“ über Kemerowo.",
  },
  "Сергей Колков — автор книги «Суровая Родина» и городских маршрутов по Кемерово. Он собирает прогулки из памяти места, городских историй и точек, через которые лучше чувствуется характер города.": {
    en: "Sergey Kolkov is the author of “Severe Homeland” and city routes around Kemerovo. He builds walks from local memory, city stories, and places that reveal the city's character.",
    zh: "谢尔盖·科尔科夫是《严酷的故乡》和克麦罗沃城市路线的作者。他从地点记忆、城市故事和能体现城市性格的地点中构建步行导览。",
    de: "Sergey Kolkov ist Autor von „Strenge Heimat“ und Stadtrouten in Kemerowo. Seine Spaziergänge entstehen aus Erinnerung, Stadtgeschichten und Orten, die den Charakter der Stadt zeigen.",
  },
  "Создатель проекта «Да, Кемерово» и городских маршрутов.": {
    en: "Creator of the “Yes, Kemerovo” project and city routes.",
    zh: "“是的，克麦罗沃”项目和城市路线的创建者。",
    de: "Schöpfer des Projekts „Ja, Kemerowo“ und städtischer Routen.",
  },
  "Собирает экскурсии из памяти места, городских историй и реальных точек города.": {
    en: "Builds tours from memory of place, city stories, and real city locations.",
    zh: "从地点记忆、城市故事和真实城市点位中构建导览。",
    de: "Entwickelt Touren aus Erinnerung, Stadtgeschichten und realen Orten.",
  },
  "Почему стоит слушать": { en: "Why listen", zh: "为什么值得收听", de: "Warum zuhören" },
  "Почему стоит слушать автора": { en: "Why listen to the author", zh: "为什么值得听作者讲解", de: "Warum dem Autor zuhören" },
  "Профиль экскурсовода": { en: "Guide profile", zh: "讲解员资料", de: "Guide-Profil" },
  "Экскурсоводы и их маршруты": { en: "Guides and their routes", zh: "讲解员及其路线", de: "Guides und ihre Routen" },
  "Познакомьтесь с авторами городских прогулок, откройте их персональные страницы и выберите экскурсию по настроению.": {
    en: "Meet the authors of city walks, open their personal pages, and choose a tour that fits your mood.",
    zh: "认识城市步行导览作者，打开他们的个人页面，并按心情选择导览。",
    de: "Lernen Sie die Autoren der Stadtspaziergänge kennen, öffnen Sie ihre Seiten und wählen Sie eine passende Tour.",
  },
  "Все прогулки": { en: "All walks", zh: "所有漫步路线", de: "Alle Spaziergänge" },
  "Маршрут экскурсовода": { en: "Guide's route", zh: "讲解员路线", de: "Route des Guides" },
  "Авторский опыт и опорные факты": { en: "Author experience and key facts", zh: "作者经验和关键事实", de: "Autorenerfahrung und Fakten" },
  "Карта тура": { en: "Tour map", zh: "游览地图", de: "Tourkarte" },
  "Точки маршрута и рекомендованная линия прогулки": {
    en: "Route points and recommended walking line",
    zh: "路线点和推荐步行线路",
    de: "Routenpunkte und empfohlene Linie",
  },
  "Нажмите на точку на карте, чтобы открыть связанный трек маршрута.": {
    en: "Click a point on the map to open the related route track.",
    zh: "点击地图上的点以打开相关路线音轨。",
    de: "Klicken Sie auf einen Punkt auf der Karte, um den zugehörigen Track zu öffnen.",
  },
  "Маршрут соединён линиями в рекомендованной последовательности, но слушатель сам выбирает, к какой точке перейти дальше.": {
    en: "The route is connected in the recommended order, but the listener chooses the next point independently.",
    zh: "路线按推荐顺序连接，但听众可自行选择下一站。",
    de: "Die Route ist in empfohlener Reihenfolge verbunden, der Hörer wählt den nächsten Punkt selbst.",
  },
  "Маршрут создан в рекомендованной последовательности, но слушатель может выбрать произвольно, к какой точке перейти дальше.": {
    en: "The route is built in the recommended order, but the listener can freely choose the next point.",
    zh: "路线按推荐顺序创建，但听众可以自由选择下一站。",
    de: "Die Route ist in empfohlener Reihenfolge erstellt, aber der Hörer kann den nächsten Punkt frei wählen.",
    fr: "Le parcours est construit dans l'ordre recommandé, mais l'auditeur peut choisir librement le point suivant.",
  },
  "Можно идти по своему сценарию": { en: "You can follow your own path", zh: "可以按自己的节奏前进", de: "Sie können dem eigenen Ablauf folgen" },
  "Порядок прослушивания": { en: "Listening order", zh: "收听顺序", de: "Hörreihenfolge" },
  "Открытое прослушивание": { en: "Open listening", zh: "开放试听", de: "Freies Hören" },
  "Все треки активируются на 72 часа": { en: "All tracks unlock for 72 hours", zh: "所有音轨解锁 72 小时", de: "Alle Tracks werden 72 Stunden freigeschaltet" },
  "Клиент получает сообщение «Спасибо! Слушайте», доступ ко всем трекам тура и запись о покупке в личном кабинете.": {
    en: "The customer receives a “Thank you! Listen now” message, access to all tour tracks, and a purchase record in the account.",
    zh: "客户会收到“谢谢！请收听”的提示，获得所有音轨访问权，并在账户中保存购买记录。",
    de: "Der Kunde erhält die Meldung „Danke! Jetzt anhören“, Zugang zu allen Tracks und einen Kaufnachweis im Konto.",
  },
  "После оплаты": { en: "After payment", zh: "付款后", de: "Nach der Zahlung" },
  "Другие туры этого экскурсовода": { en: "Other tours by this guide", zh: "该讲解员的其他游览", de: "Weitere Touren dieses Guides" },
  "Рекомендации по автору": { en: "Author recommendations", zh: "作者推荐", de: "Empfehlungen zum Autor" },
  "Открыть трек": { en: "Open track", zh: "打开音轨", de: "Track öffnen" },
  "Перейти к туру": { en: "Go to tour", zh: "前往游览", de: "Zur Tour" },
  "Доехать на такси": { en: "Go by taxi", zh: "打车前往", de: "Mit dem Taxi fahren" },
  "Открыть в Яндекс Картах": { en: "Open in Yandex Maps", zh: "在 Yandex 地图中打开", de: "In Yandex Karten öffnen" },
  "Определить ваше местоположение": { en: "Find your location", zh: "定位当前位置", de: "Standort bestimmen" },
  "Создать свою карту": { en: "Create your own map", zh: "创建自己的地图", de: "Eigene Karte erstellen" },
  "Условия использования": { en: "Terms of use", zh: "使用条款", de: "Nutzungsbedingungen" },
  "Продолжительность": { en: "Duration", zh: "时长", de: "Dauer" },
  "Точки интереса и туры на карте города": { en: "Points of interest and tours on the city map", zh: "城市地图上的兴趣点和游览", de: "Orte und Touren auf der Stadtkarte" },
  "На общей карте точка показывает, в каких турах она отмечена. Нажатие ведёт в карточку конкретного тура, а встроенная геолокация помогает понять, где вы сейчас.": {
    en: "On the shared map, each point shows the tours where it appears. A click opens the tour card, and geolocation helps you see where you are.",
    zh: "在总地图上，每个点会显示它出现在哪些游览中。点击可进入具体游览卡片，内置定位帮助你了解当前位置。",
    de: "Auf der Gesamtkarte zeigt jeder Punkt, in welchen Touren er vorkommt. Ein Klick öffnet die Tourkarte, Geolokalisierung zeigt den aktuellen Standort.",
  },
  "Что уже заложено по ТЗ": { en: "What is already implemented", zh: "已实现内容", de: "Bereits umgesetzt" },
  "Точки интереса выводятся на интерактивную карту": { en: "Points of interest appear on an interactive map", zh: "兴趣点显示在交互式地图上", de: "Orte erscheinen auf einer interaktiven Karte" },
  "Одна точка может принадлежать нескольким турам": { en: "One point can belong to several tours", zh: "一个点可属于多个游览", de: "Ein Punkt kann zu mehreren Touren gehören" },
  "Из пузыря точки можно перейти в карточку тура": { en: "A point bubble can open the tour card", zh: "可从点位气泡进入游览卡片", de: "Aus der Punktblase geht es zur Tourkarte" },
  "Карта включает геолокацию пользователя": { en: "The map includes user geolocation", zh: "地图包含用户定位", de: "Die Karte enthält Nutzer-Geolokalisierung" },
  "В этой точке доступны следующие туры:": { en: "The following tours are available at this point:", zh: "此点可用以下游览：", de: "An diesem Punkt sind folgende Touren verfügbar:" },
  "Оплата и доступ": { en: "Payment and access", zh: "支付和访问", de: "Zahlung und Zugang" },
  "Выберите экскурсию, при необходимости примените промокод и оформите доступ на 72 часа.": {
    en: "Choose a tour, apply a promo code if needed, and purchase 72-hour access.",
    zh: "选择导览，必要时使用优惠码，并购买 72 小时访问权。",
    de: "Wählen Sie eine Tour, nutzen Sie bei Bedarf einen Promocode und kaufen Sie 72 Stunden Zugang.",
  },
  "Документы под рукой": { en: "Documents at hand", zh: "文件随手可得", de: "Dokumente griffbereit" },
  "Перед оплатой можно открыть оферту, политику обработки персональных данных и порядок оплаты и возвратов.": {
    en: "Before payment, you can open the offer, privacy policy, and payment and refund rules.",
    zh: "付款前可打开要约、个人数据政策以及支付和退款规则。",
    de: "Vor der Zahlung können Angebot, Datenschutz und Zahlungs- und Erstattungsregeln geöffnet werden.",
  },
  "Оферта": { en: "Offer", zh: "要约", de: "Angebot" },
  "Политика ПДн": { en: "Privacy policy", zh: "个人数据政策", de: "Datenschutz" },
  "Согласие на ПДн": { en: "Personal data consent", zh: "个人数据同意书", de: "Einwilligung zur Datenverarbeitung" },
  "Оплата и возвраты": { en: "Payments and refunds", zh: "支付和退款", de: "Zahlung und Erstattung" },
  "Исполнитель": { en: "Provider", zh: "服务提供方", de: "Anbieter" },
  "Оплата проводится официально, а условия покупки и возвратов доступны в документах выше.": {
    en: "Payment is processed officially, and purchase and refund terms are available in the documents above.",
    zh: "付款正式处理，购买和退款条款可在上方文件中查看。",
    de: "Die Zahlung erfolgt offiziell; Kauf- und Erstattungsbedingungen stehen in den Dokumenten oben.",
  },
  "Что вы получите после оплаты": { en: "What you get after payment", zh: "付款后你将获得", de: "Was Sie nach der Zahlung erhalten" },
  "Все треки выбранной экскурсии на 72 часа": { en: "All tracks of the selected tour for 72 hours", zh: "所选导览全部音轨 72 小时访问", de: "Alle Tracks der gewählten Tour für 72 Stunden" },
  "Прослушивание без ограничений в течение срока доступа": { en: "Unlimited listening during the access period", zh: "访问期内不限次数收听", de: "Unbegrenztes Hören während der Zugangszeit" },
  "Историю заказа в личном кабинете": { en: "Order history in your account", zh: "账户中的订单历史", de: "Bestellhistorie im Konto" },
  "Сообщение «Спасибо! Слушайте» после подтверждения платежа": { en: "A “Thank you! Listen now” message after payment confirmation", zh: "付款确认后的“谢谢！请收听”提示", de: "Die Meldung „Danke! Jetzt anhören“ nach Zahlungsbestätigung" },
  "На одну экскурсию применяется только одна скидка.": { en: "Only one discount can be applied to one tour.", zh: "每个导览只能使用一个折扣。", de: "Pro Tour kann nur ein Rabatt verwendet werden." },
  "Личный кабинет после покупки": { en: "Account after purchase", zh: "购买后的账户", de: "Konto nach dem Kauf" },
  "Сайт запоминает покупку по электронной почте. В кабинете будут видны история заказов, активные доступы и срок действия экскурсии.": {
    en: "The site links the purchase to your email. The account shows order history, active access, and the tour expiration time.",
    zh: "网站会按电子邮件记录购买。账户中会显示订单历史、有效访问和导览有效期。",
    de: "Die Website ordnet den Kauf Ihrer E-Mail zu. Im Konto sehen Sie Bestellhistorie, aktive Zugänge und Ablaufzeiten.",
  },
  "Оформить доступ": { en: "Purchase access", zh: "购买访问权", de: "Zugang erwerben" },
  "Загружаем доступные экскурсии...": { en: "Loading available tours...", zh: "正在加载可用游览...", de: "Verfügbare Touren werden geladen..." },
  "Экскурсия": { en: "Tour", zh: "游览", de: "Tour" },
  "Имя": { en: "Name", zh: "姓名", de: "Name" },
  "Как к вам обращаться": { en: "How should we address you?", zh: "如何称呼您？", de: "Wie dürfen wir Sie ansprechen?" },
  "Электронная почта": { en: "Email", zh: "电子邮件", de: "E-Mail" },
  "Промокод": { en: "Promo code", zh: "优惠码", de: "Promocode" },
  "Если есть код скидки": { en: "If you have a discount code", zh: "如有折扣码", de: "Falls Sie einen Rabattcode haben" },
  "Пересчитать": { en: "Recalculate", zh: "重新计算", de: "Neu berechnen" },
  "Принимаю": { en: "I accept", zh: "我接受", de: "Ich akzeptiere" },
  "Даю": { en: "I give", zh: "我同意", de: "Ich erteile" },
  "условия публичной оферты": { en: "the public offer terms", zh: "公开要约条款", de: "die Bedingungen des öffentlichen Angebots" },
  "порядок оплаты и возвратов": { en: "the payment and refund rules", zh: "支付和退款规则", de: "die Zahlungs- und Erstattungsregeln" },
  "согласие на обработку персональных данных": { en: "consent to personal data processing", zh: "个人数据处理同意", de: "Einwilligung zur Verarbeitung personenbezogener Daten" },
  "политикой обработки персональных данных": { en: "the privacy policy", zh: "个人数据处理政策", de: "der Datenschutzerklärung" },
  "версии": { en: "version", zh: "版本", de: "Version" },
  "и ознакомлен с": { en: "and I have read", zh: "并已阅读", de: "und habe gelesen" },
  "Стоимость": { en: "Price", zh: "价格", de: "Preis" },
  "Скидка": { en: "Discount", zh: "折扣", de: "Rabatt" },
  "Итого к оплате": { en: "Total to pay", zh: "应付总额", de: "Zu zahlen" },
  "Выберите тур": { en: "Select a tour", zh: "选择游览", de: "Tour wählen" },
  "Создаём заказ...": { en: "Creating order...", zh: "正在创建订单...", de: "Bestellung wird erstellt..." },
  "Перейти к оплате": { en: "Proceed to payment", zh: "前往付款", de: "Zur Zahlung" },
  "Контакты": { en: "Contacts", zh: "联系方式", de: "Kontakt" },
  "Условия и оплата": { en: "Terms & payment", zh: "购买与付款", de: "Kauf & Zahlung" },
  "Язык сайта": { en: "Site language", zh: "网站语言", de: "Seitensprache" },
  "Тёмный вид": { en: "Dark view", zh: "深色", de: "Dunkel" },
  "Светлый вид": { en: "Light view", zh: "浅色", de: "Hell" },
  "Вход": { en: "Sign in", zh: "登录", de: "Anmelden" },
  "Претензии клиентов, обратная связь и заявки экскурсоводов": {
    en: "Customer claims, feedback, and guide applications",
    zh: "客户投诉、反馈和讲解员申请",
    de: "Kundenanliegen, Feedback und Guide-Bewerbungen",
  },
  "Здесь можно задать вопрос по покупке и доступу, отправить претензию или оставить заявку на размещение своей экскурсии.": {
    en: "Here you can ask about purchases and access, submit a claim, or apply to publish your own tour.",
    zh: "在这里可以咨询购买和访问问题、提交投诉，或申请发布自己的导览。",
    de: "Hier können Sie Fragen zu Kauf und Zugang stellen, eine Reklamation senden oder eine eigene Tour einreichen.",
  },
  "Претензии клиентов": { en: "Customer claims", zh: "客户投诉", de: "Kundenanliegen" },
  "Возвраты и спорные ситуации": { en: "Refunds and disputes", zh: "退款和争议", de: "Erstattungen und Streitfälle" },
  "Если вопрос связан с оплатой, возвратом или доступом к экскурсии, напишите нам здесь.": {
    en: "If your question concerns payment, refund, or tour access, write to us here.",
    zh: "如果问题涉及付款、退款或导览访问，请在这里联系我们。",
    de: "Wenn es um Zahlung, Erstattung oder Tourzugang geht, schreiben Sie uns hier.",
  },
  "Обратная связь": { en: "Feedback", zh: "反馈", de: "Feedback" },
  "Поддержка пользователей": { en: "User support", zh: "用户支持", de: "Nutzersupport" },
  "Поможем с картой, входом, историей заказов, покупкой экскурсии и работой сайта.": {
    en: "We can help with the map, login, order history, tour purchase, and site operation.",
    zh: "我们可协助处理地图、登录、订单历史、导览购买和网站使用问题。",
    de: "Wir helfen mit Karte, Login, Bestellhistorie, Tourkauf und Website-Nutzung.",
  },
  "Новые экскурсоводы": { en: "New guides", zh: "新讲解员", de: "Neue Guides" },
  "Заявка на размещение": { en: "Publication application", zh: "发布申请", de: "Anfrage zur Veröffentlichung" },
  "Если вы хотите разместить свои маршруты, аудиотреки и точки интереса, отправьте заявку.": {
    en: "If you want to publish your routes, audio tracks, and points of interest, send an application.",
    zh: "如果您想发布自己的路线、音轨和兴趣点，请提交申请。",
    de: "Wenn Sie eigene Routen, Audiotracks und Orte veröffentlichen möchten, senden Sie eine Anfrage.",
  },
  "Какое обращение выбрать": { en: "Which request type to choose", zh: "选择哪种请求类型", de: "Welche Anfrage wählen" },
  "Если нужен ответ по покупке и доступу, выберите «Обратная связь»": {
    en: "Choose “Feedback” for purchase and access questions.",
    zh: "购买和访问问题请选择“反馈”。",
    de: "Wählen Sie „Feedback“ für Fragen zu Kauf und Zugang.",
  },
  "Если вопрос связан с возвратом или спорной ситуацией, выберите «Претензия клиента»": {
    en: "Choose “Customer claim” for refunds or disputes.",
    zh: "退款或争议请选择“客户投诉”。",
    de: "Wählen Sie „Kundenanliegen“ bei Erstattung oder Streitfall.",
  },
  "Если хотите разместить свою экскурсию, выберите «Заявка экскурсовода»": {
    en: "Choose “Guide application” if you want to publish your tour.",
    zh: "如果想发布自己的导览，请选择“讲解员申请”。",
    de: "Wählen Sie „Guide-Bewerbung“, wenn Sie eine Tour veröffentlichen möchten.",
  },
  "Исполнитель:": { en: "Provider:", zh: "服务提供方：", de: "Anbieter:" },
  "Телефон:": { en: "Phone:", zh: "电话：", de: "Telefon:" },
  "Отправить обращение": { en: "Send request", zh: "发送请求", de: "Anfrage senden" },
  "Тип обращения": { en: "Request type", zh: "请求类型", de: "Anfragetyp" },
  "Телефон": { en: "Phone", zh: "电话", de: "Telefon" },
  "Претензия клиента": { en: "Customer claim", zh: "客户投诉", de: "Kundenanliegen" },
  "Заявка экскурсовода": { en: "Guide application", zh: "讲解员申请", de: "Guide-Bewerbung" },
  "Сообщение": { en: "Message", zh: "消息", de: "Nachricht" },
  "для обработки обращения": { en: "to process the request", zh: "用于处理请求", de: "zur Bearbeitung der Anfrage" },
  "Опишите ваш вопрос, претензию или предложение по размещению тура.": {
    en: "Describe your question, claim, or proposal to publish a tour.",
    zh: "请描述您的问题、投诉或发布导览的建议。",
    de: "Beschreiben Sie Ihre Frage, Reklamation oder Ihren Vorschlag zur Veröffentlichung einer Tour.",
  },
  "Отправляем...": { en: "Sending...", zh: "正在发送...", de: "Wird gesendet..." },
  "Вход в кабинет": { en: "Sign in to account", zh: "登录账户", de: "Im Konto anmelden" },
  "Почтовый вход": { en: "Email sign-in", zh: "电子邮件登录", de: "E-Mail-Login" },
  "Личный кабинет нужен для истории заказов, повторных входов, купленных туров и дальнейшего доступа к аудиомаршрутам.": {
    en: "The account stores order history, repeat sign-ins, purchased tours, and future access to audio routes.",
    zh: "账户用于保存订单历史、再次登录、已购导览和后续语音路线访问。",
    de: "Das Konto speichert Bestellhistorie, erneute Logins, gekaufte Touren und weiteren Zugang zu Audiorouten.",
  },
  "Пароль": { en: "Password", zh: "密码", de: "Passwort" },
  "Введите пароль": { en: "Enter password", zh: "输入密码", de: "Passwort eingeben" },
  "Показать пароль": { en: "Show password", zh: "显示密码", de: "Passwort anzeigen" },
  "Продолжить": { en: "Continue", zh: "继续", de: "Weiter" },
  "Вход без пароля": { en: "Sign in without password", zh: "免密码登录", de: "Ohne Passwort anmelden" },
  "Можно получить одноразовую ссылку на почту и войти без пароля.": {
    en: "You can receive a one-time email link and sign in without a password.",
    zh: "您可以通过电子邮件收到一次性链接，无需密码登录。",
    de: "Sie können einen einmaligen E-Mail-Link erhalten und ohne Passwort anmelden.",
  },
  "Войти по ссылке": { en: "Sign in by link", zh: "通过链接登录", de: "Per Link anmelden" },
  "Забыли пароль?": { en: "Forgot password?", zh: "忘记密码？", de: "Passwort vergessen?" },
  "Что открывается после входа": { en: "What opens after sign-in", zh: "登录后可使用", de: "Was nach dem Login verfügbar ist" },
  "Мои маршруты и активные доступы": { en: "My routes and active access", zh: "我的路线和有效访问", de: "Meine Routen und aktiven Zugänge" },
  "История покупок и повторные входы": { en: "Purchase history and repeat sign-ins", zh: "购买历史和再次登录", de: "Kaufhistorie und erneute Logins" },
  "Избранные точки интереса": { en: "Favorite points of interest", zh: "收藏兴趣点", de: "Favorisierte Orte" },
  "Профиль, почта и уведомления": { en: "Profile, email, and notifications", zh: "资料、电子邮件和通知", de: "Profil, E-Mail und Benachrichtigungen" },
  "Создать кабинет": { en: "Create account", zh: "创建账户", de: "Konto erstellen" },
  "Регистрация": { en: "Registration", zh: "注册", de: "Registrierung" },
  "После регистрации пользователь получает историю заказов, доступы к купленным турам и вход по электронной почте.": {
    en: "After registration, the user gets order history, access to purchased tours, and email sign-in.",
    zh: "注册后，用户可查看订单历史、访问已购导览，并通过电子邮件登录。",
    de: "Nach der Registrierung erhält der Nutzer Bestellhistorie, Zugang zu gekauften Touren und E-Mail-Login.",
  },
  "Повторите пароль": { en: "Repeat password", zh: "重复密码", de: "Passwort wiederholen" },
  "Зарегистрироваться": { en: "Register", zh: "注册", de: "Registrieren" },
  "У меня уже есть кабинет": { en: "I already have an account", zh: "我已有账户", de: "Ich habe bereits ein Konto" },
  "После регистрации": { en: "After registration", zh: "注册后", de: "Nach der Registrierung" },
  "Почта становится входом и идентификатором клиента": { en: "Email becomes the login and customer identifier", zh: "电子邮件成为登录名和客户标识", de: "E-Mail wird Login und Kundenkennung" },
  "Оплаченные экскурсии сохраняются в истории заказов": { en: "Paid tours are saved in order history", zh: "已付费导览保存在订单历史中", de: "Bezahlte Touren werden in der Historie gespeichert" },
  "После подтверждения почты доступ становится персональным": { en: "After email confirmation, access becomes personal", zh: "邮箱确认后访问权变为个人专属", de: "Nach E-Mail-Bestätigung wird der Zugang persönlich" },
  "Дальше сюда же привязываются оплаты и доступы на 72 часа": { en: "Payments and 72-hour access are linked here later", zh: "之后付款和 72 小时访问也会绑定到这里", de: "Zahlungen und 72-Stunden-Zugänge werden hier verknüpft" },
  "Сбросить пароль": { en: "Reset password", zh: "重置密码", de: "Passwort zurücksetzen" },
  "Восстановление доступа": { en: "Access recovery", zh: "恢复访问", de: "Zugang wiederherstellen" },
  "Введите почту кабинета. Мы отправим письмо со ссылкой для нового пароля.": {
    en: "Enter your account email. We will send a link to set a new password.",
    zh: "输入账户邮箱。我们会发送设置新密码的链接。",
    de: "Geben Sie Ihre Konto-E-Mail ein. Wir senden einen Link für ein neues Passwort.",
  },
  "Отправить письмо": { en: "Send email", zh: "发送邮件", de: "E-Mail senden" },
  "Как это работает": { en: "How it works", zh: "工作方式", de: "So funktioniert es" },
  "Письмо приходит на адрес, который использовался при регистрации": { en: "The email is sent to the address used at registration", zh: "邮件会发送到注册时使用的地址", de: "Die E-Mail geht an die bei der Registrierung genutzte Adresse" },
  "Ссылка ведёт на защищённую форму нового пароля": { en: "The link opens a protected new password form", zh: "链接会打开安全的新密码表单", de: "Der Link öffnet ein geschütztes Formular für ein neues Passwort" },
  "После смены пароля можно снова войти в кабинет": { en: "After changing the password, you can sign in again", zh: "更改密码后可以重新登录账户", de: "Nach der Änderung können Sie sich wieder anmelden" },
  "Такой страницы пока нет": { en: "This page is not available yet", zh: "此页面暂不可用", de: "Diese Seite gibt es noch nicht" },
  "Вернитесь в каталог экскурсий, карту или в кабинет, если у вас уже есть доступ к маршрутам.": {
    en: "Return to the tour catalog, map, or account if you already have access to routes.",
    zh: "如果您已有路线访问权，请返回游览目录、地图或账户。",
    de: "Kehren Sie zum Tourenkatalog, zur Karte oder zum Konto zurück, wenn Sie bereits Zugang haben.",
  },
  "Маршрут вдохновлён дневной прогулкой «10 000 шагов по Кемерово» от Сергея Колкова. Это большое знакомство с центральной частью города: памятники, площади, городские истории и точки, через которые Кемерово раскрывается не как схема, а как живая среда. Экскурсовод задаёт рекомендованную последовательность, но после покупки можно слушать треки в любом порядке и идти своим маршрутом.": {
    en: "The route is inspired by Sergey Kolkov's daytime “10,000 steps through Kemerovo” walk. It is a broad introduction to the central city: monuments, squares, stories, and points where Kemerovo appears as a living environment rather than a scheme. The guide suggests an order, but after purchase you can listen in any sequence and follow your own route.",
    zh: "路线灵感来自谢尔盖·科尔科夫的“克麦罗沃 10,000 步”白日步行。这是一次对市中心的完整认识：纪念碑、广场、城市故事，以及让克麦罗沃显得鲜活的地点。讲解员建议顺序，但购买后可以按任意顺序收听并走自己的路线。",
    de: "Die Route ist von Sergey Kolkovs Tagesweg „10.000 Schritte durch Kemerowo“ inspiriert. Sie führt in das Zentrum ein: Denkmäler, Plätze, Stadtgeschichten und Orte, an denen Kemerowo als lebendige Umgebung erscheint. Der Guide empfiehlt eine Reihenfolge, nach dem Kauf kann man aber frei hören und gehen.",
  },
  "Для первого вдумчивого знакомства с Кемерово и для тех, кто хочет пройти по центру города авторским маршрутом длиной около 7 км.": {
    en: "For a thoughtful first encounter with Kemerovo and for those who want to walk an author-led route of about 7 km through the center.",
    zh: "适合第一次深入认识克麦罗沃的人，也适合想沿约 7 公里的作者路线穿过市中心的人。",
    de: "Für ein erstes bewusstes Kennenlernen von Kemerowo und für alle, die eine autorengeführte Route von etwa 7 km durch das Zentrum gehen möchten.",
  },
  "Демо-трек, который знакомит с подачей экскурсовода и точкой старта маршрута.": {
    en: "A demo track introducing the guide's style and the route starting point.",
    zh: "介绍讲解员风格和路线起点的试听音轨。",
    de: "Ein Demo-Track, der Stil des Guides und Startpunkt der Route vorstellt.",
  },
  "Точка маршрута, которая раскрывает следующий фрагмент прогулки по центру Кемерово.": {
    en: "A route point that opens the next part of the walk through central Kemerovo.",
    zh: "这一站展开克麦罗沃市中心步行的下一段。",
    de: "Ein Routenpunkt, der den nächsten Abschnitt des Spaziergangs durch Kemerowo öffnet.",
  },
  "Трек без обязательной привязки к карте, который остаётся в маршруте тура и показывает, как система поддерживает такой сценарий.": {
    en: "A track without mandatory map binding that remains in the tour route and shows how the system supports this scenario.",
    zh: "一个不强制绑定地图的音轨，仍保留在导览路线中，展示系统如何支持这种场景。",
    de: "Ein Track ohne zwingende Kartenbindung, der in der Route bleibt und zeigt, wie das System dieses Szenario unterstützt.",
  },
  "Продолжение маршрута, которое открывается после оплаты и уводит прогулку дальше по центру города.": {
    en: "A continuation that unlocks after payment and leads the walk deeper through the city center.",
    zh: "付款后解锁的后续路线，将步行继续带入市中心。",
    de: "Eine Fortsetzung, die nach der Zahlung freigeschaltet wird und den Spaziergang weiter durch das Zentrum führt.",
  },
  "Финальный платный трек маршрута, который завершает прогулку и связывает точки в целый городской рассказ.": {
    en: "The final paid track that completes the walk and connects the points into one city story.",
    zh: "最终付费音轨，完成步行并把各点连接成完整的城市故事。",
    de: "Der letzte bezahlte Track, der den Spaziergang abschließt und die Punkte zu einer Stadtgeschichte verbindet.",
  },
  "«Суровая Родина» собирает Кемерово через отдельные точки интереса и авторский комментарий Сергея Колкова. На карте маршрут показан линией в рекомендованной последовательности, но после оплаты слушатель может двигаться к любой точке и включать нужный трек в произвольном порядке. Экскурсия подходит для самостоятельной прогулки по центру и внимательного разговора с городским пространством.": {
    en: "“Severe Homeland” presents Kemerovo through selected points of interest and Sergey Kolkov's author commentary. The map shows the recommended sequence, but after payment the listener can move to any point and play tracks in any order. The tour suits an independent walk through the center and an attentive conversation with urban space.",
    zh: "《严酷的故乡》通过若干兴趣点和谢尔盖·科尔科夫的作者讲述呈现克麦罗沃。地图显示推荐顺序，但付款后听众可前往任意地点并按任意顺序播放音轨。适合独立市中心步行和与城市空间的细致对话。",
    de: "„Strenge Heimat“ zeigt Kemerowo über ausgewählte Orte und Sergey Kolkovs Autorenkommentar. Die Karte zeigt die empfohlene Reihenfolge, nach Zahlung kann man jedoch jeden Punkt frei ansteuern und Tracks beliebig abspielen.",
  },
  "Для тех, кто хочет слушать город внимательнее и пройти по центру Кемерово маршрутом от автора путеводителя «Суровая Родина».": {
    en: "For those who want to listen to the city more closely and walk through central Kemerovo with the author of “Severe Homeland”.",
    zh: "适合想更细致地聆听城市，并跟随《严酷的故乡》作者路线走过克麦罗沃市中心的人。",
    de: "Für alle, die der Stadt genauer zuhören und mit dem Autor von „Strenge Heimat“ durch das Zentrum von Kemerowo gehen möchten.",
  },
  "О точке входа в маршрут и о том, как читать город через небольшие детали.": {
    en: "About the route entry point and reading the city through small details.",
    zh: "关于路线入口，以及如何通过小细节阅读城市。",
    de: "Über den Einstieg in die Route und das Lesen der Stadt anhand kleiner Details.",
  },
  "О том, как рос город-сад Кемерово. Эй, Кемерово": {
    en: "How Kemerovo grew as a garden city. Hey, Kemerovo",
    zh: "克麦罗沃花园城市如何成长。嘿，克麦罗沃",
    de: "Wie Kemerowo als Gartenstadt wuchs. Hey, Kemerowo",
  },
  "Разговор о площади как о точке, где маршрут меняет ритм и открывает следующий слой города.": {
    en: "A conversation about the square as the place where the route changes rhythm and reveals another layer of the city.",
    zh: "讲述广场如何成为路线改变节奏并打开城市下一层面的地点。",
    de: "Ein Gespräch über den Platz als Ort, an dem die Route ihren Rhythmus ändert und eine weitere Stadtschicht öffnet.",
  },
  "Продолжение маршрута, которое становится доступно после успешной оплаты экскурсии.": {
    en: "A continuation that becomes available after successful tour payment.",
    zh: "成功付款后可用的后续路线。",
    de: "Eine Fortsetzung, die nach erfolgreicher Zahlung verfügbar wird.",
  },
  "Третий бесплатный трек маршрута, после которого полный доступ открывается только после оплаты.": {
    en: "The third free route track; full access opens only after payment.",
    zh: "第三个免费路线音轨；完整访问需付款后开启。",
    de: "Der dritte kostenlose Track; voller Zugang öffnet sich erst nach Zahlung.",
  },
  "Открыть тур": { en: "Open tour", zh: "打开游览", de: "Tour öffnen" },
  "Открыть": { en: "Open", zh: "打开", de: "Öffnen" },
  "Условия покупки": { en: "Purchase terms", zh: "购买条款", de: "Kaufbedingungen" },
  "Условия приобретения и оплата": { en: "Purchase terms and payment", zh: "购买条款和支付", de: "Kaufbedingungen und Zahlung" },
  "и": { en: "and", zh: "和", de: "und" },
}

const POINT_TEXT: Record<string, TranslationSet> = {
  "Памятник бродячей собаке": { en: "Stray Dog Monument", zh: "流浪狗纪念碑", de: "Denkmal für den streunenden Hund" },
  "Театр драмы Кузбасса": { en: "Kuzbass Drama Theater", zh: "库兹巴斯戏剧院", de: "Kusbass-Dramatheater" },
  "Площадь Пушкина": { en: "Pushkin Square", zh: "普希金广场", de: "Puschkin-Platz" },
  "Площадь Советов": { en: "Soviet Square", zh: "苏维埃广场", de: "Sowjet-Platz" },
  "Парк Победы им. Жукова": { en: "Zhukov Victory Park", zh: "朱可夫胜利公园", de: "Siegpark Schukow" },
}

const LEGAL_PATHS = ["/offer", "/privacy", "/personal-data-consent", "/payment-policy"]

const LEGAL_FALLBACK: Partial<Record<Exclude<LocaleCode, "ru">, string>> = {
  en: "This legal section describes the provider, purchase process, access terms, payments, refunds, personal data processing, user rights, and support contacts.",
  zh: "本法律章节说明服务提供方、购买流程、访问条款、支付、退款、个人数据处理、用户权利和支持联系方式。",
  de: "Dieser rechtliche Abschnitt beschreibt Anbieter, Kaufprozess, Zugangsbedingungen, Zahlungen, Erstattungen, Datenverarbeitung, Nutzerrechte und Kontakte.",
}

const GENERAL_FALLBACK: Partial<Record<Exclude<LocaleCode, "ru">, string>> = {
  en: "Localized content for this section is available in the selected language.",
  zh: "此部分内容已按所选语言本地化。",
  de: "Der Inhalt dieses Abschnitts ist in der gewählten Sprache lokalisiert.",
}

function translated(locale: Exclude<LocaleCode, "ru">, text: string) {
  return STATIC_TEXT[text]?.[locale] ?? POINT_TEXT[text]?.[locale] ?? null
}

function withTourTitle(locale: Exclude<LocaleCode, "ru">, text: string) {
  let value = text
  for (const [source, targets] of Object.entries({ ...STATIC_TEXT, ...POINT_TEXT })) {
    if (source.length < 3) {
      continue
    }

    const target = targets[locale]
    if (target && value.includes(source)) {
      value = value.replaceAll(source, target)
    }
  }
  return value !== text ? value : null
}

function translateText(locale: LocaleCode, text: string) {
  if (locale === "ru") {
    return text
  }

  const trimmed = text.replace(/\s+/g, " ").trim()
  if (!trimmed || !/[А-Яа-яЁё]/.test(trimmed)) {
    return text
  }

  const target = translated(locale, trimmed)
  if (target) {
    return text.replace(trimmed, target)
  }

  if (typeof window !== "undefined" && LEGAL_PATHS.some((path) => window.location.pathname.startsWith(path))) {
    return text.replace(trimmed, LEGAL_FALLBACK[locale] ?? LEGAL_FALLBACK.en ?? trimmed)
  }

  const numbered = trimmed.match(/^(\d+)\.\s+(.+)$/)
  if (numbered) {
    const point = translated(locale, numbered[2]) ?? withTourTitle(locale, numbered[2])
    if (point) {
      return text.replace(trimmed, `${numbered[1]}. ${point}`)
    }
  }

  const interpolated = withTourTitle(locale, trimmed)
  if (interpolated) {
    return text.replace(trimmed, interpolated)
  }

  const yandex = trimmed.replaceAll("Яндекс", "Yandex")
  if (yandex !== trimmed) {
    return text.replace(trimmed, yandex)
  }

  if (trimmed.length > 40) {
    return text.replace(trimmed, GENERAL_FALLBACK[locale] ?? GENERAL_FALLBACK.en ?? trimmed)
  }

  return text
}

function translateAttributes(root: ParentNode, locale: LocaleCode) {
  for (const element of root.querySelectorAll<HTMLElement>("[placeholder], [aria-label], [title]")) {
    if (element.closest(".locale-switcher")) {
      continue
    }

    for (const attribute of ["placeholder", "aria-label", "title"]) {
      const current = element.getAttribute(attribute)
      if (!current) {
        continue
      }

      const originalAttribute = `data-i18n-original-${attribute}`
      const original = element.getAttribute(originalAttribute) ?? current
      element.setAttribute(originalAttribute, original)
      const next = locale === "ru" ? original : translateText(locale, original)
      if (next !== current) {
        element.setAttribute(attribute, next)
      }
    }
  }
}

function translateTextNodes(root: ParentNode, locale: LocaleCode) {
  const ignored = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"])
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode() as Text | null

  while (node) {
    const parent = node.parentElement
    const original = ((node as Text & { __audio42OriginalText?: string }).__audio42OriginalText ?? node.textContent ?? "")
    ;(node as Text & { __audio42OriginalText?: string }).__audio42OriginalText = original

    if (parent && !ignored.has(parent.tagName)) {
      if (parent.closest(".locale-switcher")) {
        node = walker.nextNode() as Text | null
        continue
      }

      const next = locale === "ru" ? original : translateText(locale, original)
      if (next !== node.textContent) {
        node.textContent = next
      }
    }

    node = walker.nextNode() as Text | null
  }
}

let cleanupCurrentRun: (() => void) | null = null

export function applyStaticPageTranslations(locale: LocaleCode) {
  if (typeof document === "undefined") {
    return () => undefined
  }

  cleanupCurrentRun?.()

  const run = () => {
    translateTextNodes(document.body, locale)
    translateAttributes(document.body, locale)
  }

  const handles: number[] = []
  handles.push(window.requestAnimationFrame(run))
  for (const delay of [80, 250, 700, 1500, 3000]) {
    handles.push(window.setTimeout(run, delay))
  }

  cleanupCurrentRun = () => {
    for (const handle of handles) {
      window.clearTimeout(handle)
      window.cancelAnimationFrame(handle)
    }
  }

  return () => {
    cleanupCurrentRun?.()
    cleanupCurrentRun = null
  }
}
