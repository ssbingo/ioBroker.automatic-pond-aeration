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
