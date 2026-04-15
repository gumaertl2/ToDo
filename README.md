# PapaToDo 🎯 - Der digitale Vereins- & Vorstands-Assistent

Ein Serverless PWA-Projekt (Progressive Web App) zur effizienten Organisation der Vorstandsarbeit in Vereinen. PapaToDo strukturiert wiederkehrende Aufgaben, kaskadiert Event-Planungen, generiert automatische WhatsApp-Erinnerungen und macht das Führen von Sitzungsprotokollen fließend und intuitiv.

---

## 🤖 TEIL 1: KI-Agenten Briefing & Master-Protokoll

> WICHTIGE INSTRUKTION FÜR KI-KOLLABORATOREN (AI AGENTS):
> Wenn du dieses Projekt analysierst oder Code generierst, agiere ausschließlich als "Code-Chirurg". Betrachte den existierenden Code als sakrosankt. 
> 
> Strict Code Integrity Protocol:
> 1. Drei-Schritte-Rhythmus: 1. Verständnis & Analyse, 2. Operations-Plan (inkl. betroffener Dateien und exakter Änderungen), 3. Warten auf das explizite "OK" des Users.
> 2. Vollständigkeits-Garantie: Verändere nur das, was verlangt ist. Liefere bearbeitete Dateien immer von der ersten bis zur letzten Zeile (niemals Snippets oder Auslassungen).
> 3. Architektur-Trennung: UI-Elemente bleiben strikt im features/ Ordner, Daten- und Geschäftslogik bleiben strikt im store/slices/.
> 4. Typ-Sicherheit: 100% TypeScript (Zero any).
> 5. Zero-Build-Error: Vor jeder Code-Ausgabe ist ein mentaler Integritäts-Check durchzuführen.

---

## 🚀 TEIL 2: Projektübersicht & Tech-Stack

PapaToDo ist für die plattformübergreifende Nutzung auf PCs, Macs, iOS und Android optimiert (Mobile First, Offline-Fähig).

* Frontend Core: React 18, TypeScript 5, Vite (PWA Mode).
* UI & Styling: Tailwind CSS, Lucide React Icons.
* State Management: Zustand (Slice-Pattern als Single Source of Truth im useClubStore).
* Backend & Datenbank: Google Firebase (Firestore NoSQL) im Spark-Tarif. 
* Netzwerk: experimentalForceLongPolling ist aktiviert, um Safari-CORS-Timeouts zu unterbinden.
* Authentifizierung: Multi-Provider-Auth (E-Mail/Passwort, Google OAuth, Apple).
* Spezial-Tools: react-big-calendar (inkl. YIQ-Kontrast-Logik), ICAL.js (für ICS-Datei-Parsing), Leaflet (Maps), dnd-kit (Drag & Drop Kanban).
* Deployment: Vercel.

---

## 💡 TEIL 3: Kernfunktionen & Workflow

### 1. Das fließende Protokoll (Chamäleon-Konzept)
Es gibt keine starren Tabellen für Aufgaben und Protokolle. Alles ist ein AgendaItem. Während einer Sitzung ändert der Baustein fließend seinen Typ (INFO, BESCHLUSS, AUFGABE). Beim Schließen eines Protokolls greift ein Zwangsworkflow: Der Termin für die nächste Sitzung der Serie (seriesId) wird festgelegt. Das System versiegelt das alte Protokoll revisionssicher und klont alle unerledigten Aufgaben in die frische Agenda.

### 2. Aufgaben & 2-Wege-Zuweisung
Aufgaben werden über ein Kanban-Board verwaltet. Die Zuweisung ist strikt getrennt in:
* Intern (App-Nutzer): Vorstände und Rollen (assigneeUserIds, assigneeGroupIds).
* Extern (Helfer): Engagierte Vereinsmitglieder ohne App-Login (assigneeHelperIds).

### 3. WhatsApp Erinnerungs-Zentrale & Snooze
Das System berechnet Fälligkeiten für Aufgaben, Sitzungen, Kalender-Termine und abonnierte ICS-Abos. Fällige Benachrichtigungen laufen im RemindersView auf. Über "Senden & Erledigt" öffnet sich WhatsApp mit vorgefertigtem Text. Die "Snooze"-Funktion (Erneut erinnern in X Tagen) erlaubt es, Erinnerungen temporär zu verschieben.

### 4. Externe Kalender (ICS) & Sichtbarkeit
Sitzungen und Termine besitzen ein isPublished Flag. Ist dieses false, wird im internen Kalender ein 🔒-Icon gerendert und der Termin von der Public-Homepage ausgeschlossen. Externe Feeds können als Web-URL abonniert oder als physische .ics Datei geparst (FILE_IMPORT) und mit Abo-weiten WhatsApp-Erinnerungen verknüpft werden.

---

## 🔒 TEIL 4: Auth-Architektur (Zwei-Welten-Prinzip)
Das Login-System ist strikt zweigeteilt:
1. Firebase Auth ("Türsteher"): Verwaltet ausschließlich E-Mail & Login-Methode.
2. Firestore ("Vereins-Akte"): Speichert Rollen (ADMIN, VORSTAND, BEREICHSLEITER), Ämter und Rechte (users Collection).
Die Verknüpfung erfolgt ausschließlich über die identische E-Mail-Adresse (Matching-Prozess beim ersten Login).

---

## 🗄️ TEIL 5: Datenmodell (NoSQL Firestore)
Zur Minimierung von Lesezugriffen ist die Struktur extrem flach. Jedes Dokument benötigt eine schemaVersion.

* users: Profil, Amt, Systemrolle, groupIds.
* helpers: Externe Helfer (inkl. DSGVO-Frist retentionExpiresAt).
* groups: Vereins-Ämter / Gruppierungen.
* events (Sitzung): Bündelung über seriesId. status, plannedStartTime, isPublished. Erinnerungen: reminderSenderUserId, reminderLeadDays, reminderCustomText.
* agenda_items (Aufgabe/Info): type, status, progress, dueDate, 2-Wege-Zuweisung. Checklisten & Kommentare als Arrays.
* calendar_subscriptions: iCal-Feeds (url oder FILE_IMPORT). Beinhaltet gecachte Events (cachedEvents). Abo-weite Erinnerungen.
* calendar_events: Physische Termine (isPublic: boolean).

---

## 🛡️ TEIL 6: DSGVO, Migration & Abgrenzung

* DSGVO-Konformität: Helfer-Kontaktdaten sind optional. Ein Helfer darf nur angelegt werden, wenn consentConfirmed ("Person wurde informiert") gesetzt ist. Das System berechnet Ablaufdaten (retentionExpiresAt) zur automatisierten Karteileichen-Löschung.
* Datenmigration: Alle Daten durchlaufen vor dem Laden in den Store einen zentralen DataProcessor. Veraltete Datensätze werden On-the-Fly migriert.
* Out of Scope: Das System ist KEINE Mitgliederverwaltung, KEINE Buchhaltungssoftware und besitzt KEINE Mehrmandantenfähigkeit.

---

## 📂 TEIL 7: Datei-Lexikon (Orientierung)

* src/core/types/models.ts: Definition aller TypeScript-Interfaces (Die Verfassung).
* src/services/firebase.ts: Firebase Initialisierung & Config.
* src/store/useClubStore.ts: Der zentrale Hub (SSOT).
* src/store/slices/...: Logik-Module (Auth, Calendar, Event, Task, Template, User).
* Layout/AppLayout.tsx: Responsive Shell, Mobile Menü, Badge-Berechnung.
* Dashboard/DashboardView.tsx: Startzentrale inkl. Aufgaben und WhatsApp-Warnbanner.
* Events/CalendarView.tsx: Interner Kalender (YIQ-Kontrast, 🔒-Symbol).
* Events/PublicCalendarEmbed.tsx: Öffentlicher Kalender für iFrame-Homepage-Einbindung.
* Events/EventDetailView.tsx: Das Herzstück – Agenda-Führung, Protokoll-Rollover.
* Reminders/RemindersView.tsx: Die WhatsApp-Kommandozentrale.
* Shared/ItemFormModal.tsx: Universeller Editor für Agenda-Punkte & Tasks.
* Users/UsersView.tsx: Management von App-Usern & Helfern.
* Tasks/TasksView.tsx: Visuelles Kanban-Board.

---

## 💻 TEIL 8: Quickstart für Entwickler

1. Repository klonen:
   git clone <repository-url>
   cd ToDo-WA

2. Abhängigkeiten installieren:
   npm install

3. Umgebungsvariablen einrichten (Erstelle eine .env.local Datei):
   VITE_FIREBASE_API_KEY="dein-api-key"
   VITE_FIREBASE_AUTH_DOMAIN="dein-projekt.firebaseapp.com"
   VITE_FIREBASE_PROJECT_ID="dein-projekt"
   VITE_FIREBASE_STORAGE_BUCKET="dein-projekt.appspot.com"
   VITE_FIREBASE_MESSAGING_SENDER_ID="123456789"
   VITE_FIREBASE_APP_ID="1:123456789:web:abcdef"

4. Entwicklungsserver starten:
   npm run dev
   (Die App ist nun unter http://localhost:5173 erreichbar)

5. Produktions-Build erstellen:
   npm run build