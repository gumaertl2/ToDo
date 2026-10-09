// [2026-10-09] - FEATURE: Logistik- und Betreuerplanung (requiresBetreuer, requiresFahrer, betreuerHelperIds, fahrerHelperIds) in Team und MatchLineup ergänzt.
// [2026-10-08] - FEATURE: Optionale Adressfelder (strasse, plz, ort) zum Helper-Modell hinzugefügt.
// [2026-10-08] - SCHEMA: 'PollConfig' und 'EventPollResponse' für flexibles RSVP/Umfrage-Feature (WhatsApp-Style) hinzugefügt.
// [2026-10-08] - SCHEMA: 'isSetByMF' im MatchLineup-Modell hinzugefügt (Fremdsteuerung durch MF).
// [2026-10-04] - SCHEMA: 'lastSyncAttemptAt' im CalendarSubscription-Modell hinzugefügt, um fehlgeschlagene Versuche vom letzten erfolgreichen Sync (lastSyncedAt) zu trennen.
// [2026-10-04] - SCHEMA: 'lastSyncBy' und 'lastSyncError' im CalendarSubscription-Modell hinzugefügt (für Admin-Transparenz).
// [2026-09-30] - SCHEMA: 'lineupFreezeLeadDays' und 'lineupLockMessage' zum Team-Modell hinzugefügt (Auto-Freeze für Aufstellungen).
// [2026-09-30] - SCHEMA: 'isLocked' und 'availabilities' zum MatchLineup-Modell hinzugefügt (Spieler-Rückmeldungen & Siegel).
// [2026-09-28] - SCHEMA: 'captainUserIds' in 'captainHelperIds' geändert, um die Rechteverwaltung direkt an die Mitgliedsakte (Helper) zu knüpfen.
// [2026-09-28] - SCHEMA: 'defaultLineupHelperIds' zum Team hinzugefügt. Neues Modell 'MatchLineup' für Spieltags-Ausnahmen (Schatten-Akte) erstellt.
// [2026-07-28] - SCHEMA: 'hasWrittenDsgvoConsent' (Papierakte) und 'hasYouthWorkClearance' (Unbedenklichkeit Jugendarbeit) zum Helper hinzugefügt.
// [2026-07-27] - SEC-FEATURE: Neues dediziertes Recht 'viewJugend' für DSGVO-konformen Schutz von Minderjährigen-Daten hinzugefügt.
// [2026-07-22] - SCHEMA: Audit-Trail Felder (consentConfirmedAt & consentConfirmedBy) für DSGVO-Clickwrap hinzugefügt.
// [2026-06-11] - ARCHITEKTUR-FIX: Feld 'isHistorical' zu AgendaItem hinzugefügt (Fate-Binding). Löst das Container-Kosmetik-Problem und verhindert Waisenkinder.
// [2026-05-31] - FEATURE: 'completedAt' zu AgendaItem hinzugefügt, um das tatsächliche Erledigungsdatum von der Frist (dueDate) zu trennen.
// [2026-05-21] - BUGFIX: isPublic zu ClubEvent hinzugefügt, um "Auf Homepage zeigen" strikt von "Agenda veröffentlicht" (isPublished) zu trennen.
// [2026-05-16] - FEATURE: reminderRecipient Arrays für in-app Erinnerungen bei Terminen und Abos ergänzt
// [2026-05-15] - FEATURE: Option B - arrays für Team-IDs in Events, Tasks und Pins ergänzt
// [2026-05-15] - FEATURE: Option B (Sauberer Schnitt) - Team-Logik für Mitglieder hinzugefügt
// 2026-04-18 19:00 - FEATURE: Trennung von App-Nutzern und Rollen
// 2026-04-18 21:45 - FIX: RBAC Rechte (viewEhrungen, manageMitglieder) zum UserPermissions Interface hinzugefügt
// 2026-04-20 18:00 - FEATURE: lastActivityAt Feld für App-Nutzer ergänzt
// 2026-04-22 19:40 - FEATURE: Detaillierte Anwesenheits-Felder (Entschuldigt/Unentschuldigt) für Protokolle
// 2026-04-22 20:10 - FEATURE: protocolIndex Feld für AgendaItems hinzugefügt
// 2026-04-23 15:30 - FEATURE: Feld telefonEltern bei Helper hinzugefügt
// 2026-04-24 06:45 - FEATURE: 1-Level Aufgaben-Hierarchie (isSubItem, parentItemId) implementiert
// 2026-04-24 22:00 - SCHEMA: isTemplate Feld hinzugefügt, um beliebige ItemTypes als Vorlage zu erlauben
// 2026-04-30 10:00 - SEC-FEATURE: Berechtigung 'viewAllReminders' für datenschutzkonforme Erinnerungsansicht ergänzt
// 2026-04-30 16:45 - FEATURE: Wettkampf-Tresor (TeamPins) und zugehörige Rechte hinzugefügt
// 2026-04-30 18:10 - FEATURE: Feld emailEltern bei Helper (Mitgliedern) hinzugefückt
// 2026-05-02 09:37 - SCHEMA: 'half_yearly' zu den Recurrence-Patterns für Events und Routinen hinzugefügt
// 2026-05-02 10:00 - SCHEMA: Relative Terminierung für Unteraufgaben (leadTimeUnit) angepasst
// 2026-05-11 18:40 - LOGIK-FIX: 'viewRoles' ist nun ein reines Lese-Recht. Schreibrechte für Rollen hängen nun an 'viewAppUsers'.
// 2026-05-13 15:45 - CHIRURGISCHER EINGRIFF: Soft-Delete (TRASH) implementiert und ungenutzte Rechte entfernt
// 2026-05-14 14:20 - FEATURE: hasAppAccess & lastAppLoginAt beim Helper für die Gast-Zugangs-Prüfung ergänzt
// 2026-05-14 15:00 - FEATURE: assignedHelperIds beim TeamPin für die Sichtbarkeit von Gästen hinzugefügt
// src/core/types/models.ts

export interface BaseDocument {
  id: string;
  schemaVersion: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface RolePermissions {
  viewDashboard: boolean;
  viewEvents: boolean;
  viewTasks: boolean;
  viewCalendar: boolean;
  viewUsers: boolean;
  viewReports: boolean;
  viewReminders: boolean;
  viewTemplates: boolean;
  
  viewAppUsers: boolean; 
  viewRoles: boolean;    
  
  viewEhrungen: boolean;
  viewJugend: boolean; 
  viewAllReminders: boolean;
  
  viewTeamPins: boolean;
  manageTeamPins: boolean;
  
  manageMitglieder: boolean;
  manageCalendarSetup: boolean;
  manageEvents: boolean;
  
  deleteAnyItem: boolean;
}

export interface RoleProfile extends BaseDocument {
  name: string;
  description?: string;
  isSystemRole?: boolean; 
  permissions: RolePermissions;
}

export type UserRole = 'ADMIN' | 'VORSTAND' | 'BEREICHSLEITER';

export interface UserPermissions {
  canUpdateTaskStatus: boolean;
  canManageComments: boolean;
  canDeleteAnyTask: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  
  viewEhrungen?: boolean;
  viewJugend?: boolean; 
  viewAllReminders?: boolean;
  
  viewTeamPins?: boolean;
  manageTeamPins?: boolean;
  
  manageMitglieder?: boolean;
}

export interface User extends BaseDocument {
  name: string;
  amt: string;
  rolle: string; 
  roleProfileId?: string; 
  email: string;
  telefon?: string;
  groupIds: string[];
  permissions?: UserPermissions; 
  lastActivityAt?: number; 
}

export interface Team extends BaseDocument {
  name: string;
  captainHelperIds?: string[];      
  defaultLineupHelperIds?: string[]; 
  lineupFreezeLeadDays?: number;     
  lineupLockMessage?: string;        
  requiresBetreuer?: boolean; // <--- NEU
  requiresFahrer?: boolean;   // <--- NEU
}

export interface Group extends BaseDocument {
  name: string;
  description?: string;
  color?: string; 
}

export interface Helper extends BaseDocument {
  teamIds?: string[];
  name: string;
  alias: string;
  bezug: string;
  email: string;
  telefon: string;
  telefonEltern?: string; 
  emailEltern?: string;
  geburtsdatum?: string; 
  eintrittsdatum?: string;
  memberStatus?: 'AKTIV' | 'PASSIV' | 'JUGEND';

  strasse?: string;
  plz?: string;
  ort?: string;
  
  hasWrittenDsgvoConsent?: boolean;
  hasYouthWorkClearance?: boolean;

  consentConfirmed: boolean;
  dsgvoConsentVersion?: number;
  consentConfirmedAt?: number;
  consentConfirmedBy?: 'USER' | 'ADMIN';

  lastActivityAt: number;
  retentionExpiresAt: number;

  hasAppAccess?: boolean;
  lastAppLoginAt?: number;
}

// ---> NEU: Umfrage / RSVP Konfiguration <---
export interface PollOption {
  id: string;
  text: string;
}

export interface PollConfig {
  isActive: boolean;
  isMultipleChoice: boolean;
  options: PollOption[];
}

export interface ClubEvent extends BaseDocument {
  title: string;
  description?: string;
  location?: string;
  status: 'PLANUNG' | 'AKTIV' | 'ABGESCHLOSSEN';
  eventType?: 'TERMIN' | 'DIENST'; 
  reminderSenderUserId?: string;  
  reminderLeadDays?: number;      
  reminderSentAt?: number;        
  reminderCustomText?: string;    
  isPublished: boolean; 
  isPublic?: boolean; 
  seriesId?: string;    
  isArchived?: boolean; 
  participantUserIds: string[];
  participantGroupIds: string[];
  participantTeamIds?: string[];
  participantHelperIds?: string[];
  
  actualAttendeeUserIds?: string[];
  excusedAttendeeUserIds?: string[];
  unexcusedAttendeeUserIds?: string[];
  attendanceConfirmed?: boolean;

  plannedStartTime?: number;
  plannedEndTime?: number;
  actualEndTime?: number;
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  startDate?: number;
  endDate?: number;
  occurrenceCount?: number;
  nextEventDate?: number;

  pollConfig?: PollConfig; 
}

export type Event = ClubEvent;

export type ItemType = 'AGENDA' | 'INFO' | 'BESCHLUSS' | 'AUFGABE' | 'VORLAGE';
export type ItemStatus = 'OFFEN' | 'IN_ARBEIT' | 'ERLEDIGT' | 'TRASH';
export type TaskStatus = ItemStatus;

export interface ItemComment {
  id: string;
  text: string;
  authorId: string;
  createdAt: number;
}

export interface AgendaItem extends BaseDocument {
  type: ItemType;
  title: string;
  description?: string;
  eventId?: string; 
  baseItemId?: string; 
  durationEstimate?: number;
  durationActual?: number;
  requestedBy?: string;
  status: ItemStatus;
  progress: number; 
  dueDate?: number; 
  completedAt?: number;
  assigneeUserIds: string[];  
  assigneeGroupIds: string[]; 
  assigneeHelperIds?: string[];
  assigneeTeamIds?: string[];    
  reminderSenderUserId?: string;  
  reminderLeadDays?: number;      
  reminderSentAt?: number;        
  comments: ItemComment[];
  checkliste: { id: string; text: string; isDone: boolean }[];
  
  mustBeDoneBeforeEvent?: boolean; 
  leadTimeValue?: number;
  leadTimeUnit?: 'days_before' | 'days_after' | 'same_day';
  
  isDueNextMeeting?: boolean;
  isRoutine?: boolean;
  routinePattern?: 'every_meeting' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  routineEndDate?: number;
  postponedToDate?: number;
  reportingEventId?: string;
  approvedBy?: string[];
  rejectedBy?: string[];
  abstainedBy?: string[];
  protocolIndex?: number;
  isSubItem?: boolean;
  parentItemId?: string;
  isTemplate?: boolean;
  
  isHistorical?: boolean; 
  
  deletedAt?: number;
  deletedBy?: string;
}

export type Task = AgendaItem;

export interface CachedIcsEvent {
  uid: string;
  title: string;
  description?: string;
  location?: string;
  startTime: number;
  endTime: number;
  isAllDay: boolean;
  reminderSentAt?: number;
}

export interface CalendarSubscription extends BaseDocument {
  name: string;
  url: string;
  color: string;
  isActive: boolean;
  lastSyncedAt?: number;
  lastSyncAttemptAt?: number;  
  lastSyncBy?: string;         
  lastSyncError?: string | null; 
  cachedEvents?: CachedIcsEvent[];
  sortOrder?: number; 
  showInMatchPlan?: boolean;
  reminderSenderUserId?: string;  
  reminderLeadDays?: number;      
  reminderCustomText?: string;
  
  reminderRecipientUserIds?: string[];
  reminderRecipientGroupIds?: string[];
  reminderRecipientTeamIds?: string[];
  reminderRecipientHelperIds?: string[];
}

export interface CalendarEvent extends BaseDocument {
  title: string;
  startTime: number;
  endTime?: number;
  isAllDay: boolean;
  location?: string;
  description?: string;
  color?: string;
  isPublic: boolean;
  seriesId?: string; 
  showInMatchPlan?: boolean;
  eventType?: 'TERMIN' | 'DIENST'; 
  reminderSenderUserId?: string;  
  reminderLeadDays?: number;      
  reminderSentAt?: number;        
  reminderCustomText?: string;    

  reminderRecipientUserIds?: string[];
  reminderRecipientGroupIds?: string[];
  reminderRecipientTeamIds?: string[];
  reminderRecipientHelperIds?: string[];

  pollConfig?: PollConfig; 
}

export interface TeamPin extends BaseDocument {
  teamName: string;                 
  signaturePinsText: string;        
  signatureUrl?: string;            
  gameEntryPinsText: string;        
  gameEntryUrl?: string;            
  assignedUserIds: string[];        
  assignedGroupIds: string[];       
  assignedHelperIds?: string[];
  assignedTeamIds?: string[];     
}

export interface MatchLineup {
  id: string;
  schemaVersion: string;
  teamId: string;
  lineupHelperIds: string[];
  isLocked?: boolean;
  availabilities?: Record<string, 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'>; 
  isSetByMF?: Record<string, boolean>; 
  
  betreuerHelperIds?: string[]; // <--- NEU
  fahrerHelperIds?: string[];   // <--- NEU
  
  updatedAt?: number;
}

export interface EventPollResponse extends BaseDocument {
  eventId: string;
  helperId: string;
  selectedOptionIds: string[];
  comment?: string;
}
// --- END OF FILE ---