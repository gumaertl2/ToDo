# Projektbeschreibung: PapaToDo (PWA)

## 1. Ausgangslage und Zielsetzung
Ein kleiner Verein (ca. 100 Mitglieder) mit einem 5-köpfigen Vorstand benötigt ein zentrales, digitales Werkzeug zur effizienten Organisation der Vorstandsarbeit.

Ziel ist es, wiederkehrende Aufgaben, Event-Planungen und Vorstandssitzungen zu strukturieren. Das Tool soll Aufgaben aus Protokollen generieren, rollenspezifische Routinen planen und Event-Aufgaben automatisch mit Fristen kaskadieren. Um den Vereinsalltag abzubilden, können Aufgaben an engagierte Helfer (ohne eigenen Systemzugang) delegiert und in Checklisten untergliedert werden. Ein Kanban-Board sorgt für die visuelle Übersicht.

## 2. Zielplattformen & Technologie-Stack
Die Anwendung wird als **Progressive Web App (PWA)** konzipiert. Sie funktioniert plattformübergreifend auf Windows-PCs, Macs, iPhones, Android-Smartphones und Tablets.

* **Architektur:** Serverless, Offline-First.
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

### A. Sitzungen, Protokolle & Der Kern-Workflow
Der Ablauf vom Event bis zur fertigen Protokollierung folgt einem strengen Pfad (Plan/Ist -> Agenda -> Protokoll):
* **Vorlagen & Metadaten:** Protokoll-Vorlagen fragen stets feste Kopfdaten ab: Datum, Uhrzeit Beginn, Uhrzeit Ende, Wer ist anwesend, Wer ist abwesend.
* **Agenda-Baustein-Bibliothek:** Die Agenda wird per Klick aus Standard-Bausteinen (z. B. "Kassenstand") zusammengestellt. Erstellt ein Nutzer einen neuen Punkt, kann er diesen in die Vorlagensammlung kopieren. Jeder Punkt enthält ein Timeboxing (geplante vs. tatsächliche Dauer).
* **Der Pendenzen-Automatismus:** Das System prüft beim Erstellen einer Agenda alte Protokolle derselben Event-Serie. Alle noch offenen ToDos sowie alle seit dem letzten Protokoll erledigten Aufgaben werden vollautomatisch als Tagesordnungspunkte in die neue Agenda übernommen.
* **Live-Erfassung (Transformation):** Am Tag der Sitzung wandelt das System die Agenda (Plan) in ein Protokoll (Ist) um. Punkte werden über Auswahllisten kategorisiert (Info, Beschluss, Aufgabe).

### B. Aufgabenverwaltung & Delegation (Task Management)
* **Automatisierung aus Protokollen:** Wird im Protokoll eine "Aufgabe" definiert, generiert das System automatisch einen Eintrag in der Aufgabenliste des Verantwortlichen (Einzelperson, mehrere Personen oder Gruppen).
* **Transparenz & Ansichten:** Jeder Vorstand kann alle Protokolle und offenen Aufgaben einsehen (Filter: "Alle" / "Nur meine").
* **Bearbeitung & Kanban:** Visuelles Kanban-Board (Drag & Drop) zur Statusänderung. Text-Kommentare (Updates) und prozentualer Fortschritt (Erledigt in %) können hinzugefügt werden.
* **Checklisten & Delegation:** Aufgaben können in kleine Checklisten-Punkte (Subtasks) unterteilt und an externe Helfer delegiert werden.

### C. Automatisierung, Events & In-App-Hinweise
* **Wiederkehrende Routinen (mit Reporting-Link):** Feste Aufgaben sind an Rollen/Gruppen geknüpft und werden zum Stichtag (z.B. 1.4.) generiert. Diese Aufgaben werden vom System automatisch einem Event zugeordnet (z. B. "Abteilungsleitersitzung"), in dem der Bericht erfolgen muss.
* **Event-Kaskaden (Reverse-Scheduling):** Bei Events (z. B. "Sommerfest") erzeugt das System aus Vorlagen sofort Folgeaufgaben und berechnet die Fristen rückwärts vom Event-Datum.
* **In-App-Erinnerungen & Fälligkeitsanzeigen:** Fällige Aufgaben werden im Dashboard und in den Aufgabenlisten visuell hervorgehoben (z. B. "heute fällig", "überfällig", "diese Woche"). Vordefinierte Filter ermöglichen schnellen Zugriff auf Aufgaben, die Aufmerksamkeit benötigen. Alle Hinweise sind nur innerhalb der App für eingeloggte Vorstände sichtbar.
* **Export für Kalender:** System-Kalender mit ICS-Export für die persönliche Kalenderintegration. Mitglieder-Events können als PDF für die Homepage exportiert werden.

### D. Menüstruktur & Navigation (App-Layout)
* **👥 User & Gruppen Verwaltung:** Anlage von Vorständen/Helfern, Definition von Gruppen (z.B. Spieler, Abteilungsleitung).
* **📅 Event Verwaltung & Sitzungen:** Übersicht offener Events/Serien, Agenda erstellen, Protokoll-Transformation.
* **📋 Aufgaben- & Textbaustein Verwaltung:** Pflege der Agenda-Bausteine, globaler Aufgabens-Kaskaden und Rollen-Routinen.
* **✅ Meine ToDos & Reports:** Kanban-Board, ToDo-Listen abrufen, Agenda/Protokoll versenden.

## 4. Rechtesystem, RBAC & Offline-Architektur
Das System nutzt Role-Based Access Control (RBAC), zwingend abgesichert durch serverseitige **Firestore Security Rules**:

* **Admin (Login):** Systemkonfiguration, Benutzerverwaltung, Freigabe von DSGVO-Löschungen.
* **Vorstand (Login):** Erstellt Protokolle, plant Events, schließt eigene Aufgaben ab.
* **Helfer (Kein Login):** Reine Daten-Entität.

### Architektur-Präzisierungen
* **Auth-State-Persistenz:** Auf nicht vertrauenswürdigen Geräten wird für Firebase Auth ein Session-Modus verwendet, damit der Anmeldestatus nur für die aktuelle Browser-Sitzung erhalten bleibt.
* **Firestore-Cache:** Firestore verwendet im Web standardmäßig einen Memory-Cache. Ein persistenter lokaler IndexedDB-Cache wird nur nach expliziter Bestätigung im UI aktiviert ("Ist dies ein vertrauenswürdiges, privates Gerät?").
* **Konfliktmodell:** Bei Standardfeldern gilt das Firestore-übliche Schreibverhalten des zuletzt synchronisierten Werts. Für kritische Mehrfachänderungen wird ein einfaches, explizites Konfliktmodell mit klaren Schreibregeln definiert. Firestore Transactions werden nur für Online-Fälle eingesetzt, in denen atomare Konsistenz fachlich zwingend erforderlich ist.

## 5. Datenmodell (Flache NoSQL-Struktur)
Zur Minimierung unnötiger Lesezugriffe wird eine flache Struktur verwendet. Jedes persistierte Dokument enthält verpflichtend ein Feld `schemaVersion`.

* **`users`:** ID, Name, Amt, Systemrolle, Kontaktdaten. **Zuordnung zu Gruppen:** Jeder User muss zu mindestens einer Gruppe gehören; Mehrfachzugehörigkeit zu mehreren Gruppen gleichzeitig ist zulässig (Array `groupIds: string[]`, Mindestelemente: 1).
* **`helpers`:** ID, Name, Bezug, `consentConfirmed`, optionale Kontaktdaten, `lastActivityAt`, `retentionExpiresAt`.
* **`events`:** Titel, Ort, **Teilnehmer:** `participantUserIds: string[]` (einzelne User) und `participantGroupIds: string[]` (ganze Gruppen), Typ (Einmalig/Wiederkehrend). **Wiederkehrend:** `recurrencePattern` (täglich/wöchentlich/monatlich/quartalsweise/jährlich), `startDate`, `endDate`, `occurrenceCount` (entweder `endDate` oder `occurrenceCount`, nicht beide). Zeiten: Geplanter Beginn, Geplantes Ende, Tatsächliches Ende.
* **`protocols` & `protocol_items`:** Sitzungsdaten. Agendapunkte enthalten `geplante_dauer_min`, `tatsaechliche_dauer_min`, `requestedBy` (wer hat den Punkt eingebracht).
  * *Pflichtfelder Info:* Was, Von wem (`requestedBy`), Wann.
  * *Pflichtfelder Beschluss:* Was, Von wem (`requestedBy`), Wer hat zugestimmt/abgelehnt/enthalten (Listen `approvedBy[]`, `rejectedBy[]`, `abstainedBy[]`).
  * *Pflichtfelder Aufgabe (in Agenda):* Was, Typ.
  * *Pflichtfelder Aufgabe (im Protokoll):* Was, Wer ist zuständig (User/Gruppe), Bis wann, `requestedBy`.
* **`tasks`:** Verweise auf `protocol_id` oder `event_id`, Array für `checkliste`. **Mehrfach-Zuständigkeit:** `assigneeUserIds: string[]` (eine oder mehrere Personen) und `assigneeGroupIds: string[]` (eine oder mehrere Gruppen) — für jede Aufgabe können User und Gruppen kombiniert zugewiesen werden. **Event-Bindung:** `mustBeDoneBeforeEvent: boolean`, `leadTimeValue: number`, `leadTimeUnit: enum(hours/days)` (gilt nur wenn `mustBeDoneBeforeEvent` true). Zusatzfelder: Termin verschoben auf, Erledigt in %, Reporting-Event-Link, `requestedBy` (wer hat diese Aufgabe eingebracht).
* **`templates` & `routines`:** Vorlagen für Agenden, Event-Kaskaden und Agenda-Bausteine.

## 6. Unterstützung der DSGVO-Konformität
Das System nimmt dem Verein die rechtliche Verantwortung nicht ab, liefert aber technische Werkzeuge zur Unterstützung von Datensparsamkeit und Löschpflichten.

* **Datensparsamkeit:** Helfer-Kontaktdaten (Telefon/E-Mail) sind strikt optional.
* **Nachweis-Unterstützung:** Ein Helfer darf im UI nur angelegt werden, wenn das Flag `consentConfirmed` ("Person wurde über Speicherung informiert") gesetzt wird.
* **Pragmatischer Lösch-Workflow:** Das System berechnet Ablaufdaten (`retentionExpiresAt`). Beim Login eines Admins prüft die App im Hintergrund auf abgelaufene Helfer-Profile ohne offene Aufgaben und präsentiert diese im Admin-Dashboard zur manuellen, endgültigen Löschung.
* **Betriebshinweis:** Dieser Workflow setzt voraus, dass sich ein Admin regelmäßig anmeldet und offene Löschhinweise bearbeitet.

## 7. Datenmigration & Abwärtskompatibilität
* **DataProcessor:** Alle Daten durchlaufen vor dem Laden in den Store einen zentralen `DataProcessor`.
* **On-the-Fly Migration:** Veraltete Datensätze mit älterer `schemaVersion` werden über Adapter in das aktuelle TypeScript-Interface migriert.

## 8. Nicht im Scope / bewusste Abgrenzung
Folgende Themen sind ausdrücklich **nicht** Bestandteil des MVP und nicht Teil der Kernarchitektur:

* **Keine Mitgliederverwaltung:** Keine vollständige Verwaltung aller Vereinsmitglieder, Eintritts-/Austrittsprozesse oder allgemeine Vereinsadministration.
* **Keine Dokumentenverwaltung:** Kein Dateiarchiv, kein DMS und keine allgemeine Ablage für Vereinsdokumente.
* **Kein Kassen- oder Buchungssystem:** Keine Finanzbuchhaltung, Beitragsverwaltung oder Zahlungsabwicklung.
* **Keine automatischen externen Benachrichtigungen:** Kein System für automatische E-Mail-, WhatsApp- oder andere externe Messaging-Benachrichtigungen. Alle Erinnerungen und Hinweise sind In-App-basiert.
* **Keine Mehrmandantenfähigkeit:** Die Anwendung ist auf genau einen Verein bzw. eine Organisationseinheit ausgelegt.

## 9. Entwicklungsrichtlinien (Strict Code Integrity Protocol)
Die Umsetzung erfolgt strikt im Modus des **"Code-Chirurgen"**. Es gilt das **Strict Code Integrity Protocol** inklusive Zero-Build-Error-Protokoll:

* **Drei-Schritte-Rhythmus:** 1. Verständnis & Analyse, 2. Operations-Plan (inkl. betroffener Dateien und Zeilennummern), 3. Warten auf das explizite "OK".
* **Vollständigkeits-Garantie:** Kein Code wird vereinfacht oder durch Snippets (`// ...`) abgekürzt. Änderungen werden vollständig und nachvollziehbar ausgegeben.
* **Strikte Architektur-Trennung:** Absolute Trennung von Core-Logik und UI.
* **Single Source of Truth:** State Management strikt zentralisiert über `useClubStore.ts`.
* **Typ-Sicherheit:** 100% TypeScript (Zero Any).
* **PWA & I18N Fokus:** Zwingende Berücksichtigung von Multi-Device-Nutzung und Mehrsprachigkeit (DE/EN).