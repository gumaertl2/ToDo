# Projektbeschreibung: PapaToDo (PWA)

## 1. Ausgangslage und Zielsetzung
Ein kleiner Verein (ca. 100 Mitglieder) mit einem 5-köpfigen Vorstand benötigt ein zentrales, digitales Werkzeug zur effizienten Organisation der Vorstandsarbeit.

Ziel ist es, wiederkehrende Aufgaben, Event-Planungen und Vorstandssitzungen zu strukturieren. Das Tool soll Aufgaben aus Protokollen generieren, rollenspezifische Routinen planen und Event-Aufgaben automatisch mit Fristen kaskadieren. Um den Vereinsalltag abzubilden, können Aufgaben an engagierte Helfer (ohne eigenen Systemzugang) delegiert und in Checklisten untergliedert werden. Ein Kanban-Board sorgt für die visuelle Übersicht.

## 2. Zielplattformen & Technologie-Stack
Die Anwendung wird als **Progressive Web App (PWA)** konzipiert. Sie funktioniert plattformübergreifend auf Windows-PCs, Macs, iPhones, Android-Smartphones und Tablets.

* **Architektur:** Serverless, Offline-First, Optimistic UI (verzögerungsfreie Benutzeroberfläche).
* **Backend & Datenbank:** Google Firebase (Firestore für NoSQL-Datenstruktur und Offline-Caching) im kostenlosen Spark-Tarif.
* **Server-Standort:** Frankfurt (`europe-west3`) zur Unterstützung europäischer Datenschutzanforderungen.
* **Authentifizierung:** Multi-Provider-Auth (E-Mail/Passwort, Google OAuth, Sign in with Apple).
* **Frontend Core:** React 18, TypeScript 5, Vite (PWA Mode).
* **UI & Interaktion:** Tailwind CSS, Lucide React, Drag & Drop für das Kanban-Board.
* **State Management:** Zustand (mit Slice-Pattern).
* **Data Processing:** ResultProcessor (Service Pattern).
* **Kartenmaterial:** Leaflet & React-Leaflet (OpenStreetMap).
* **Lokalisierung:** Mehrsprachigkeit (Deutsch / Englisch) via I18N.
* **Deployment:** Vercel.

## 3. Kernfunktionen (Fachliche Spezifikation)

### A. Der fließende Workflow (Sitzungen & Protokolle)
Die Anwendung nutzt keine starren Tabellen für Protokolle und Aufgaben, sondern ein fließendes "Chamäleon"-Konzept.
* **Event vs. Sitzung & Serien:** Ein "Event" in der Datenbank entspricht exakt einer konkreten Sitzung an einem bestimmten Datum. Wiederkehrende Projekte (z. B. "Vorstandssitzung") werden über eine gemeinsame, unveränderliche `seriesId` gebündelt. Jede Sitzung behält so ihr eigenes, historisch sauberes Protokoll.
* **Entwurfs-Modus (Publishing):** Eine neue Agenda startet im Entwurfs-Modus (Versteckt) und ist nur für den Ersteller sichtbar. Erst durch Klick auf "Veröffentlichen" sehen alle Teilnehmer die Agenda auf ihrem Dashboard und können vorab Kommentare eintragen.
* **Der Chamäleon-Baustein:** Alles ist ein `AgendaItem`. Während der Sitzung ändert der Baustein fließend seinen Typ (`INFO`, `BESCHLUSS`, `AUFGABE`).
* **Die Endlos-Kette (Sitzungs-Abschluss & Rollover):** Beim Schließen eines Protokolls greift ein Zwangsworkflow: Der Nutzer legt den Termin für die nächste Sitzung der Serie fest. Das System generiert die neue Sitzung, versiegelt das alte Protokoll revisionssicher (`isReadOnly`) und klont alle offenen Aufgaben sowie Routinen in das neue Event. Die Historie des alten Protokolls bleibt dabei unangetastet zu 100 % erhalten.
* **Historie & Protokoll-Suche (Archiv-Navigator):** Ein intelligenter Navigator im aktuellen Protokoll filtert blitzschnell nach der `seriesId` und zeigt die komplette historische Kette exakt dieser Sitzungsreihe, völlig unabhängig von eventuellen Titel-Änderungen.

### B. Aufgabenverwaltung & Delegation (Task Management)
* **Die Aufgabe als Zustand:** Eine "Aufgabe" ist schlichtweg ein AgendaItem vom Typ `AUFGABE`. 
* **Zuweisung:** Eine Aufgabe kann sowohl an konkrete Personen (User/Helfer) als auch an ganze Ämter/Rollen (z.B. Festausschuss) zugewiesen werden.
* **Bearbeitung & Kanban:** Visuelles Kanban-Board (Drag & Drop) zur Statusänderung. Text-Kommentare (Updates) und ein prozentualer Fortschritt (Erledigt in 0 bis 100 %) messen den genauen Stand.
* **Checklisten & Delegation:** Aufgaben können in kleine Checklisten-Punkte (Subtasks) unterteilt werden.

### C. Automatisierung, Events & In-App-Hinweise
* **Wiederkehrende Routinen:** Feste Vorlagen sind an Rollen/Gruppen geknüpft (z.B. Kassenbericht an Rolle Kassier). Wenn die Sitzung ansteht, zieht sich das System diese Vorlagen und generiert daraus aktive Bausteine für die Agenda.
* **Event-Kaskaden (Reverse-Scheduling):** Bei Events erzeugt das System aus Vorlagen sofort Folgeaufgaben und berechnet die Fristen rückwärts vom Event-Datum.
* **In-App-Erinnerungen:** Fällige Aufgaben werden im Dashboard visuell hervorgehoben. Vordefinierte Filter ermöglichen schnellen Zugriff.
* **Export:** System-Kalender mit ICS-Export für die persönliche Kalenderintegration und PDF-Export von Protokollen.

### D. Menüstruktur & Navigation (App-Layout)
* **👥 User & Gruppen Verwaltung:** Anlage von Vorständen/Helfern, Definition von Gruppen (z.B. Spieler, Abteilungsleitung).
* **📅 Event Verwaltung & Sitzungen:** Übersicht offener Events/Serien, Agenda erstellen, Protokoll-Transformation.
* **📋 Aufgaben- & Textbaustein Verwaltung:** Pflege der universellen Bausteine, Vorlagen und Kaskaden.
* **✅ Meine ToDos & Reports:** Kanban-Board, Historien-Filter und ToDo-Listen abrufen.

## 4. Rechtesystem, RBAC & Offline-Architektur
Das System nutzt Role-Based Access Control (RBAC), abgesichert durch **Firestore Security Rules**:

* **Admin (Login):** Systemkonfiguration, Benutzerverwaltung, Freigabe von DSGVO-Löschungen, Verwaltung von Rollen.
* **Vorstand (Login):** Erstellt Protokolle, plant globale Events, delegiert und schließt Aufgaben ab.
* **Bereichsleiter (Login):** Plant abteilungsspezifische Events, verwaltet seine untergeordneten Aufgaben und Rollen-Routinen.
* **Helfer (Kein Login):** Reine Daten-Entität ohne Systemzugang.

### Auth-Architektur (Das "Zwei-Welten-Prinzip")
Das Login-System ist strikt zweigeteilt, um maximale Datensicherheit zu gewährleisten:
1. **Firebase Auth ("Der Türsteher"):** Verwaltet ausschließlich E-Mail-Adressen und Passwörter. 
2. **Firestore ("Die Vereins-Akte"):** Speichert die Profile, Rollen und Rechte (`User`-Dokument).
**Der Matching-Prozess:** Das System verknüpft diese beiden Welten ausschließlich über die identische E-Mail-Adresse. Wird im Firestore ein neuer User (Vorstand/Bereichsleiter) angelegt, muss sich dieser initial über die In-App-Funktion "Registrieren" authentifizieren, um in Firebase Auth aufgenommen und automatisch mit seiner Akte verknüpft zu werden.

### Offline & Caching (Optimistic UI)
* **Firestore-Cache:** Firestore verwendet im Web standardmäßig einen Memory-Cache für Offline-Funktionalität.
* **Optimistic UI:** Um in schwachen Netzwerken Lags zu vermeiden, reagiert die UI beim Anlegen, Ändern und Löschen sofort (Optimistic UI). Die Synchronisation mit Firestore erfolgt lautlos im Hintergrund.

## 5. Datenmodell (Flache NoSQL-Struktur)
Zur Minimierung unnötiger Lesezugriffe wird eine flache Struktur verwendet. Jedes persistierte Dokument enthält verpflichtend ein Feld `schemaVersion`.

* **`users`:** ID, Name, Amt, Systemrolle (`ADMIN`, `VORSTAND`, `BEREICHSLEITER`), Kontaktdaten. **Zuordnung zu Gruppen:** Jeder User muss zu mindestens einer Gruppe gehören; Mehrfachzugehörigkeit zu mehreren Gruppen gleichzeitig ist zulässig (Array `groupIds: string[]`, Mindestelemente: 1).
* **`helpers`:** ID, Name, Bezug, `consentConfirmed`, optionale Kontaktdaten, `lastActivityAt`, `retentionExpiresAt`.
* **`events` (Die Sitzung / Der Container):** Titel, Ort, Typ (Einmalig/Wiederkehrend), Status (`PLANUNG`, `AKTIV`, `ABGESCHLOSSEN`). 
  * *Workflow-Status:* `isPublished: boolean` (Entwurfs-Modus), `seriesId?: string` (Die feste historische Klammer für alle Sitzungen dieser Reihe).
  * *Teilnehmer:* `participantUserIds: string[]` (einzelne User) und `participantGroupIds: string[]` (ganze Gruppen).
  * *Zeiten:* Geplanter Beginn (`plannedStartTime`), Geplantes Ende (`plannedEndTime`), Tatsächliches Ende (`actualEndTime`).
  * *Wiederkehrend:* `recurrencePattern` (täglich/wöchentlich/monatlich/quartalsweise/jährlich), `startDate`, `endDate`, `occurrenceCount` (entweder `endDate` oder `occurrenceCount`, nicht beide).
* **`agenda_items` (Das Universal-Chamäleon):** Ersetzt separate Aufgaben-, Vorlagen- und Protokoll-Tabellen durch ein fließendes Modell.
  * *Basis:* `type` (`AGENDA`, `INFO`, `BESCHLUSS`, `AUFGABE`, `VORLAGE`), `title`, `description`, `eventId` (optionaler Verweis auf den Event-Container).
  * *Timeboxing & Einbringer:* `durationEstimate` (geplante Dauer), `durationActual` (tatsächliche Dauer), `requestedBy` (Wer hat den Punkt eingebracht / Wer hat die Info gegeben?).
  * *Aufgaben-Spezifisch:* `status` (`OFFEN`, `IN_ARBEIT`, `ERLEDIGT`), `progress` (0 bis 100 %), `dueDate` (Bis wann).
  * *Zuweisung (Mehrfach):* `assigneeUserIds: string[]` und `assigneeGroupIds: string[]` (Kombination aus Usern und Rollen möglich).
  * *Checkliste & Updates:* Array für `checkliste` (Subtasks), `comments` (Text-Updates).
  * *Event-Bindung & Kaskaden:* `mustBeDoneBeforeEvent: boolean`, `leadTimeValue: number`, `leadTimeUnit: enum(hours/days)` (gilt nur wenn `mustBeDoneBeforeEvent` true).
  * *Sonderfelder Aufgabe:* `postponedToDate` (Termin verschoben auf), `reportingEventId` (Reporting-Event-Link - für Rollen-Routinen).
  * *Beschluss-Spezifisch:* Arrays für `approvedBy`, `rejectedBy`, `abstainedBy` (Wer hat zugestimmt/abgelehnt/enthalten).

## 6. Unterstützung der DSGVO-Konformität
Das System liefert technische Werkzeuge zur Unterstützung von Datensparsamkeit und Löschpflichten:
* **Datensparsamkeit:** Helfer-Kontaktdaten sind strikt optional.
* **Nachweis-Unterstützung:** Ein Helfer darf im UI nur angelegt werden, wenn `consentConfirmed` ("Person wurde über Speicherung informiert") gesetzt wird.
* **Pragmatischer Lösch-Workflow:** Das System berechnet Ablaufdaten (`retentionExpiresAt`) für Helfer und präsentiert diese Admins zur endgültigen Löschung.

## 7. Datenmigration & Abwärtskompatibilität
* **DataProcessor:** Alle Daten durchlaufen vor dem Laden in den Store einen zentralen `DataProcessor`.
* **On-the-Fly Migration:** Veraltete Datensätze mit älterer `schemaVersion` werden über Adapter in das aktuelle TypeScript-Interface migriert.

## 8. Nicht im Scope / bewusste Abgrenzung
* **Keine Mitgliederverwaltung.**
* **Keine Dokumentenverwaltung.**
* **Kein Kassen- oder Buchungssystem.**
* **Keine automatischen externen Benachrichtigungen.**
* **Keine Mehrmandantenfähigkeit.**

## 9. Entwicklungsrichtlinien (Strict Code Integrity Protocol)
Die Umsetzung erfolgt strikt im Modus des **"Code-Chirurgen"**. Es gilt das **Strict Code Integrity Protocol** inklusive Zero-Build-Error-Protokoll:

* **Drei-Schritte-Rhythmus:** 1. Verständnis & Analyse, 2. Operations-Plan (inkl. betroffener Dateien und Zeilennummern), 3. Warten auf das explizite "OK".
* **Vollständigkeits-Garantie:** Kein Code wird vereinfacht oder durch Snippets (`// ...`) abgekürzt. Änderungen werden vollständig und nachvollziehbar ausgegeben.
* **Strikte Architektur-Trennung:** Absolute Trennung von Core-Logik und UI.
* **Single Source of Truth:** State Management strikt zentralisiert über `useClubStore.ts`.
* **Typ-Sicherheit:** 100% TypeScript (Zero Any).
* **PWA & I18N Fokus:** Zwingende Berücksichtigung von Multi-Device-Nutzung und Mehrsprachigkeit (DE/EN).