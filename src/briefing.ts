// src/briefing.ts
/**
 * ============================================================================
 * SYSTEM-DOKUMENTATION & KI-PROTOKOLL: PapaToDo (V1.1)
 * ============================================================================
 * WICHTIG FÜR JEDEN KI-AGENTEN: 
 * Lese dieses Dokument vollständig, bevor du Code für dieses Projekt generierst,
 * refaktorierst oder veränderst. Bestätige den "Handshake" am Ende!
 * * ----------------------------------------------------------------------------
 * A. PROJEKTÜBERSICHT: WAS TUT PAPATODO?
 * ----------------------------------------------------------------------------
 * PapaToDo ist eine Serverless PWA (Progressive Web App), die als zentrales 
 * Organisations- und Task-Management-Tool für Vereine konzipiert ist.
 * * Kernfunktionen:
 * - Vereinskalender: Verwaltung von Terminen, Diensten und ICS-Abonnements 
 * (inkl. einer öffentlichen Embed-Ansicht für die Vereinswebseite).
 * - Sitzungsprotokolle: Strukturierte Agenda-Verwaltung direkt in den Terminen.
 * - Task-Management: ToDos (als Kanban-Board oder Liste), verknüpft mit 
 * Verantwortlichen (Benutzern/Gruppen) und Terminen.
 * - Nutzerverwaltung: Verwaltung von Mitgliedern, Helfern und Berechtigungsgruppen.
 * - Vorlagen (Templates): Wiederverwendbare Agenda- und Aufgaben-Strukturen.
 * * Tech-Stack: React 18, TypeScript, Vite, Tailwind CSS, Zustand, Firebase/Firestore.
 * * ----------------------------------------------------------------------------
 * B. DATEI- & KERNFUNKTIONS-REGISTER (FILE MAP)
 * ----------------------------------------------------------------------------
 * Dies ist die architektonische Landkarte von PapaToDo:
 * * CORE & SERVICES:
 * - `src/core/types/models.ts`: SSOT für alle Datenstrukturen (Zero Any!).
 * - `src/services/firebase.ts`: Firebase Initialisierung.
 * - `src/services/DataProcessor.ts`: Generische CRUD-Operationen für Firestore.
 * * STATE MANAGEMENT (ZUSTAND):
 * - `src/store/useClubStore.ts`: Der zentrale Hook, bündelt alle Slices.
 * - `src/store/slices/*`: Modulare Slices für Auth, Tasks, Events, User, Templates.
 * * FEATURES (UI & LOGIK):
 * - `src/features/Auth/`: LoginView und AuthGuard (Sicherheitsschranke).
 * - `src/features/Dashboard/`: Startseite mit aktuellen Todos und nächsten Terminen.
 * - `src/features/Events/`: 
 * - `CalendarView.tsx`: Interaktiver Hauptkalender (react-big-calendar).
 * - `PublicCalendarEmbed.tsx`: Read-only Iframe für die Website.
 * - `EventDetailView.tsx` & `ProtocolEditor.tsx`: Sitzungen & Protokolle.
 * - `src/features/Tasks/`: `TasksView.tsx`, `KanbanBoard.tsx` (Todo-Verwaltung).
 * - `src/features/Users/`: `UsersView.tsx` (Mitglieder- und Gruppenverwaltung).
 * - `src/features/Templates/`: `TemplatesView.tsx` (Vorlagen-Management).
 * * ----------------------------------------------------------------------------
 * C. ARCHITEKTUR-GESETZE (STRICT BOUNDARIES)
 * ----------------------------------------------------------------------------
 * 1. Keine UI in der Core-Logik: Firebase-Calls und Daten-Transformationen 
 * dürfen NIEMALS JSX zurückgeben oder das DOM manipulieren.
 * 2. Keine Business-Logik in der UI: React-Komponenten (in src/features/*) sind 
 * reine "Dumb Components". Sie zeigen State an und triggern Store-Actions.
 * 3. Single Source of Truth (SSOT): `useClubStore.ts` ist die einzige Wahrheit.
 * 4. PWA First: Die App muss offline-fähig konzipiert bleiben (Kein eigener Server).
 * * ----------------------------------------------------------------------------
 * D. THE "STRICT CODE INTEGRITY PROTOCOL" (CODE-CHIRURG MODUS)
 * ----------------------------------------------------------------------------
 * Jeder Eingriff durch eine KI MUSS nach den Regeln des "Code-Chirurgen" ablaufen:
 * * 1. Immutable Source Mandate: Behandle hochgeladenen Code als unumstößliche 
 * Wahrheit. Ändere NUR die betroffenen Zeilen. Keine "Aufräumarbeiten".
 * 2. Three-Step-Operations: 
 * a. Analyse | b. Plan (Datei & Zeilen) | c. Warten auf 'OK'.
 * 3. The "No-Snippet" Veto: Dateien IMMER zeichengenau von Zeile 1 bis Ende 
 * ausgeben. Auslassungen wie `// ...` sind strengstens verboten!
 * 4. Der EOF-Marker: Jede generierte Code-Datei MUSS zwingend mit der exakten 
 * Zeilenzahl abschließen: `// Exakte Zeilenzahl: [Zahl]`
 * * ----------------------------------------------------------------------------
 * E. THE "HANDSHAKE" (MANDATORY CONFIRMATION)
 * ----------------------------------------------------------------------------
 * ZWINGENDE REGEL FÜR DIE KI ZU BEGINN EINES CHATS:
 * "Ich habe die PapaToDo-Architektur und das Strict Code Integrity Protocol 
 * verstanden. Ich werde ausschließlich chirurgisch arbeiten, vollständige 
 * Dateien inkl. EOF-Marker liefern und die System-Grenzen respektieren."
 * ============================================================================
 */

export const systemVersion = "1.1.0";
// Exakte Zeilenzahl: 83