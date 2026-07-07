'use strict';

/*
 * Localizable INFO messages in every language ioBroker supports.
 *
 * Policy: errors, warnings, debug and silly logs are ALWAYS English (they are meant for
 * developers / log analysis and must be greppable). Operational INFO milestones may be
 * shown in the configured system language (system.config.common.language); English is the
 * fallback when the language is unset or unsupported. Use `{placeholder}` tokens and pass
 * the values to {@link translate}. Mode tokens ("auto"/"manual"/"off") are technical state
 * values and stay untranslated inside the messages.
 */
const MESSAGES = {
	adapterStarted: {
		en: 'Automatic Pond Aeration started: {points} aeration point(s), {groups} group(s), operating mode "{mode}".',
		de: 'Automatische Teichbelüftung gestartet: {points} Belüftungsstelle(n), {groups} Gruppe(n), Betriebsmodus „{mode}".',
		ru: 'Автоматическая аэрация пруда запущена: точек аэрации — {points}, групп — {groups}, режим работы «{mode}».',
		pt: 'Arejamento automático de lago iniciado: {points} ponto(s) de arejamento, {groups} grupo(s), modo de operação "{mode}".',
		nl: 'Automatische vijverbeluchting gestart: {points} beluchtingspunt(en), {groups} groep(en), bedrijfsmodus "{mode}".',
		fr: "Aération automatique d'étang démarrée : {points} point(s) d'aération, {groups} groupe(s), mode de fonctionnement « {mode} ».",
		it: 'Aerazione automatica del laghetto avviata: {points} punto/i di aerazione, {groups} gruppo/i, modalità operativa "{mode}".',
		es: 'Aireación automática de estanque iniciada: {points} punto(s) de aireación, {groups} grupo(s), modo de funcionamiento "{mode}".',
		pl: 'Automatyczne napowietrzanie stawu uruchomione: punkty napowietrzania: {points}, grupy: {groups}, tryb pracy „{mode}".',
		uk: 'Автоматичну аерацію ставка запущено: точок аерації — {points}, груп — {groups}, режим роботи «{mode}».',
		'zh-cn': '自动池塘增氧已启动：增氧点 {points} 个，分组 {groups} 个，运行模式“{mode}”。',
	},
	adapterDisabled: {
		en: 'Adapter is disabled (master switch off). Data points stay in sync, but no aeration is controlled.',
		de: 'Adapter ist deaktiviert (Hauptschalter aus). Datenpunkte bleiben synchron, es wird aber keine Belüftung gesteuert.',
		ru: 'Адаптер отключён (главный выключатель выкл). Точки данных синхронизируются, но аэрация не управляется.',
		pt: 'O adaptador está desativado (interruptor principal desligado). Os pontos de dados permanecem sincronizados, mas nenhum arejamento é controlado.',
		nl: 'Adapter is uitgeschakeld (hoofdschakelaar uit). Datapunten blijven gesynchroniseerd, maar er wordt geen beluchting aangestuurd.',
		fr: "L'adaptateur est désactivé (interrupteur principal éteint). Les points de données restent synchronisés, mais aucune aération n'est commandée.",
		it: "L'adattatore è disabilitato (interruttore principale spento). I punti dati restano sincronizzati, ma nessuna aerazione viene controllata.",
		es: 'El adaptador está desactivado (interruptor principal apagado). Los puntos de datos permanecen sincronizados, pero no se controla ninguna aireación.',
		pl: 'Adapter jest wyłączony (główny włącznik wył.). Punkty danych pozostają zsynchronizowane, ale napowietrzanie nie jest sterowane.',
		uk: 'Адаптер вимкнено (головний вимикач вимк). Точки даних синхронізуються, але аерація не керується.',
		'zh-cn': '适配器已禁用（总开关关闭）。数据点保持同步，但不控制任何增氧。',
	},
	masterSwitchOn: {
		en: 'Master switch turned ON — aeration control is active.',
		de: 'Hauptschalter EIN — die Belüftungssteuerung ist aktiv.',
		ru: 'Главный выключатель ВКЛ — управление аэрацией активно.',
		pt: 'Interruptor principal LIGADO — o controlo do arejamento está ativo.',
		nl: 'Hoofdschakelaar AAN — de beluchtingsregeling is actief.',
		fr: "Interrupteur principal ACTIVÉ — la commande d'aération est active.",
		it: "Interruttore principale ACCESO — il controllo dell'aerazione è attivo.",
		es: 'Interruptor principal ENCENDIDO — el control de aireación está activo.',
		pl: 'Główny włącznik WŁ. — sterowanie napowietrzaniem jest aktywne.',
		uk: 'Головний вимикач УВІМК — керування аерацією активне.',
		'zh-cn': '总开关已开启——增氧控制已激活。',
	},
	masterSwitchOff: {
		en: 'Master switch turned OFF — all valves will be closed.',
		de: 'Hauptschalter AUS — alle Ventile werden geschlossen.',
		ru: 'Главный выключатель ВЫКЛ — все клапаны будут закрыты.',
		pt: 'Interruptor principal DESLIGADO — todas as válvulas serão fechadas.',
		nl: 'Hoofdschakelaar UIT — alle kleppen worden gesloten.',
		fr: 'Interrupteur principal ÉTEINT — toutes les vannes seront fermées.',
		it: 'Interruttore principale SPENTO — tutte le valvole verranno chiuse.',
		es: 'Interruptor principal APAGADO — todas las válvulas se cerrarán.',
		pl: 'Główny włącznik WYŁ. — wszystkie zawory zostaną zamknięte.',
		uk: 'Головний вимикач ВИМК — усі клапани буде закрито.',
		'zh-cn': '总开关已关闭——所有阀门将被关闭。',
	},
	modeChanged: {
		en: 'Operating mode changed to "{mode}".',
		de: 'Betriebsmodus geändert auf „{mode}".',
		ru: 'Режим работы изменён на «{mode}».',
		pt: 'Modo de operação alterado para "{mode}".',
		nl: 'Bedrijfsmodus gewijzigd naar "{mode}".',
		fr: 'Mode de fonctionnement changé en « {mode} ».',
		it: 'Modalità operativa cambiata in "{mode}".',
		es: 'Modo de funcionamiento cambiado a "{mode}".',
		pl: 'Tryb pracy zmieniony na „{mode}".',
		uk: 'Режим роботи змінено на «{mode}».',
		'zh-cn': '运行模式已更改为“{mode}”。',
	},
	allValvesClosed: {
		en: 'Closing all valves — operating mode set to "off".',
		de: 'Alle Ventile werden geschlossen — Betriebsmodus auf „off" gesetzt.',
		ru: 'Все клапаны закрываются — режим работы установлен на «off».',
		pt: 'A fechar todas as válvulas — modo de operação definido como "off".',
		nl: 'Alle kleppen worden gesloten — bedrijfsmodus op "off" gezet.',
		fr: 'Fermeture de toutes les vannes — mode de fonctionnement réglé sur « off ».',
		it: 'Chiusura di tutte le valvole — modalità operativa impostata su "off".',
		es: 'Cerrando todas las válvulas — modo de funcionamiento establecido en "off".',
		pl: 'Zamykanie wszystkich zaworów — tryb pracy ustawiony na „off".',
		uk: 'Закриваються всі клапани — режим роботи встановлено на «off».',
		'zh-cn': '正在关闭所有阀门——运行模式已设为“off”。',
	},
	manualStored: {
		en: 'Manual valve command stored; it only takes effect in operating mode "manual" (current mode: "{mode}").',
		de: 'Manueller Ventilbefehl gespeichert; er wirkt nur im Betriebsmodus „manual" (aktueller Modus: „{mode}").',
		ru: 'Ручная команда клапана сохранена; она действует только в режиме «manual» (текущий режим: «{mode}»).',
		pt: 'Comando manual de válvula guardado; só tem efeito no modo de operação "manual" (modo atual: "{mode}").',
		nl: 'Handmatige klepopdracht opgeslagen; deze werkt alleen in bedrijfsmodus "manual" (huidige modus: "{mode}").',
		fr: "Commande manuelle de vanne enregistrée ; elle ne prend effet qu'en mode « manual » (mode actuel : « {mode} »).",
		it: 'Comando manuale della valvola memorizzato; ha effetto solo nella modalità "manual" (modalità attuale: "{mode}").',
		es: 'Comando manual de válvula guardado; solo surte efecto en el modo "manual" (modo actual: "{mode}").',
		pl: 'Zapisano ręczne polecenie zaworu; działa tylko w trybie „manual" (bieżący tryb: „{mode}").',
		uk: 'Ручну команду клапана збережено; вона діє лише в режимі «manual» (поточний режим: «{mode}»).',
		'zh-cn': '已保存手动阀门命令；仅在运行模式“manual”下生效（当前模式：“{mode}”）。',
	},
	interlockCleared: {
		en: 'Safety interlock cleared — aeration returns to normal operation.',
		de: 'Sicherheitsverriegelung aufgehoben — die Belüftung kehrt zum Normalbetrieb zurück.',
		ru: 'Защитная блокировка снята — аэрация возвращается к нормальной работе.',
		pt: 'Bloqueio de segurança removido — o arejamento volta ao funcionamento normal.',
		nl: 'Veiligheidsvergrendeling opgeheven — de beluchting keert terug naar normale werking.',
		fr: "Verrouillage de sécurité levé — l'aération revient au fonctionnement normal.",
		it: "Interblocco di sicurezza rimosso — l'aerazione torna al funzionamento normale.",
		es: 'Enclavamiento de seguridad liberado — la aireación vuelve al funcionamiento normal.',
		pl: 'Blokada bezpieczeństwa zwolniona — napowietrzanie wraca do normalnej pracy.',
		uk: 'Запобіжне блокування знято — аерація повертається до нормальної роботи.',
		'zh-cn': '安全联锁已解除——增氧恢复正常运行。',
	},
	feederPauseStart: {
		en: 'Feeding detected — pausing the selected aeration points.',
		de: 'Fütterung erkannt — die ausgewählten Belüftungsstellen werden pausiert.',
		ru: 'Обнаружено кормление — выбранные точки аэрации приостанавливаются.',
		pt: 'Alimentação detetada — a pausar os pontos de arejamento selecionados.',
		nl: 'Voedering gedetecteerd — de geselecteerde beluchtingspunten worden gepauzeerd.',
		fr: "Distribution détectée — mise en pause des points d'aération sélectionnés.",
		it: 'Alimentazione rilevata — messa in pausa dei punti di aerazione selezionati.',
		es: 'Alimentación detectada — pausando los puntos de aireación seleccionados.',
		pl: 'Wykryto karmienie — wybrane punkty napowietrzania zostają wstrzymane.',
		uk: 'Виявлено годування — вибрані точки аерації призупиняються.',
		'zh-cn': '检测到投喂——正在暂停所选增氧点。',
	},
	feederPauseEnd: {
		en: 'Feeding pause ended — aeration resumes.',
		de: 'Fütterungspause beendet — die Belüftung wird fortgesetzt.',
		ru: 'Пауза кормления завершена — аэрация возобновляется.',
		pt: 'Pausa de alimentação terminada — o arejamento é retomado.',
		nl: 'Voederpauze beëindigd — de beluchting wordt hervat.',
		fr: "Pause d'alimentation terminée — l'aération reprend.",
		it: "Pausa di alimentazione terminata — l'aerazione riprende.",
		es: 'Pausa de alimentación finalizada — la aireación se reanuda.',
		pl: 'Przerwa na karmienie zakończona — napowietrzanie zostaje wznowione.',
		uk: 'Паузу на годування завершено — аерація відновлюється.',
		'zh-cn': '投喂暂停已结束——增氧恢复。',
	},
	winterModeStart: {
		en: 'Winter / ice-free mode active — keeping the selected aeration points running to hold an ice-free hole.',
		de: 'Winter-/Eisfrei-Modus aktiv — die ausgewählten Belüftungsstellen laufen weiter, um ein eisfreies Loch offenzuhalten.',
		ru: 'Зимний режим / режим против обледенения активен — выбранные точки аэрации продолжают работать, чтобы сохранить полынью.',
		pt: 'Modo de inverno / livre de gelo ativo — a manter os pontos de arejamento selecionados em funcionamento para conservar um buraco livre de gelo.',
		nl: 'Winter-/ijsvrij-modus actief — de geselecteerde beluchtingspunten blijven draaien om een ijsvrij wak te houden.',
		fr: "Mode hiver / sans glace actif — les points d'aération sélectionnés continuent de fonctionner pour maintenir un trou libre de glace.",
		it: 'Modalità invernale / anti-ghiaccio attiva — i punti di aerazione selezionati restano in funzione per mantenere un foro libero dal ghiaccio.',
		es: 'Modo invierno / sin hielo activo — los puntos de aireación seleccionados siguen funcionando para mantener un agujero libre de hielo.',
		pl: 'Tryb zimowy / przeciwoblodzeniowy aktywny — wybrane punkty napowietrzania nadal pracują, aby utrzymać przerębel wolny od lodu.',
		uk: 'Зимовий режим / режим проти обмерзання активний — вибрані точки аерації продовжують працювати, щоб зберегти ополонку.',
		'zh-cn': '冬季／防冰模式已激活——所选增氧点继续运行，以保持无冰的开口。',
	},
	winterModeEnd: {
		en: 'Winter / ice-free mode ended — returning to normal operation.',
		de: 'Winter-/Eisfrei-Modus beendet — Rückkehr zum Normalbetrieb.',
		ru: 'Зимний режим / режим против обледенения завершён — возврат к нормальной работе.',
		pt: 'Modo de inverno / livre de gelo terminado — a regressar ao funcionamento normal.',
		nl: 'Winter-/ijsvrij-modus beëindigd — terug naar normale werking.',
		fr: 'Mode hiver / sans glace terminé — retour au fonctionnement normal.',
		it: 'Modalità invernale / anti-ghiaccio terminata — ritorno al funzionamento normale.',
		es: 'Modo invierno / sin hielo finalizado — volviendo al funcionamiento normal.',
		pl: 'Tryb zimowy / przeciwoblodzeniowy zakończony — powrót do normalnej pracy.',
		uk: 'Зимовий режим / режим проти обмерзання завершено — повернення до звичайної роботи.',
		'zh-cn': '冬季／防冰模式已结束——恢复正常运行。',
	},
	oxygenBoostStart: {
		en: 'Low dissolved oxygen — boosting aeration until it recovers.',
		de: 'Niedriger gelöster Sauerstoff — die Belüftung wird verstärkt, bis er sich erholt.',
		ru: 'Низкий уровень растворённого кислорода — аэрация усиливается до восстановления.',
		pt: 'Oxigénio dissolvido baixo — a reforçar o arejamento até recuperar.',
		nl: 'Laag opgelost zuurstofgehalte — de beluchting wordt versterkt tot het herstelt.',
		fr: "Oxygène dissous faible — renforcement de l'aération jusqu'à sa récupération.",
		it: 'Ossigeno disciolto basso — aerazione potenziata fino al recupero.',
		es: 'Oxígeno disuelto bajo — aumentando la aireación hasta que se recupere.',
		pl: 'Niski poziom tlenu rozpuszczonego — zwiększanie napowietrzania do czasu poprawy.',
		uk: 'Низький рівень розчиненого кисню — аерація посилюється до відновлення.',
		'zh-cn': '溶解氧偏低——加强增氧直至恢复。',
	},
	oxygenBoostEnd: {
		en: 'Dissolved oxygen recovered — ending the oxygen boost.',
		de: 'Gelöster Sauerstoff erholt — der Sauerstoff-Boost wird beendet.',
		ru: 'Растворённый кислород восстановлен — усиление аэрации завершено.',
		pt: 'Oxigénio dissolvido recuperado — a terminar o reforço de oxigénio.',
		nl: 'Opgelost zuurstofgehalte hersteld — de zuurstofboost wordt beëindigd.',
		fr: "Oxygène dissous rétabli — fin du renforcement d'oxygène.",
		it: "Ossigeno disciolto recuperato — fine del potenziamento dell'ossigeno.",
		es: 'Oxígeno disuelto recuperado — finalizando el refuerzo de oxígeno.',
		pl: 'Poziom tlenu rozpuszczonego przywrócony — zakończenie zwiększonego napowietrzania.',
		uk: 'Розчинений кисень відновлено — завершення посиленої аерації.',
		'zh-cn': '溶解氧已恢复——结束增氧提升。',
	},
	dryRunActive: {
		en: 'Dry-run mode is active — valve and pump commands are only logged, no hardware is switched.',
		de: 'Testlauf-Modus aktiv — Ventil- und Pumpenbefehle werden nur protokolliert, es wird keine Hardware geschaltet.',
		ru: 'Режим холостого прогона активен — команды клапанов и насосов только записываются в журнал, оборудование не переключается.',
		pt: 'Modo de simulação ativo — os comandos de válvula e bomba são apenas registados, nenhum equipamento é acionado.',
		nl: 'Testmodus (dry-run) actief — klep- en pompopdrachten worden alleen gelogd, er wordt geen hardware geschakeld.',
		fr: "Mode simulation actif — les commandes de vanne et de pompe sont seulement journalisées, aucun matériel n'est commuté.",
		it: 'Modalità di prova (dry-run) attiva — i comandi di valvole e pompe vengono solo registrati, nessun hardware viene attivato.',
		es: 'Modo de simulación activo — los comandos de válvula y bomba solo se registran, no se activa ningún hardware.',
		pl: 'Tryb testowy (dry-run) aktywny — polecenia zaworów i pomp są tylko zapisywane w dzienniku, sprzęt nie jest przełączany.',
		uk: 'Режим тестового прогону активний — команди клапанів і насосів лише записуються в журнал, обладнання не перемикається.',
		'zh-cn': '试运行模式已激活——阀门和泵指令仅记录日志，不会切换任何硬件。',
	},
	notifyInterlockTripped: {
		en: 'Pond aeration: safety interlock tripped — {reason}',
		de: 'Teichbelüftung: Sicherheitsverriegelung ausgelöst — {reason}',
		ru: 'Аэрация пруда: сработала защитная блокировка — {reason}',
		pt: 'Arejamento de lago: bloqueio de segurança acionado — {reason}',
		nl: 'Vijverbeluchting: veiligheidsvergrendeling geactiveerd — {reason}',
		fr: "Aération d'étang : verrouillage de sécurité déclenché — {reason}",
		it: 'Aerazione del laghetto: interblocco di sicurezza attivato — {reason}',
		es: 'Aireación de estanque: enclavamiento de seguridad activado — {reason}',
		pl: 'Napowietrzanie stawu: zadziałała blokada bezpieczeństwa — {reason}',
		uk: 'Аерація ставка: спрацювало запобіжне блокування — {reason}',
		'zh-cn': '池塘增氧：安全联锁已触发——{reason}',
	},
	notifyInterlockCleared: {
		en: 'Pond aeration: safety interlock cleared, back to normal operation.',
		de: 'Teichbelüftung: Sicherheitsverriegelung aufgehoben, zurück zum Normalbetrieb.',
		ru: 'Аэрация пруда: защитная блокировка снята, возврат к нормальной работе.',
		pt: 'Arejamento de lago: bloqueio de segurança removido, de volta ao funcionamento normal.',
		nl: 'Vijverbeluchting: veiligheidsvergrendeling opgeheven, terug naar normale werking.',
		fr: "Aération d'étang : verrouillage de sécurité levé, retour au fonctionnement normal.",
		it: 'Aerazione del laghetto: interblocco di sicurezza rimosso, ritorno al funzionamento normale.',
		es: 'Aireación de estanque: enclavamiento de seguridad liberado, vuelta al funcionamiento normal.',
		pl: 'Napowietrzanie stawu: blokada bezpieczeństwa zwolniona, powrót do normalnej pracy.',
		uk: 'Аерація ставка: запобіжне блокування знято, повернення до звичайної роботи.',
		'zh-cn': '池塘增氧：安全联锁已解除，恢复正常运行。',
	},
	notifyOxygenLow: {
		en: 'Pond aeration: low dissolved oxygen {value} mg/L (below {threshold} mg/L).',
		de: 'Teichbelüftung: niedriger gelöster Sauerstoff {value} mg/L (unter {threshold} mg/L).',
		ru: 'Аэрация пруда: низкий уровень растворённого кислорода {value} мг/л (ниже {threshold} мг/л).',
		pt: 'Arejamento de lago: oxigénio dissolvido baixo {value} mg/L (abaixo de {threshold} mg/L).',
		nl: 'Vijverbeluchting: laag opgelost zuurstofgehalte {value} mg/L (onder {threshold} mg/L).',
		fr: "Aération d'étang : oxygène dissous faible {value} mg/L (en dessous de {threshold} mg/L).",
		it: 'Aerazione del laghetto: ossigeno disciolto basso {value} mg/L (sotto {threshold} mg/L).',
		es: 'Aireación de estanque: oxígeno disuelto bajo {value} mg/L (por debajo de {threshold} mg/L).',
		pl: 'Napowietrzanie stawu: niski poziom tlenu rozpuszczonego {value} mg/L (poniżej {threshold} mg/L).',
		uk: 'Аерація ставка: низький рівень розчиненого кисню {value} мг/л (нижче {threshold} мг/л).',
		'zh-cn': '池塘增氧：溶解氧偏低 {value} mg/L（低于 {threshold} mg/L）。',
	},
	notifyOxygenRecovered: {
		en: 'Pond aeration: dissolved oxygen recovered to {value} mg/L.',
		de: 'Teichbelüftung: gelöster Sauerstoff auf {value} mg/L erholt.',
		ru: 'Аэрация пруда: растворённый кислород восстановился до {value} мг/л.',
		pt: 'Arejamento de lago: oxigénio dissolvido recuperou para {value} mg/L.',
		nl: 'Vijverbeluchting: opgelost zuurstofgehalte hersteld tot {value} mg/L.',
		fr: "Aération d'étang : oxygène dissous rétabli à {value} mg/L.",
		it: 'Aerazione del laghetto: ossigeno disciolto recuperato a {value} mg/L.',
		es: 'Aireación de estanque: oxígeno disuelto recuperado a {value} mg/L.',
		pl: 'Napowietrzanie stawu: poziom tlenu rozpuszczonego wzrósł do {value} mg/L.',
		uk: 'Аерація ставка: розчинений кисень відновився до {value} мг/л.',
		'zh-cn': '池塘增氧：溶解氧已恢复至 {value} mg/L。',
	},
	notifyPressureAlarm: {
		en: 'Pond aeration: system pressure {value} bar is out of the configured range.',
		de: 'Teichbelüftung: Systemdruck {value} bar liegt außerhalb des konfigurierten Bereichs.',
		ru: 'Аэрация пруда: давление в системе {value} бар вне заданного диапазона.',
		pt: 'Arejamento de lago: a pressão do sistema {value} bar está fora do intervalo configurado.',
		nl: 'Vijverbeluchting: systeemdruk {value} bar valt buiten het geconfigureerde bereik.',
		fr: "Aération d'étang : la pression du système {value} bar est hors de la plage configurée.",
		it: "Aerazione del laghetto: la pressione del sistema {value} bar è fuori dall'intervallo configurato.",
		es: 'Aireación de estanque: la presión del sistema {value} bar está fuera del rango configurado.',
		pl: 'Napowietrzanie stawu: ciśnienie w systemie {value} bar jest poza skonfigurowanym zakresem.',
		uk: 'Аерація ставка: тиск у системі {value} бар поза заданим діапазоном.',
		'zh-cn': '池塘增氧：系统压力 {value} bar 超出配置范围。',
	},
	notifyPressureCleared: {
		en: 'Pond aeration: system pressure is back within range.',
		de: 'Teichbelüftung: Systemdruck ist wieder im zulässigen Bereich.',
		ru: 'Аэрация пруда: давление в системе снова в пределах диапазона.',
		pt: 'Arejamento de lago: a pressão do sistema voltou ao intervalo normal.',
		nl: 'Vijverbeluchting: systeemdruk is weer binnen het bereik.',
		fr: "Aération d'étang : la pression du système est de nouveau dans la plage.",
		it: "Aerazione del laghetto: la pressione del sistema è di nuovo nell'intervallo.",
		es: 'Aireación de estanque: la presión del sistema ha vuelto al rango.',
		pl: 'Napowietrzanie stawu: ciśnienie w systemie wróciło do zakresu.',
		uk: 'Аерація ставка: тиск у системі знову в межах діапазону.',
		'zh-cn': '池塘增氧：系统压力已恢复至正常范围。',
	},
};

/** All languages ioBroker offers for system.config.common.language. */
const SUPPORTED_LANGUAGES = ['en', 'de', 'ru', 'pt', 'nl', 'fr', 'it', 'es', 'pl', 'uk', 'zh-cn'];

/** Language used when the system language is unset or not supported. */
const DEFAULT_LANGUAGE = 'en';

/**
 * Translate a message key into the requested language and fill in any `{placeholder}`
 * tokens. Falls back to English (and finally to the raw key) when a translation is missing.
 *
 * @param {string} key - message key from {@link MESSAGES}
 * @param {string} [lang] - target language code (e.g. "de")
 * @param {Record<string, string | number>} [params] - placeholder values
 * @returns {string} the localized, interpolated message
 */
function translate(key, lang, params) {
	const entry = MESSAGES[key];
	if (!entry) {
		return key;
	}
	let text = (lang && entry[lang]) || entry[DEFAULT_LANGUAGE] || key;
	if (params) {
		for (const name of Object.keys(params)) {
			text = text.split(`{${name}}`).join(String(params[name]));
		}
	}
	return text;
}

module.exports = { MESSAGES, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, translate };
