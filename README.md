// [2026-10-18] - MASTER SYNC: Erinnerungs-Historie (Audit-Trail: reminderSentBy/reminderAction, Mitternachts-Cutoff vs. überfällige Aufgaben), persönliches Einsatz-Highlighting im Kalender/Spielplan/Dienste (🏓, 🚗, 📋, ☕) sowie Reminders-Submodule im Datei-Lexikon ergänzt.
// [2026-10-18] - MASTER SYNC: Vollständiger Ist-Abgleich mit dem Quellcode (Tech-Stack Versionen, 4-Wege-Zuweisung, Magic-Link Auth, RBAC-Rechte inkl. viewJugend/viewAllReminders/manageMitglieder, alle 12 Collections, Jugend-Firewall und exaktes Datei-Lexikon in TEIL 8 aktualisiert).
// [2026-10-17] - MASTER SYNC: Ghost-Data Prävention, Explicit Empty Array Rule und dynamische Team-Referenzierung via SmartEntityPicker dokumentiert.
// [2026-10-17] - MASTER SYNC: Firebase Early-Return-Pattern (Free-Tier Quoten-Schutz) und Listener-Cleanup beim Logout für Offline-First-Fähigkeit dokumentiert.
// [2026-10-15] - MASTER SYNC: Backup & Restore System (JSON-Export, Wipe/Merge, 12:00-Uhr Reminder) dokumentiert.
// [2026-10-14] - MASTER SYNC: Vollständiger Abgleich des Datei-Baums (TEIL 8) mit PAPA_MASTER_MANIFEST.md. Dashboard-Widgets, Event-Polls, Match-Lineup-Matrizen und Store-Slices vollständig dokumentiert.
// [2026-09-28] - MASTER SYNC: Datei-Baum (TEIL 8) exakt mit PAPA_MASTER_MANIFEST synchronisiert (Fehlende Modale, Tabs, HelpView und DashboardView ergänzt).
// [2026-09-28] - MASTER SYNC: Modul 'Aufstellungsplanung' (Base & Override, Lineup Matrix, WhatsApp-Kader) in Architektur & Datei-Baum dokumentiert.
// [2026-07-23] - MASTER SYNC: DSGVO Clickwrap, Nutzer-Self-Service (Mein Profil) und Auto-Benachrichtigungen für Stammdaten-Updates dokumentiert.
// [2026-07-22] - MASTER SYNC: DSGVO Passiv-Mitglieder-Firewall (gebunden an viewEhrungen) reaktiv im Store implementiert und dokumentiert.
// [2026-06-11] - MASTER SYNC: Domain-Language geklärt. Definition von 'App-Nutzer' (users) und 'Mitglieder & Helfer' (helpers) in TEIL 6 hinzugefügt, um eine saubere Trennung der UX/UI Ansichten (Dashboard) zu garantieren.
// [2026-06-11] - MASTER SYNC: Architektur-Manifest aktualisiert. Data-Dictionary in TEIL 6 hinzugefügt, um relationale Schlüssel (seriesId, baseItemId, parentItemId, eventId) für zukünftige KI-Assistenten glasklar zu definieren.
// [2026-06-11] - MASTER SYNC: Architektur-Manifest aktualisiert. Fate-Binding (isHistorical) an der korrekten Stelle (TEIL 3) integriert und vollständiges Feld-Lexikon sowie Lebenszyklus ergänzt.
// [2026-06-03] - MASTER SYNC: Architektur-Manifest aktualisiert. "Container-Swap-Prinzip" verbindlich formuliert.
// [2026-06-01] - MASTER SYNC: Architektur-Manifest aktualisiert. WhatsApp-Narrensicherung (Poka-Yoke für externe Helfer), Container-Wächter (100% Warnung bei offenen Unterpunkten) und Volltextsuche-Highlighting dokumentiert.
// [2026-05-29] - MASTER SYNC: Event-Blutlinie (seriesId) dokumentiert. Projekt-Titel sind nun mutierbar, da die Historie über die seriesId absolut stabil bleibt. UX-Architektur (Protokoll-Schnellzugriff) ergänzt.
// [2026-05-26] - MASTER SYNC: Architektur-Manifest aktualisiert. Blutlinien-Logik, Enddatum-Sicherung, Firewall & RollenTab (Kontext-Erhalt & Filter) dokumentiert. Ohne Verlust alter Power-Feature-Einträge.
// [2026-05-25] - MASTER SYNC: Architektur-Manifest aktualisiert. Container-Prinzip, Klon-Logik (Vererbung vs. Neu) & Anti-Flooding für Routinen strikt definiert.
// 2026-05-14 13:45 - MASTER SYNC: Philosophie-Manifest, Power-Features (Trash, Inline, Smart-Sorting) & vollst. Datei-Baum integriert.
# PapaToDo 🎯 - Der digitale Vereins- & Vorstands-Assistent

Eine Serverless Progressive Web App (PWA), entwickelt mit React, TypeScript, TailwindCSS und Firebase. PapaToDo löst das "Protokoll-Dilemma" in Vereinen durch fließende Agenden, Kanban-Boards und eine strikte Participation-First Firewall.

---

## 🤖 TEIL 1: STRICT AI / LLM INSTRUCTIONS (SYSTEM PROMPT)

> **MANDATORY READING FOR ANY AI ASSISTANT MODIFYING THIS CODEBASE**
> You act as a strict, surgical "Code-Surgeon". Your primary directive is stability, strict scoping, and architectural integrity. 

### 1. The "Hard-Handshake" Protocol (NO BLIND FLIGHT)
* **Never guess code.** Never assume you know what a file looks like based on context.
* Before modifying *any* file, you MUST explicitly fetch it (e.g., via `File Fetcher` or equivalent tool).
* If the target file is not in your current context window, you MUST REFUSE the modification and state: *"Fehler: Patient fehlt. Bitte lade die Datei X hoch."*

### 2. Zero-Loss & Zero-Build-Error Output
* **Full File Output Only:** Never output partial code blocks with placeholders like `// ... rest of code`. You must output the ENTIRE file from line 1 to the end.
* **Top/Bottom Markers:** 
  * Add a comment at line 1: `// [YYYY-MM-DD] - [Reason for change]`
  * Add at the very end: `// --- END OF FILE ---`
* **Vercel / TS strictness:** Do not introduce implicitly typed variables (`any`). Handle undefined/null checks strictly.

### 3. Architectural Integrity
* **State Management (SSOT):** `useClubStore.ts` is the Single Source of Truth. No local state mutations that bypass the store. UI components ONLY trigger store actions.
* **Separation of Concerns:** Business logic lives in the store. Presentation logic lives in the React components. Do not mix them.
* **Firebase / Firestore Listeners (Quoten-Schutz):** Nutze zwingend das Early-Return-Muster in allen Slices (`if (get().unsubX) return;`), um redundante `onSnapshot`-Verbindungen und Free-Tier Überlastung zu blockieren. Beim Logout MÜSSEN alle `unsub`-Variablen im Store explizit auf `null` gesetzt werden, damit der Offline-Cache und der Re-Login fehlerfrei greifen.
* **Frictionless UI / Contextual Navigation:** 
  * Auto-focus inputs in modals.
  * Double-click to edit rows.
  * Use deep links and auto-scroll (`scrollIntoView`) when routing from Dashboard/Kanban back to a specific Agenda Item.

### 4. Data Schema & Firestore Migration Protocol
* The core types are defined in `src/core/types/models.ts`.
* **CRITICAL:** If you add a new field to a data model, it MUST be optional (`?`). 
* If a new field requires a database migration script, you must STOP and warn the user. 
* NEVER rename existing database fields. Add new ones and deprecate old ones if absolutely necessary.
* **Explicit Empty Array Rule (Ghost-Data Prevention):** Arrays (wie Empfänger-Listen oder Team-IDs) dürfen niemals als `undefined` an Firestore übergeben werden. Leere oder abgewählte Felder müssen zwingend als leeres Array (`[]`) übergeben werden, damit Firebase alte Werte restlos überschreibt.
* **Dynamic Team Reference:** Team-Auswahlen im `SmartEntityPicker` erfolgen als reine Team-ID-Referenzen. Es finden keine statischen Kader-Snapshots in die Helfer-IDs (`helperIds`) statt; die Auflösung erfolgt dynamisch zur Laufzeit.

---

## 🎨 UX & UI Design Guidelines (Strictly Follow!)

* **No UI-Clutter:** Keep the interface clean. Avoid unnecessary borders or heavy backgrounds. Use subtle shades (`bg-gray-50`, `bg-blue-50/50`) to group elements visually.
* **UI-Persistenz (Langzeitgedächtnis):** Filter- und Ansichtseinstellungen (z.B. ausgewählte Teams im Spielplan oder Dienstkategorien) MÜSSEN via `localStorage` gespeichert werden, damit der Nutzer seine Konfiguration nach einem App-Neustart nicht verliert.
* **Responsive First:** The app is used on mobile phones (during events) and on Desktop (for protocolling). 
  * Hide heavy tables on mobile.
  * Use `lg:flex` and `landscape:` media queries to optimize screen real estate.
* **Clear Interactive States:** Hover effects (`hover:bg-gray-100`), focus rings (`focus:ring-2`), and transition animations (`transition-all`, `animate-in`) are mandatory for buttons and interactive rows.
* **Color Psychology:**
  * **Blue/Indigo:** Standard actions, agenda items, primary info.
  * **Emerald/Green:** Completed tasks, confirmations, success.
  * **Amber/Orange:** Warnings, snoozed items, pending items.
  * **Red/Rose:** Destructive actions (Trash), highly overdue items.

---

## 🚀 TEIL 2: Projektübersicht & Tech-Stack

PapaToDo verwandelt statische PDF-Protokolle in dynamische Kanban-Workflows. 

**Technologien:**
* **Frontend:** React 19, TypeScript (~5.9), TailwindCSS 4.
* **Build-Tool:** Vite 8 (inkl. `vite-plugin-pwa`).
* **State-Management:** Zustand v5 (persistiert via LocalStorage).
* **Backend (Serverless):** Firebase v12 (Firestore, Auth inkl. E-Mail/Passwort & Magic-Link).
* **Hosting/Deployment:** Vercel (CI/CD Pipeline).
* **Routing:** React Router v7 (`react-router-dom`).
* **Icons & UI-Helfer:** Lucide React, `@dnd-kit/core`, `date-fns`, `fuse.js`, `ical.js`, `react-big-calendar`, `leaflet` / `react-leaflet`.

---

## 🧭 TEIL 3: Die PapaToDo-Philosophie (Mindset)

Das System basiert nicht auf endlosen ToDo-Listen, sondern auf einem klaren Rhythmus (Events). Um Chaos zu vermeiden, gelten diese Leitplanken:

1. **Der Meeting-Rhythmus (Ein endloser Kreislauf):** 
   - *Vor der Sitzung:* Die lebende Agenda dient der Vorbereitung. **Wichtig:** Offene ToDos aus alten Sitzungen (Vererbte Punkte) sind hier sofort sichtbar. Neu angelegte Punkte (Entwürfe) bleiben im ToDo-Board unsichtbar, bis die Agenda offiziell veröffentlicht wird.
   - *Während der Sitzung:* Live-Protokollierung.
   - *Nach der Sitzung:* Das versiegelte Protokoll dient als unveränderliches Archiv. Dank UX-Schnellzugriff ("📜 Protokolle") sind alte Sitzungen direkt aus dem Dashboard oder der Kachel-Ansicht über Dropdowns erreichbar.
   - *Der nahtlose Neustart:* Beim Schließen wird das nächste Meeting generiert und alle offenen Themen automatisch migriert.
2. **Die Agenda ist der Herzschlag (Werkzeuge):**
   - **Agenda-Punkt (A):** Gemeinsam arbeiten & debattieren.
   - **Info-Punkt (I):** Wissen teilen (Zum Nachlesen oder Berichtspflicht).
   - **Beschluss (B):** Ergebnisse verbindlich fixieren.
   - **Aufgabe (✓):** Aktives Handeln zwischen Sitzungen (Achtung: Task-Inflation vermeiden).
3. **Ein Thema = Ein Punkt:** Titel für das absolute Kern-Thema (scannbar), Beschreibung für die Details & Notizen.
4. **DAS ARCHITEKTUR-KONZEPT (Fate-Binding & isHistorical):** Um die Revisionssicherheit zu garantieren, nutzen wir ein striktes Fate-Binding für Aufgaben. Ein abgeschlossenes Protokoll verändert sich niemals.
   
   **Das Begriffs-Lexikon (Die Bausteine)**
   * **Die Standard-Aufgabe:** Ein simpler, einmaliger Punkt.
   * **Die Routine (`isRoutine = true`):** Ein Punkt, der den zwingenden Befehl hat: "Wenn ich auf 100 % gesetzt werde, erschaffe ich sofort einen Klon von mir für die Zukunft."
   * **Der Container (`isSubItem = false` mit Kindern):** Ein Oberpunkt, der andere Aufgaben (`isSubItem = true`) bündelt.
   * **Die Container-Routine (Der "Boss"):** Ein Oberpunkt, der eine Routine ist. **Eiserne Regel:** Die Kinder erben das Schicksal des Bosses.
   * **Das Feld `isHistorical` (Die Versiegelung):**
     * `false`: Das Item ist "live" und aktiv.
     * `true`: Das Item ist eingefroren in der Vergangenheit. Es wird in aktiven Ansichten (Dashboard, aktuelles Protokoll) komplett ausgeblendet, bleibt aber in der Datenbank als unveränderlicher Beweis für alte Protokolle erhalten.

   **Der Lebenszyklus (Wann passiert was?)**
   * **Szenario A: Die Standard-Aufgabe (Keine Routine, kein Container)**
     * *Live in der Sitzung:* Slider frei beweglich (0 % - 100 %). Nichts klont sich. `isHistorical` bleibt `false`.
     * *Beim Sitzungsabschluss (Versiegelung):*
       * Aufgabe ist 100 %: Sie bekommt `isHistorical = true` und bleibt im alten Protokoll. Fertig.
       * Aufgabe ist < 100 %: Sie bekommt `isHistorical = true` (als Beweis, dass sie damals nicht fertig wurde) **UND** das System erzeugt einen sauberen, frischen Klon (Übertrag) für das neue Meeting.
   * **Szenario B: Die Einfache Routine (Kein Container)**
     * *Live in der Sitzung:* Sobald der Slider 100 % erreicht, passiert der **Point of No Return**:
       1. Die Routine erschafft sofort ihren Zukunfts-Klon (`isHistorical = false`, 0 %).
       2. Die *alte* 100 %-Aufgabe bekommt **sofort live** den Stempel `isHistorical = true` und verschwindet aus der aktuellen Ansicht.
   * **Szenario C: Die Container-Routine (Der Boss mit seinen Unterpunkten)**
     * *Live in der Sitzung:* Sobald der Boss 100 % erreicht, greift das radikale Fate-Binding:
       1. Der Boss erschafft sofort einen Zukunfts-Klon von sich **UND allen seinen Kindern** (`isHistorical = false`, alles auf 0 %).
       2. Der *alte* Boss UND alle *alten* Kinder (egal ob diese auf 0 % oder 100 % standen) bekommen **sofort live** den Stempel `isHistorical = true`. Die gesamte alte Familie ist versiegelt. Waisenkinder sind unmöglich.
   * **Szenario D: Der Standard-Container (Keine Routine)**
     * *Live in der Sitzung:* Slider frei beweglich.
     * *Beim Sitzungsabschluss (Versiegelung):* Boss und Kinder werden isoliert betrachtet. Alles auf 100 % bleibt versiegelt (`isHistorical = true`) zurück. Alles < 100 % wird versiegelt zurückgelassen UND als Klon ins neue Meeting übertragen.

---

## 💡 TEIL 4: Kernfunktionen & Workflow

### 1. Das fließende Protokoll & Klon-Logik
Punkte auf der Agenda wechseln fließend ihren Zustand. Ein `INFO`-Punkt kann per Dropdown zu einer `AUFGABE` werden.
*Wenn ein Event abgeschlossen wird, greift die Container-Klon-Logik:*
* Es werden alle offenen/unfertigen AUFGABEN in das nächste Meeting kopiert ("Weiterarbeiten"). Ihr Fortschritt (z.B. 50%) bleibt erhalten.
* Es werden alle INFO/AGENDA-Punkte kopiert, *sofern* sie als Routine markiert sind ("Neuer Zyklus").
* **Waisen-Schutz:** Beim Klonen eines Oberpunkts werden *alle* dazugehörigen Unterpunkte (auch die bereits erledigten!) zwingend mitkopiert, damit der Fortschrittsbalken und Kontext des Containers im neuen Meeting intakt bleibt.
* **Blutlinien-Logik (`baseItemId` & `seriesId`):** Siehe TEIL 6 (Datenmodell).
* **Müllabfuhr:** Beim Schließen eines Protokolls werden `TRASH`-Elemente konsequent ignoriert. Sie blockieren nicht den Abschluss der Sitzung.

### 2. Routine-Aufgaben & Anti-Flooding (`isRoutine`)
Wiederkehrende Aufgaben (z.B. "Kasse prüfen wöchentlich") blähen die Datenbank nicht künstlich auf. 
* **Kein Flooding:** Die Aufgabe existiert in der aktiven ToDo-Liste *immer nur einmal* als offener Punkt.
* **Auto-Respawn:** Wird die Aufgabe auf 100% (Erledigt) gesetzt, friert sie für die Historie ein. Das System erzeugt im Hintergrund *sofort* einen neuen Klon für das nächste Intervall. (Dies verhindert, dass bei 3 Monaten Meeting-Pause plötzlich Dutzende identische ToDos entstehen).
* **Beim Protokoll-Abschluss:** 
  * Ist die Routine-Aufgabe noch *unerledigt*, wandert sie normal ins neue Protokoll. 
  * Ist sie bereits *erledigt*, ignoriert das Skript sie (da der Klon für die Zukunft ja schon existiert).
  * **Enddatum-Sicherung:** Wenn das `routineEndDate` überschritten ist, stoppt der Respawn. Wichtig: Die Routine verschwindet erst aus der UI, wenn auch die allerletzte noch offene Aufgabe dieser Blutlinie wirklich als erledigt abgehakt wurde (kein Verschwinden von Altlasten!).

### 3. Aufgaben & 4-Wege-Zuweisung (`SmartEntityPicker`)
Aufgaben, Termine, Dienste und Team-PINs können über den `SmartEntityPicker` flexibel an vier Dimensionen zugewiesen werden:
1. **App-Nutzer (`userIds`):** Direkte Zuweisung an eine verantwortliche Person im Vorstand/Leitungsteam.
2. **Amt / Gruppe (`groupIds`):** Funktionale Zuweisung an ein Gremium (z.B. "Festausschuss").
3. **Mannschaft / Team (`teamIds`):** Dynamische Referenz auf ein Team (z.B. "Herren I") oder virtuelle Struktur-Filter (`vgroup-all`, `vgroup-aktiv`, `vgroup-passiv`, `vgroup-jugend`).
4. **Mitglied / Helfer (`helperIds`):** Direkte Zuweisung einzelner Vereinsmitglieder oder externer Helfer (z.B. für Dienste).

### 4. Participation-First Firewall (Security & "Least-to-know")
Benutzer sehen nur, was sie betrifft.
* Auf dem **Dashboard**, dem **Kanban-Board** und im **Vereinskalender** sehen Nutzer nur Aufgaben und Events, denen sie direkt oder über ihre Gruppe/ihr Amt/ihr Team zugewiesen sind.
* Interne Vorstandsprotokolle bleiben für Helfer völlig unsichtbar. Der **Access Control Guard** blockiert direkte URL-Aufrufe rigoros, wenn der User nicht Teilnehmer oder Admin ist.

### 5. WhatsApp Erinnerungs-Zentrale, Historie & Poka-Yoke
Kein automatischer E-Mail-Spam! Der User (z.B. der Vorstand) versendet Erinnerungen (an Aufgaben, Sitzungen, Spiele oder Dienste) proaktiv per WhatsApp-Deep-Link über die Reminders-Ansicht. 
* Aufgaben und Termine können mit Vorlaufzeiten (`reminderLeadDays`) versehen werden.
* Ist ein Empfänger nicht greifbar, kann die Erinnerung via **Snooze-Button** tageweise auf Wiedervorlage geschoben werden.
* **Strikte Mitternachts-Schranke vs. Überfällige Aufgaben:** Vergangene Termine, Spiele und Sitzungen verschwinden ab Mitternacht automatisch aus der aktiven Zentrale (und dem Navigations-Badge in `AppLayout`), während **unerledigte Aufgaben (`AUFGABE`)** bewusst auch nach Überschreiten der Deadline als überfällige Mahnung aktiv bleiben, bis sie erledigt oder verworfen werden.
* **Audit-Trail & Historien-Modus:** Beim Versenden oder Verwerfen einer Erinnerung wird ein Audit-Trail (`reminderSentAt`, `reminderSentBy`, `reminderAction: 'SENT' | 'DISMISSED'`) gespeichert. Über den **Historien-Umschalter** (inkl. einstellbarem Rückblick-Zeitraum in Tagen via `localStorage`) lassen sich erledigte/verworfene Erinnerungen samt Bearbeiter und Zeitstempel einsehen und bei Bedarf mit einem Klick („Wieder aktivieren“) zurück in die aktive Liste holen.
* **WhatsApp-Narrensicherung (Poka-Yoke):** Externe Betreuer (ohne App-Account) besitzen kein eigenes Dashboard. Weist man einem solchen "echten" Externen eine Aufgabe zu, aktiviert das System im Formular *automatisch* die WhatsApp-Erinnerung und trägt den Autor als Versender ein. So wird das Kommunikations-Vakuum sicher verhindert.

### 6. Wettkampf-Tresor (Team-PINs)
Sichere Ablage von Passwörtern, Zugangscodes, Spielberichts-PINs oder Ranglisten-Links (`rankingUrl`). Der Zugriff ist an strikte Berechtigungen gekoppelt (`viewTeamPins` / `manageTeamPins` sowie zugewiesene Nutzer, Gruppen, Teams oder Helfer).

### 7. Externe Kalender (ICS) & Aufstellungsplanung (Base & Override)
PapaToDo kann externe Kalender (z.B. myTischtennis, BFV oder Google) abonnieren. An diese importierten Termine (z.B. ein Auswärtsspiel) können dann intern "Dienste" (z.B. Fahren, Betreuer) angehängt und Personen zugewiesen werden.
*   **Base & Override Aufstellung:** Für verknüpfte Kalender-Abos können Team-Captains (`captainHelperIds`) eine Matrix öffnen ("Saison planen"). Das System nutzt den im Team hinterlegten Stammkader (`defaultLineupHelperIds` als "Base") und erlaubt dem Captain, pro Spieltag per Klick Verfügbarkeiten (`availabilities`), Abweichungen, Logistik (`betreuerHelperIds`, `fahrerHelperIds`, `departureTime`) oder Sperren (`isLocked`, `lineupFreezeLeadDays`) als Schatten-Akte (`match_lineups`) zu speichern.
*   **Live-Integration:** Die berechnete finale Aufstellung wird automatisch in der Termin-Detailansicht für die Spieler angezeigt und bei aktivierten WhatsApp-Erinnerungen nahtlos an den Info-Text angehängt. Der öffentliche Kalender bleibt aus DSGVO-Gründen für Gäste (ohne Login) von diesen Aufstellungen isoliert.
*   **Persönliches Einsatz-Highlighting:** Im **Spielplan (`CalendarAgendaView`)**, in der **Dienste- & Terminliste (`CalendarListView`)** sowie in der **Monats-/Wochen-/Tagesansicht (`CalendarView`)** werden Tage und Begegnungen, bei denen der eingeloggte Nutzer selbst eingeteilt ist (`useCalendarEvents.ts`), automatisch in Smaragdgrün hervorgehoben und mit kompakten Rollen-Symbolen direkt hinter dem Titel (`🏓` Spieler, `🚗` Fahrer, `📋` Betreuer, `☕` Vereinsdienst) markiert – ohne das Tabellen- oder Karten-Layout zu verschieben.

### 8. Soft-Delete (Trash) & Papierkorb-Management
Gelöschte Elemente (Agenda-Punkte, Aufgaben) werden nicht physisch aus der Datenbank entfernt, sondern erhalten den Status `TRASH` und einen `deletedAt` Zeitstempel. Sie werden in der regulären Agenda und im Kanban-Board ausgeblendet, können aber von Administratoren über die `OrphanCleanupModal` wiederhergestellt oder endgültig (hard-delete) bereinigt werden.

### 9. Desktop Power-Features (Kontextmenü & Inline-Editoren)
Für ein blitzschnelles Arbeiten am Desktop wurden Power-Features integriert:
* **Native Rechtsklick-Kontextmenüs (`RowContextMenu`):** Erlaubt die Bearbeitung, Positionierung und das Einfügen neuer Zeilen ohne Mauswege.
* **Inline-Editoren (`InlineEditors`):** Bearbeitung von Titeln, Beschreibungen und Dauer direkt in der Liste.
* **Volltext- & Ähnlichkeitssuche:** Ein globales Suchfeld im Agenda-Header filtert den Baum in Echtzeit. Treffer in Titeln oder Notizen (`RichText`) werden visuell gelb (`<mark>`) hervorgehoben.
* **Safe-Edit Fokus-Schutz:** Eine komplexe Interceptor-Logik verhindert den Fokus-Klau und Datenüberschreibungen zwischen Inline-Editoren (onBlur-Speichern) und Modal-Overlays.
* **Smart-Sorting & Sub-Item Drag&Drop:** Neu angelegte Punkte erhalten strikt die `protocolIndex = max + 1` und fügen sich nahtlos in die Hierarchie ein. Unterpunkte sind vollständig drag-and-drop-fähig.

### 10. Mitglieder-Self-Service, Magic-Link & Stammdaten
* **Passwortloser Login (Magic-Link) & E-Mail-Auth:** Nutzer können sich klassisch per E-Mail/Passwort oder passwortlos per E-Mail-Magic-Link (`sendMagicLink`) anmelden, sofern ihre E-Mail-Adresse in der Vorstands- (`users`) oder Mitgliederliste (`helpers`) hinterlegt ist.
* **"Mein Profil" (Self-Service):** Mitglieder können ihre Kontaktdaten (Telefon, Adresse, E-Mail der Eltern, etc.) sowie ihre DSGVO-Einstellungen jederzeit selbstständig in der App aktualisieren.
* **Transparenz nach Art. 15 DSGVO:** Nutzer haben jederzeit vollen Lese-Zugriff auf die vom Verein über sie gespeicherten Stammdaten (Name, App-Alias, Mitgliedsstatus, Geburts- und Eintrittsdatum).
* **Auto-Benachrichtigungen:** Ändert ein Mitglied seine Kontaktdaten im Self-Service, generiert das System automatisch eine In-App-Erinnerung (Aufgabe) an alle Vorstandsmitglieder (Recht: `manageMitglieder`), damit diese die Daten in externen Systemen (Kasse, DTTB) synchronisieren können.
* **Login-Sicherheit:** Das primäre E-Mail-Feld ist im Self-Service gesperrt (Read-Only), um die unzerstörbare Brücke zum Firebase-Authentication-Login zu garantieren.

### 11. Backup & Restore (Sicherung & Staging)
* **Vollständiger Export:** Mit einem Klick können Administratoren alle 12 Firestore-Collections (`users`, `helpers`, `groups`, `teams`, `role_profiles`, `events`, `calendar_events`, `calendar_subscriptions`, `match_lineups`, `event_poll_responses`, `agenda_items`, `team_pins`) als strukturierte `.json`-Datei exportieren (iCloud/Mac kompatibel).
* **Täglicher Reminder:** Konfigurierbare 12:00-Uhr-Erinnerung (`receiveBackupReminder`) im Dashboard, falls am aktuellen Tag noch kein Backup auf dem Gerät durchgeführt wurde.
* **Restore & Staging (2 Modi):** 
  * *Merge:* Aktualisiert und ergänzt bestehende Daten.
  * *Wipe & Replace (1:1 Spiegel):* Leert die Zieldatenbank komplett vor dem Import. Ideal, um eine Testumgebung (Staging) exakt mit den Produktivdaten zu überschreiben.
* **Auth-Brücke:** Da Benutzerzuweisungen in PapaToDo bei der Anmeldung über die E-Mail-Adresse validiert werden, funktioniert ein Datenbank-Klon auch dann nahtlos, wenn die Testumgebung völlig neue Firebase-Auth-UIDs verwendet.

---

## 🔒 TEIL 5: Berechtigungskonzept & Rollen (RBAC)

Jeder Nutzer in PapaToDo bekommt ein Rollen-Profil (`RoleProfile` in Collection `role_profiles`, z.B. "ADMIN", "Vorstand", "Bereichsleiter", "Mannschaftsführer / Trainer", "Mitglied"), welches über ein striktes Flag-System (`RolePermissions` in `src/core/types/models.ts`) abgesichert ist:

* **Ansichts-Rechte (Navigation & Module):** `viewDashboard`, `viewEvents`, `viewTasks`, `viewCalendar`, `viewUsers`, `viewReports`, `viewReminders`, `viewTemplates`.
* **Admin- & Struktur-Rechte:**
  * `viewAppUsers`: Darf App-Nutzer (`users`) sowie Rollenprofile verwalten (Schreibrecht für Rollen ist an `viewAppUsers` gekoppelt).
  * `viewRoles`: Reines Lese-Recht für die Rollen-Matrix.
  * `manageMitglieder`: Darf Mitglieder/Helfer (`helpers`) und Teams anlegen/bearbeiten, erhält Self-Service-Änderungsmeldungen und sieht alle Mitgliederstatus-Gruppen.
  * `manageEvents`: Darf Sitzungen anlegen, Agenden veröffentlichen und Protokolle schließen.
  * `manageCalendarSetup`: Darf externe ICS-Feeds abonnieren, bearbeiten und Kalender-Strukturen verwalten.
  * `viewTeamPins` / `manageTeamPins`: Steuert Lese- und Schreibzugriff auf den Wettkampf-Tresor.
  * `deleteAnyItem`: Darf beliebige Punkte/Aufgaben löschen bzw. den Papierkorb bereinigen.
* **DSGVO- & Datenschutz-Firewalls:**
  * `viewEhrungen`: Darf das Jubiläums-Radar einsehen UND fungiert (zusammen mit `manageMitglieder`) als strikte Store-Firewall für die Einsicht in Daten passiver Mitglieder (`memberStatus === 'PASSIV'`).
  * `viewJugend`: Strikte Store-Firewall (zusammen mit `manageMitglieder`) für den DSGVO-konformen Schutz von Minderjährigen-Daten (`memberStatus === 'JUGEND'`).
  * `viewAllReminders`: Erlaubt die Einsicht in alle Erinnerungen (ohne dieses Recht sieht ein Nutzer nur seine eigenen Erinnerungen).

*Nutzer ohne entsprechende Schreibberechtigungen verbleiben in der Read-Only (Leser) Ansicht.*

---

## 🗄️ TEIL 6: Datenmodell (NoSQL Firestore) & Relational Keys

Die Datenbank ist flach (flat-hierarchy) aufgebaut. Um die App-Logik (Klonen, Historie, Container) zu steuern, nutzen wir ein striktes Set an relationalen Schlüsseln (Foreign Keys).

**Domain-Language (Das Lexikon der Nutzer):**
Um Verwirrung in der UI und Logik zu vermeiden, gibt es eine strikte Trennung:
* **App-Nutzer (Collection: `users`):** Das sind die "Macher" (Vorstand, Teamleitung). Ein Nutzer ist **nur dann** ein echter "App-Nutzer", wenn er ein offizielles `amt` hat ODER über sein Profil (`roleProfileId`) administrative Rechte (z.B. `manageEvents`, `viewTasks`) besitzt. Nur sie haben Zugriff auf ToDo-Boards, erhalten ToDo-Zuweisungen (`assigneeUserIds`) und sehen Planungs-Sitzungen in ihrem Dashboard.
* **Mitglieder & Helfer (Collection: `helpers`):** Das ist die breite Vereins-Basis. Sie haben Felder wie `teamIds` oder `memberStatus`. Wenn sich ein Helfer in die App einloggt, bleibt er für das System ein "purer Helfer" (Rolle `Mitglied`). Das UI (Dashboard) blendet für diese Nutzer alle ToDo-Container und Sitzungen restlos aus, da sie weder Vorstands-ToDos abarbeiten können, noch zu internen Sitzungen geladen werden. Sie werden lediglich für Dienste, Aufstellungen oder Umfragen via `helperIds` / `teamIds` eingeteilt.

**Das Data-Dictionary (Die Beziehungs-Logik):**
* **`eventId` (Die Sitzungs-Zuordnung):** Verbindet ein `AgendaItem` mit einem `Event`. Ist dieses Feld leer (`null`/`undefined`), handelt es sich um eine freie "Backlog"-Aufgabe ohne festen Sitzungs-Kontext. Ist es gesetzt, teilt das Item den Lebenszyklus dieser Sitzung.
* **`seriesId` (Die Event-Blutlinie):** Wenn ein Event (Sitzung) abgeschlossen und für das nächste Meeting geklont wird, ändert sich seine `id`. Die `seriesId` bleibt jedoch über alle Generationen hinweg konstant (sie entspricht der `id` des allerersten Meetings der Serie). Dadurch können Projekttitel jederzeit geändert werden, ohne dass die Protokoll-Historie zerreißt.
* **`baseItemId` (Die Aufgaben-Blutlinie):** Der "Ghost-Scanner"-Schlüssel für Aufgaben und Routinen. Wird eine Aufgabe ins nächste Meeting geklont oder durch eine Routine neu erschaffen (Respawn), erhält sie zwingend eine neue `id`. Die `baseItemId` bleibt jedoch immer identisch zum Ursprungs-Item. Daran erkennen Zähler (wie `completedCount`) und Filter, dass es sich um dieselbe Aufgabenfamilie handelt, selbst wenn der Titel mutiert.
* **`isSubItem` & `parentItemId` (Die Container-Hierarchie):** Steuert die Verschachtelung. Ein Unterpunkt hat `isSubItem: true`. Seine `parentItemId` MUSS zwingend auf die *aktuelle* `id` des Oberpunkts zeigen (niemals auf dessen `baseItemId`!). Beim Klonen eines Containers erhalten Boss und Kinder neue IDs, und die `parentItemId` der Kinder wird vom Code sofort auf die neue ID des geklonten Bosses aktualisiert. Waisenkinder sind streng verboten.

**Alle 12 Firestore-Collections:**
1. `users`: App-Benutzerprofile (Vorstand/Funktionäre), verknüpft über E-Mail / Firebase Auth-ID.
2. `helpers`: Vereinsmitglieder & Helfer inkl. DSGVO-Status, Kontaktdaten, `memberStatus` und `teamIds`.
3. `groups`: Ämter & Arbeitsgruppen (z.B. "Festausschuss").
4. `teams`: Mannschaften inkl. Stammkader (`defaultLineupHelperIds`), Captains (`captainHelperIds`), Logistik-Flags und Heimhalle (`homeArenaAddress`).
5. `role_profiles`: Berechtigungs-Matrix (Templates für Nutzerrechte).
6. `events`: Sitzungen, Meetings und Projekte (Header-Daten inkl. optionaler `pollConfig`).
7. `agenda_items`: Jeder Punkt, jede Aufgabe, jeder Beschluss und jede Vorlage (`VORLAGE` / `isTemplate`) einer Sitzung (`templates` werden per Query aus `agenda_items` geladen).
8. `calendar_events`: Interne Kalender-Einträge und Dienste (inkl. optionaler `pollConfig`).
9. `calendar_subscriptions`: Abonnierte externe ICS-Feeds inkl. gecachter Events (`cachedEvents`) und Sync-Diagnose (`lastSyncedAt`, `lastSyncAttemptAt`, `lastSyncBy`, `lastSyncError`).
10. `team_pins`: Der Passwort- & Wettkampf-Tresor.
11. `match_lineups`: Schatten-Akten (Overrides) für dynamische Aufstellungs-Matrizen, Verfügbarkeiten und Fahrtdienste an Spieltagen.
12. `event_poll_responses`: Schatten-Akten für Abstimmungen und RSVP (WhatsApp-Style).

---

## 🛡️ TEIL 7: DSGVO, Datenschutz & Abgrenzung

Die App ist streng nach dem Grundsatz *Privacy by Design* und den Vorgaben der europäischen Datenschutzgrundverordnung (DSGVO) aufgebaut:

*   **Digitaler Clickwrap:** Beim ersten Login (oder nach einer Aktualisierung der Richtlinien in `src/config/dsgvoConfig.ts`) muss jeder Nutzer aktiv der App-Sichtbarkeit zustimmen oder diese ablehnen. 
*   **Lückenloser Audit-Trail:** Jede DSGVO-Entscheidung wird mit einem präzisen Zeitstempel (`consentConfirmedAt`), der Version (`dsgvoConsentVersion`) und dem Akteur (`USER` oder `ADMIN`) manipulationssicher in der Datenbank protokolliert. Zusätzlich können Papier-Einwilligungen (`hasWrittenDsgvoConsent`) und Jugend-Unbedenklichkeitsbescheinigungen (`hasYouthWorkClearance`) dokumentiert werden.
*   **Opt-In Sichtbarkeit:** Lehnt ein Nutzer die Sichtbarkeit ab, werden seine Kontaktdaten für andere einfache Nutzer strikt geschwärzt (Read-Only Firewall in `createUserSlice.ts`). Die App bleibt für ihn jedoch vollumfänglich nutzbar (den eigenen Datensatz sieht man immer ungeschwärzt).
*   **Admin-Override & Reset:** Admins können analog vorliegende (papierhafte) Zustimmungen im System erfassen oder den DSGVO-Status eines Mitglieds komplett zurücksetzen, um bei dessen nächstem Login einen neuen Clickwrap zu erzwingen.
*   **Einfacher Widerruf:** Die DSGVO-Zustimmung kann vom Nutzer jederzeit mit einem Klick über das eigene Profil widerrufen oder nachträglich erteilt werden (Art. 7 Abs. 3 DSGVO).
*   **Passiv- & Jugend-Mitglieder-Firewall:** Aus DSGVO- und Jugendschutz-Gründen werden im `useClubStore` (`createUserSlice.ts`) zwei harte Filterstufen reaktiv durchgesetzt:
    1. Passive Mitglieder (`memberStatus === 'PASSIV'`) werden komplett herausgefiltert, sofern der Nutzer weder `viewEhrungen` noch `manageMitglieder` besitzt.
    2. Jugendliche (`memberStatus === 'JUGEND'`) werden komplett herausgefiltert, sofern der Nutzer weder `viewJugend` noch `manageMitglieder` besitzt.
    Diese Filterung darf niemals in die UI-Schicht verlagert werden, um unbeabsichtigte Datenlecks zu verhindern.
*   **Ehrungen & Mitgliedsdaten:** PapaToDo ist KEINE vollumfängliche Vereinsverwaltung (dafür gibt es WISO, SPG etc.). Das Tab "Ehrungen" dient *nur* dem Jubiläums-Radar (z.B. "Wer hat dieses Jahr 25-jähriges?"), damit der Vorstand frühzeitig reagieren kann.
*   **Umgebungs-Trennung (Prod vs. Staging):** Produktiv- und Testdatenbanken werden sauber über separate Firebase-Projekte (`.env.development`, `.env.local`, `.env.production`) getrennt und können über den Backup/Restore-Service (`wipe`-Modus) gespiegelt werden.

---

## 📂 TEIL 8: Vollständiges Datei-Lexikon (Orientierung)

### Root & Infrastruktur
* `.gitignore`, `eslint.config.js`, `package.json`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `vercel.json`, `vite.config.ts`, `firestore.rules`: Standard Vite/Node, TypeScript, Firestore-Security und Vercel Deployment-Konfigurationen.
* `api/calendar.ts`: Serverless Vercel Function (Backend) für das Abonnieren und Parsen externer `.ics` Kalender-Feeds.

### Core, Config, Services & State Management (Store)
* `src/config/dsgvoConfig.ts`: Zentrale Konfiguration und Versionierung der DSGVO-Einwilligungstexte.
* `src/core/types/models.ts`: SSOT TypeScript Typendefinitionen für alle Datenmodelle.
* `src/core/types/shared.ts`: Gemeinsame Result-Wrapper-Typen (`Result<T>`, `AsyncResult<T>`).
* `src/services/firebase.ts`: Firebase & Firestore Initialisierung.
* `src/services/DataProcessor.ts`: Zentrale Firestore Lese-/Schreib-Engine inkl. `sanitizeForFirestore` und abwärtskompatibler Lazy-Schema-Migration.
* `src/services/backupService.ts`: Backup & Restore Logik für alle 12 Collections (JSON-Export, Chunked Batch-Writes, 12:00-Uhr-Reminder).
* `src/store/useClubStore.ts`: Der Master-Zustand (Zustand Store mit `persist`-Middleware).
* `src/store/slices/*`: Modulare Store-Fragmente:
  * `createAuthSlice.ts`, `createCalendarSlice.ts`, `createEventPollSlice.ts` (Abstimmungslogik), `createEventSlice.ts`, `createMatchLineupSlice.ts` (Schatten-Akten & Optimistic Updates), `createTaskSlice.ts`, `createTeamPinsSlice.ts`, `createTeamSlice.ts`, `createTemplateSlice.ts`, `createUserSlice.ts`.

### Features & UI Components

* **Admin (`src/features/Admin/`):** `OrphanCleanupModal.tsx` (Papierkorb-Verwaltung und Soft-Delete Cleanup).
* **Auth & Datenschutz (`src/features/Auth/`):** `AuthGuard.tsx`, `LoginView.tsx`, `DsgvoClickwrap.tsx`.
* **Dashboard (`src/features/Dashboard/`):** 
  * `DashboardView.tsx`, `WelcomeDashboard.tsx` (Rollenbasierte Kommandozentrale).
  * `hooks/useDashboardData.ts` (Daten-Beschaffer).
  * `components/`: `DashboardEventsWidget.tsx`, `DashboardServicesWidget.tsx`, `DashboardSessionsWidget.tsx`, `DashboardTasksWidget.tsx`.
* **Events & Kalender (`src/features/Events/`):** 
  * `CalendarView.tsx` (Haupt-Kalender-Hub inkl. Einsatz-Highlighting in der Monats-/Wochen-/Tagesansicht).
  * `components/CalendarListView.tsx` (Listen- & Agenda-Ansicht für Termine/Dienste inkl. Admin-Cockpit, SmartLogistics, Einsatz-Highlighting und LocalStorage-Persistenz).
  * `components/CalendarAgendaView.tsx` (Eigenständiger Spielplan im Karten-Look mit Sticky-Toolbar-Filter, Einsatz-Highlighting und LocalStorage-Persistenz).
  * `components/EventPollWidget.tsx` (Live-Abstimmungen in Terminen und Agenden).
  * `EventDetailView.tsx`, `ProtocolEditor.tsx`, `EventsView.tsx`, `EventAgendaList.tsx`, `EventDetailHeader.tsx`, `EventTemplateSidebar.tsx`, `PublicCalendarEmbed.tsx`.
  * Modals in `src/features/Events/`: `CalendarBulkEventModal.tsx`, `CalendarEventFormModal.tsx`, `CalendarExportModal.tsx`, `CalendarIcsDetailModal.tsx`, `CalendarSubscriptionModal.tsx`, `EventFormModal.tsx`.
  * `hooks/useCalendarEvents.ts` (Daten-Mapping & persönliche Einsatz-Erkennung `isMyAssignment` / `myAssignmentIcons`).
* **Help (`src/features/Help/`):** `HelpView.tsx` (Integriertes Handbuch mit Leitfaden zu Filtern, Rollen und Admin-Cockpit).
* **Layout (`src/features/Layout/`):** `AppLayout.tsx` (Responsive Shell, Navigation, Live-Badges & Backup-Reminder-Banner).
* **Reminders (`src/features/Reminders/`):** 
  * `RemindersView.tsx` (WhatsApp-Kommandozentrale, Meine/Verein-Filter & Historien-Modus).
  * `components/ReminderCard.tsx` (Karten-UI inkl. Snooze, Audit-Banner & „Wieder aktivieren“).
  * `hooks/useRemindersData.ts` (Daten-Aggregation, Mitternachts-Schranke, Überfälligkeits-Logik & Historien-Filter).
  * `utils/whatsappFormatter.ts` (WhatsApp-Text- & Auto-Kader-Generator).
* **Reports (`src/features/Reports/`):** 
  * `ReportsView.tsx` (Hauptansicht für Auswertungen & Datensicherung).
  * `ReportsDashboardTab.tsx` (Statistik & Fristen-Radar).
  * `DataExplorerTab.tsx` & `ColumnMappingPopover.tsx` (Tabellarischer Daten-Explorer & Spalten-Konfiguration).
  * `BackupRestoreTab.tsx` (UI für Datensicherung & Test-Datenbank Klonen).
* **Tasks (`src/features/Tasks/`):** `TasksView.tsx`, `KanbanBoard.tsx`, `TasksListView.tsx`, `TaskCard.tsx`, `TasksToolbar.tsx`, `TaskHistoryModal.tsx`.
* **TeamPins (`src/features/TeamPins/`):** `TeamPinsView.tsx` (Wettkampf-Tresor & PIN-Freigabe).
* **Templates (`src/features/Templates/`):** `TemplatesView.tsx` (Vorlagen-Management).
* **Users & Aufstellungsplanung (`src/features/Users/`):** 
  * `UsersView.tsx`, `MyProfileModal.tsx`, `RoleMatrixModal.tsx`.
  * `tabs/`: `AppUserTab.tsx`, `EhrungenTab.tsx`, `MitgliederTab.tsx`, `RollenTab.tsx`, `TeamsTab.tsx`, `VorstandTab.tsx`.
  * `components/`: `EditableCell.tsx`, `MatchLineupCardsView.tsx` (Mobile/Karten-Ansicht für Aufstellungen), `MatchLineupLogisticsRow.tsx` (Logistik-Kommandozentrale für Fahrer, Betreuer & Abfahrtszeit), `MatchLineupMatrixTable.tsx`, `QuickAddHelperRow.tsx`.
  * Modals in `src/features/Users/`: `CsvImportModal.tsx`, `GroupFormModal.tsx`, `HelperFormModal.tsx`, `MatchLineupMatrixModal.tsx` (Base & Override Planungs-Matrix für Captains), `TeamFormModal.tsx`, `UserFormModal.tsx`, `UserSuccessionModal.tsx`.
  * `hooks/useMatchLineupMatrix.ts`.
* **Shared UI & Utils (`src/features/Shared/`):** 
  * `ItemFormModal.tsx`, `AgendaItemRow.tsx`, `ItemCard.tsx`, `RichText.tsx`.
  * `components/SmartEntityPicker.tsx`.
  * `components/AgendaItem/`: `InlineEditors.tsx`, `ItemMetadata.tsx`, `ItemStatusSection.tsx`, `RowContextMenu.tsx`.
  * `components/ItemForm/`: `AssigneePicker.tsx`, `ReminderSettings.tsx`, `RoutineSettings.tsx`.
  * `utils/textUtils.tsx`.

---

## 💻 TEIL 9: Quickstart für Entwickler

1.  **Repository klonen**
2.  `npm install` ausführen.
3.  **Firebase konfigurieren:** Die Datei `src/services/firebase.ts` erwartet Umgebungsvariablen. Erstelle eine `.env.local` (bzw. `.env.development` / `.env.production`) im Root mit den `VITE_FIREBASE_...` Keys.
4.  `npm run dev` startet den lokalen Vite-Server (oder per Doppelklick auf `node starten.command`).
5.  `npm run build` führt einen strengen TypeScript Check (`tsc -b`) aus und baut das Production-Bundle.

*Stand: 18.10.2026 - Protokoll: Vollständiger Code-Sync (Tech-Stack, 4-Wege-Zuweisung, RBAC inkl. Jugend-Firewall, Erinnerungs-Historie, Einsatz-Highlighting, alle 12 Collections & aktuelles Datei-Lexikon)*
// --- END OF FILE ---