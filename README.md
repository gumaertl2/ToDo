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
* **Top/Bottom Markers:** * Add a comment at line 1: `// [YYYY-MM-DD] - [Reason for change]`
  * Add at the very end: `// --- END OF FILE ---`
* **Vercel / TS strictness:** Do not introduce implicitly typed variables (`any`). Handle undefined/null checks strictly.

### 3. Architectural Integrity
* **State Management (SSOT):** `useClubStore.ts` is the Single Source of Truth. No local state mutations that bypass the store. UI components ONLY trigger store actions.
* **Separation of Concerns:** Business logic lives in the store. Presentation logic lives in the React components. Do not mix them.
* **Frictionless UI / Contextual Navigation:** * Auto-focus inputs in modals.
  * Double-click to edit rows.
  * Use deep links and auto-scroll (`scrollIntoView`) when routing from Dashboard/Kanban back to a specific Agenda Item.

### 4. Data Schema & Firestore Migration Protocol
* The core types are defined in `src/core/types/models.ts`.
* **CRITICAL:** If you add a new field to a data model, it MUST be optional (`?`). 
* If a new field requires a database migration script, you must STOP and warn the user. 
* NEVER rename existing database fields. Add new ones and deprecate old ones if absolutely necessary.

---

## 🎨 UX & UI Design Guidelines (Strictly Follow!)

* **No UI-Clutter:** Keep the interface clean. Avoid unnecessary borders or heavy backgrounds. Use subtle shades (`bg-gray-50`, `bg-blue-50/50`) to group elements visually.
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
* **Frontend:** React 18, TypeScript, TailwindCSS 3.
* **Build-Tool:** Vite (Lightning fast HMR).
* **State-Management:** Zustand (persistiert via LocalStorage).
* **Backend (Serverless):** Firebase (Firestore, Auth).
* **Hosting/Deployment:** Vercel (CI/CD Pipeline).
* **Routing:** React Router v6.
* **Icons:** Lucide React.

---

## 🧭 TEIL 3: Die PapaToDo-Philosophie (Mindset)

Das System basiert nicht auf endlosen ToDo-Listen, sondern auf einem klaren Rhythmus (Events). Um Chaos zu vermeiden, gelten diese Leitplanken:

1. **Der Meeting-Rhythmus (Ein endloser Kreislauf):** - *Vor der Sitzung:* Die lebende Agenda dient der Vorbereitung. **Wichtig:** Offene ToDos aus alten Sitzungen (Vererbte Punkte) sind hier sofort sichtbar. Neu angelegte Punkte (Entwürfe) bleiben im ToDo-Board unsichtbar, bis die Agenda offiziell veröffentlicht wird.
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
* **Beim Protokoll-Abschluss:** * Ist die Routine-Aufgabe noch *unerledigt*, wandert sie normal ins neue Protokoll. 
  * Ist sie bereits *erledigt*, ignoriert das Skript sie (da der Klon für die Zukunft ja schon existiert).
  * **Enddatum-Sicherung:** Wenn das `routineEndDate` überschritten ist, stoppt der Respawn. Wichtig: Die Routine verschwindet erst aus der UI, wenn auch die allerletzte noch offene Aufgabe dieser Blutlinie wirklich als erledigt abgehakt wurde (kein Verschwinden von Altlasten!).

### 3. Aufgaben & 3-Wege-Zuweisung
Aufgaben können in PapaToDo an drei verschiedene Entitäten zugewiesen werden:
1. **User (Direkt):** Zuweisung an eine spezifische Person (z.B. "Max Mustermann").
2. **Rolle/Amt (Funktional):** Zuweisung an das Amt (z.B. "1. Vorstand").
3. **Gruppe (Kollektiv):** Zuweisung an ein Team (z.B. "Festkomitee").

### 4. Participation-First Firewall (Security & "Least-to-know")
Benutzer sehen nur, was sie betrifft.
* Auf dem **Dashboard**, dem **Kanban-Board** und im **Vereinskalender** sehen Nutzer nur Aufgaben und Events, denen sie direkt oder über ihre Gruppe/ihr Amt zugewiesen sind.
* Interne Vorstandsprotokolle bleiben für Helfer völlig unsichtbar. Der **Access Control Guard** blockiert direkte URL-Aufrufe rigoros, wenn der User nicht Teilnehmer oder Admin.

### 5. WhatsApp Erinnerungs-Zentrale & Poka-Yoke
Kein automatcher E-Mail-Spam! Der User (z.B. der Vorstand) versendet Erinnerungen (an Aufgaben oder Dienste) proaktiv per WhatsApp-Deep-Link über die Reminders-Ansicht. 
* Aufgaben und Termine können mit Vorlaufzeiten (`reminderLeadDays`) versehen werden.
* Ist ein Empfänger nicht greifbar, kann die Erinnerung via **Snooze-Button** tageweise auf Wiedervorlage geschoben werden.
* **WhatsApp-Narrensicherung (Poka-Yoke):** Externe Betreuer (ohne App-Account) besitzen kein eigenes Dashboard. Weist man einem solchen "echten" Externen eine Aufgabe zu, aktiviert das System im Formular *automatisch* die WhatsApp-Erinnerung und trägt den Autor als Versender ein. So wird das Kommunikations-Vakuum sicher verhindert.

### 6. Wettkampf-Tresor (Team-PINs)
Sichere Ablage von Passwörtern, Zugangscodes oder Kabinenschlüsseln. Der Zugriff ist an strikte Berechtigungen gekoppelt (nur Admins oder befugte Trainer sehen den Klartext).

### 7. Externe Kalender (ICS) & Sichtbarkeit
PapaToDo kann externe Kalender (z.B. vom BFV oder Google) abonnieren. An diese importierten Termine (z.B. ein Heimspiel) können dann intern "Dienste" (z.B. Hallenverkauf) angehängt und Personen zugewiesen werden.
Der gesamte Kalender kann via iFrame/Web-Link schreibgeschützt für alle Vereinsmitglieder (ohne Login) freigegeben werden.

### 8. Soft-Delete (Trash) & Papierkorb-Management
Gelöschte Elemente (Agenda-Punkte, Aufgaben) werden nicht physisch aus der Datenbank entfernt, sondern erhalten den Status `TRASH` und einen `deletedAt` Zeitstempel. Sie werden in der regulären Agenda und im Kanban-Board ausgeblendet, können aber von Administratoren über die `OrphanCleanupModal` wiederhergestellt oder endgültig (hard-delete) bereinigt werden.

### 9. Desktop Power-Features (Kontextmenü & Inline-Editoren)
Für ein blitzschnelles Arbeiten am Desktop wurden Power-Features integriert:
* **Native Rechtsklick-Kontextmenüs (`RowContextMenu`):** Erlaubt die Bearbeitung, Positionierung und das Einfügen neuer Zeilen ohne Mauswege.
* **Inline-Editoren (`InlineEditors`):** Bearbeitung von Titeln, Beschreibungen und Dauer direkt in der Liste.
* **Volltext- & Ähnlichkeitssuche:** Ein globales Suchfeld im Agenda-Header filtert den Baum in Echtzeit. Treffer in Titeln oder Notizen (`RichTextRenderer`) werden visuell gelb (`<mark>`) hervorgehoben.
* **Safe-Edit Fokus-Schutz:** Eine komplexe Interceptor-Logik verhindert den Fokus-Klau und Datenüberschreibungen zwischen Inline-Editoren (onBlur-Speichern) und Modal-Overlays.
* **Smart-Sorting & Sub-Item Drag&Drop:** Neu angelegte Punkte erhalten strikt die `protocolIndex = max + 1` und fügen sich nahtlos in die Hierarchie ein. Unterpunkte sind vollständig drag-and-drop-fähig.

### 10. Mitglieder-Self-Service & Stammdaten
* **"Mein Profil" (Self-Service):** Mitglieder können ihre Kontaktdaten (Telefon, E-Mail der Eltern, etc.) sowie ihre DSGVO-Einstellungen jederzeit selbstständig in der App aktualisieren.
* **Transparenz nach Art. 15 DSGVO:** Nutzer haben jederzeit vollen Lese-Zugriff auf die vom Verein über sie gespeicherten Stammdaten (Name, App-Alias, Mitgliedsstatus, Geburts- und Eintrittsdatum).
* **Auto-Benachrichtigungen:** Ändert ein Mitglied seine Kontaktdaten im Self-Service, generiert das System automatisch eine In-App-Erinnerung (Aufgabe) an alle Vorstandsmitglieder (Recht: `manageMitglieder`), damit diese die Daten in externen Systemen (Kasse, DTTB) synchronisieren können.
* **Login-Sicherheit:** Das primäre E-Mail-Feld ist im Self-Service gesperrt (Read-Only), um die unzerstörbare Brücke zum Firebase-Authentication-Login zu garantieren.

---

## 🔒 TEIL 5: Berechtigungskonzept & Rollen (RBAC)

Jeder Nutzer in PapaToDo bekommt ein Rollen-Profil (z.B. "Admin", "Vorstand", "Helfer"), welches über ein striktes Flag-System im Firestore abgesichert ist.

* `manageUsers`: Darf neue Helfer anlegen, Berechtigungen ändern und Rollenprofile erstellen (Super-Admin).
* `manageEvents`: Darf Sitzungen anlegen, Agenden veröffentlichen und Protokolle schließen.
* `manageTasks`: Darf Aufgaben erstellen, bearbeiten und verschieben (Kanban-Board).
* `manageTemplates`: Darf die Vorlagen-Bibliothek administrieren.
* `manageTeamPins`: Darf sensible Zugangsdaten im Tresor verwalten.
* `manageCalendar`: Darf externe Feeds abonnieren und Dienste festlegen.
* `viewEhrungen`: Darf das Jubiläums-Radar einsehen UND fungiert als strikte DSGVO-Firewall für die Einsicht in Daten passiver Mitglieder.

*Nutzer ohne diese Berechtigungen verbleiben in der Read-Only (Leser) Ansicht.*

---

## 🗄️ TEIL 6: Datenmodell (NoSQL Firestore) & Relational Keys

Die Datenbank ist flach (flat-hierarchy) aufgebaut. Um die App-Logik (Klonen, Historie, Container) zu steuern, nutzen wir ein striktes Set an relationalen Schlüsseln (Foreign Keys).

**Domain-Language (Das Lexikon der Nutzer):**
Um Verwirrung in der UI und Logik zu vermeiden, gibt es eine strikte Trennung:
* **App-Nutzer (Collection: `users`):** Das sind die "Macher" (Vorstand, Teamleitung). Ein Nutzer ist **nur dann** ein echter "App-Nutzer", wenn er ein offizielles `amt` hat ODER über sein Profil (`roleProfileId`) administrative Rechte (z.B. `manageEvents`, `manageTasks`) besitzt. Nur sie haben Zugriff auf ToDo-Boards, erhalten ToDo-Zuweisungen (`assigneeUserIds`) und sehen Planungs-Sitzungen in ihrem Dashboard.
* **Mitglieder & Helfer (Collection: `helpers`):** Das ist die breite Vereins-Basis. Sie haben Felder wie `teamIds` oder `memberStatus`. Wenn sich ein Helfer in die App einloggt, bleibt er für das System ein "purer Helfer". Das UI (Dashboard) blendet für diese Nutzer alle ToDo-Container und Sitzungen restlos aus, da sie weder Vorstand-ToDos abarbeiten können, noch zu internen Sitzungen geladen werden. Sie werden lediglich für Dienste via `assigneeHelperIds` eingeteilt.

**Das Data-Dictionary (Die Beziehungs-Logik):**
* **`eventId` (Die Sitzungs-Zuordnung):** Verbindet ein `AgendaItem` mit einem `Event`. Ist dieses Feld leer (`null`/`undefined`), handelt es sich um eine freie "Backlog"-Aufgabe ohne festen Sitzungs-Kontext. Ist es gesetzt, teilt das Item den Lebenszyklus dieser Sitzung.
* **`seriesId` (Die Event-Blutlinie):** Wenn ein Event (Sitzung) abgeschlossen und für das nächste Meeting geklont wird, ändert sich seine `id`. Die `seriesId` bleibt jedoch über alle Generationen hinweg konstant (sie entspricht der `id` des allerersten Meetings der Serie). Dadurch können Projekttitel jederzeit geändert werden, ohne dass die Protokoll-Historie zerreißt.
* **`baseItemId` (Die Aufgaben-Blutlinie):** Der "Ghost-Scanner"-Schlüssel für Aufgaben und Routinen. Wird eine Aufgabe ins nächste Meeting geklont oder durch eine Routine neu erschaffen (Respawn), erhält sie zwingend eine neue `id`. Die `baseItemId` bleibt jedoch immer identisch zum Ursprungs-Item. Daran erkennen Zähler (wie `completedCount`) und Filter, dass es sich um dieselbe Aufgabenfamilie handelt, selbst wenn der Titel mutiert.
* **`isSubItem` & `parentItemId` (Die Container-Hierarchie):** Steuert die Verschachtelung. Ein Unterpunkt hat `isSubItem: true`. Seine `parentItemId` MUSS zwingend auf die *aktuelle* `id` des Oberpunkts zeigen (niemals auf dessen `baseItemId`!). Beim Klonen eines Containers erhalten Boss und Kinder neue IDs, und die `parentItemId` der Kinder wird vom Code sofort auf die neue ID des geklonten Bosses aktualisiert. Waisenkinder sind streng verboten.

**Die Collections:**
* `users`: Benutzerprofile, verknüpft mit Firebase Auth-ID.
* `role_profiles`: Berechtigungs-Matrix (Templates für Nutzerrechte).
* `groups`: Gruppierungen (z.B. "Festausschuss").
* `events`: Sitzungen, Meetings und Projekte (Header-Daten).
* `agenda_items`: Jeder Punkt, jede Aufgabe, jeder Beschluss einer Sitzung. Das ist die größte Collection.
* `calendar_events`: Interne Kalender-Einträge und Dienste (referenziert ggf. auf externe `subscriptionId`).
* `calendar_subscriptions`: Abonnierte externe ICS-Feeds.
* `team_pins`: Der Passwort-Tresor.
* `templates`: Wiederverwendbare Vorlagen für Routinen.

---

## 🛡️ TEIL 7: DSGVO, Datenschutz & Abgrenzung

Die App ist streng nach dem Grundsatz *Privacy by Design* und den Vorgaben der europäischen Datenschutzgrundverordnung (DSGVO) aufgebaut:

*   **Digitaler Clickwrap:** Beim ersten Login (oder nach einer Aktualisierung der Richtlinien) muss jeder Nutzer aktiv der App-Sichtbarkeit zustimmen oder diese ablehnen. 
*   **Lückenloser Audit-Trail:** Jede DSGVO-Entscheidung wird mit einem präzisen Zeitstempel (`consentConfirmedAt`) und dem Akteur (`USER` oder `ADMIN`) manipulationssicher in der Datenbank protokolliert.
*   **Opt-In Sichtbarkeit:** Lehnt ein Nutzer die Sichtbarkeit ab, wird sein Profil für andere App-Nutzer strikt geschwärzt (Read-Only Firewall im Store). Die App bleibt für ihn jedoch vollumfänglich nutzbar.
*   **Admin-Override & Reset:** Admins können analog vorliegende (papierhafte) Zustimmungen im System erfassen oder den DSGVO-Status eines Mitglieds komplett zurücksetzen, um bei dessen nächstem Login einen neuen Clickwrap zu erzwingen.
*   **Einfacher Widerruf:** Die DSGVO-Zustimmung kann vom Nutzer jederzeit mit einem Klick über das eigene Profil widerrufen oder nachträglich erteilt werden (Art. 7 Abs. 3 DSGVO).
*   **Passiv-Mitglieder-Firewall:** Aus DSGVO-Gründen werden passive Mitglieder zentral und reaktiv im `useClubStore` (UserSlice) herausgefiltert, sofern der Nutzer nicht das `viewEhrungen`-Recht besitzt. Diese Filterung darf niemals in die UI-Schicht verlagert werden, um unbeabsichtigte Datenlecks in der Oberfläche oder durch direkten State-Zugriff zu verhindern.
*   **Ehrungen & Mitgliedsdaten:** PapaToDo ist KEINE vollumfängliche Vereinsverwaltung (dafür gibt es WISO, SPG etc.). Das Tab "Mitglieder & Ehrungen" dient *nur* dem Jubiläums-Radar (z.B. "Wer hat dieses Jahr 25-jähriges?"), damit der Vorstand frühzeitig reagieren kann.
*   **Mandantenfähigkeit (Club-ID):** PapaToDo ist mandantenfähig vorbereitet. Fast alle Dokumente besitzen ein `clubId` Feld.

---

## 📂 TEIL 8: Vollständiges Datei-Lexikon (Orientierung)

### Root & Infrastruktur
* `.gitignore`, `eslint.config.js`, `package.json`, `tsconfig.json`: Standard Vite/Node Konfigurationen.
* `vercel.json`: Deployment Konfiguration für Client-Side Routing (Rewrites auf `index.html`).
* `vite.config.ts`: Vite Bundler Konfiguration.
* `src/config/dsgvoConfig.ts`: Konfigurationsdatei für DSGVO-Texte und Versions-Tracking.
* `api/calendar.ts`: Serverless Vercel Function (Backend) für das Abonnieren und Parsen externer `.ics` Kalender-Feeds. Vermeidet CORS-Probleme im Browser.

### State Management (Store)
* `src/store/useClubStore.ts`: Der Master-Zustand. Führt alle Slices zusammen.
* `src/store/slices/*`: Die modularisierten Store-Fragmente (Auth, User, Event, Task, etc.). Hier passiert 90% der Datenbank-Kommunikation mit Firestore.

### Features & UI

* **Admin:** `OrphanCleanupModal.tsx` (Papierkorb-Verwaltung und Soft-Delete Cleanup).
* **Auth:** `AuthGuard.tsx` (Routenschutz), `LoginView.tsx` (Firebase Auth), `DsgvoClickwrap.tsx` (Privacy-Gate).
* **Dashboard:** `WelcomeDashboard.tsx` (Die rollenbasierte Kommandozentrale).
* **Events:** `CalendarView.tsx` (Interner Kalender), `EventDetailView.tsx` (Live-Protokollführung), `ProtocolEditor.tsx`, `EventsView.tsx`.
  * *Kalender-Tools:* `CalendarBulkEventModal.tsx`, `CalendarExportModal.tsx`, `CalendarIcsDetailModal.tsx`, `CalendarSubscriptionModal.tsx`.
  * *Extern:* `PublicCalendarEmbed.tsx` (Öffentliche Ansicht).
* **Layout:** `AppLayout.tsx` (Responsive Shell & Mobile-Menü).
* **Reminders:** `RemindersView.tsx` (WhatsApp-Kommandozentrale & Snooze-Logik).
* **Reports:** `ReportsView.tsx` (Statistik & Fristen-Radar).
* **Tasks:** `TasksView.tsx` (Board/Liste), `KanbanBoard.tsx`, `TasksListView.tsx`, `TaskHistoryModal.tsx`.
* **TeamPins:** `TeamPinsView.tsx` (Wettkampf-Tresor & PIN-Freigabe).
* **Templates:** `TemplatesView.tsx` (Vorlagen-Management).
* **Users:** `UsersView.tsx` (Nutzer & Helfer), `UserSuccessionModal.tsx` (Amtsübergabe), `MyProfileModal.tsx` (Nutzer Self-Service), `tabs/` (Mitglieder, Rollen, Ehrungen, App-Nutzer).
  * *`tabs/RollenTab.tsx`:* Nutzt eine dynamische Baumstruktur mit **Kontext-Erhalt** und **+/- Filter**, um Daueraufgaben übersichtlich darzustellen.
* **Shared:** `ItemFormModal.tsx` (Universal-Editor), `AgendaItemRow.tsx` (Listenansicht), `ItemCard.tsx` (Kanban-Ansicht), `RichText.tsx`.
  * *AgendaItem Sub-Komponenten:* Desktop Power-Features (`InlineEditors.tsx`, `ItemMetadata.tsx`, `ItemStatusSection.tsx`, `RowContextMenu.tsx`).
  * *ItemForm Sub-Komponenten:* `AssigneePicker.tsx`, `ReminderSettings.tsx`, `RoutineSettings.tsx`.
  * *Utils:* `textUtils.tsx` (Highlighting & Formatierung).

---

## 💻 TEIL 9: Quickstart für Entwickler

1.  **Repository klonen**
2.  `npm install` ausführen.
3.  **Firebase konfigurieren:** Die Datei `src/services/firebase.ts` erwartet Umgebungsvariablen. Erstelle eine `.env.local` im Root mit den `VITE_FIREBASE_...` Keys.
4.  `npm run dev` startet den lokalen Vite-Server.
5.  `npm run build` führt einen strengen TypeScript Check (`tsc -b`) aus und baut das Production-Bundle.

*Stand: 23.07.2026 - Protokoll: WelcomeDashboard, Domain Language, Fate-Binding & DSGVO-Self-Service*
// --- END OF FILE ---