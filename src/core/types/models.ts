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
// 2026-04-30 18:10 - FEATURE: Feld emailEltern bei Helper (Mitgliedern) hinzugefügt
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
  viewAllReminders: boolean;
  
  // CHIRURGISCHER EINGRIFF: Rechte für den Wettkampf-Tresor
  viewTeamPins: boolean;
  manageTeamPins: boolean;
  
  manageMitglieder: boolean;
  manageCalendarSetup: boolean;
  manageEvents: boolean;
  
  // CHIRURGISCHER EINGRIFF: Ungenutzte Rechte entfernt. 'deleteAnyItem' bleibt für endgültiges Löschen aus dem Papierkorb.
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
  viewAllReminders?: boolean;
  
  // CHIRURGISCHER EINGRIFF: Auch hier als optionale Map-Eigenschaften ergänzt
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
}

export interface Group extends BaseDocument {
  name: string;
  description?: string;
  color?: string; 
}

export interface Helper extends BaseDocument {
  teamIds?: string[]; // Neu: Verknüpfung zu organisatorischen Teams (Option B)
  name: string;
  alias: string;
  bezug: string;
  email: string;
  telefon: string;
  telefonEltern?: string; 
  emailEltern?: string; // CHIRURGISCHER EINGRIFF: Neues Feld für die Eltern-Email
  geburtsdatum?: string; 
  eintrittsdatum?: string;
  memberStatus?: 'AKTIV' | 'PASSIV' | 'JUGEND';
  
  consentConfirmed: boolean;
  // CHIRURGISCHER EINGRIFF: DSGVO Clickwrap Versionierung & Audit Trail
  dsgvoConsentVersion?: number;
  consentConfirmedAt?: number;
  consentConfirmedBy?: 'USER' | 'ADMIN';

  lastActivityAt: number;
  retentionExpiresAt: number;

  // CHIRURGISCHER EINGRIFF: App-Zugangs Tracking
  hasAppAccess?: boolean;
  lastAppLoginAt?: number;
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
  isPublic?: boolean; // CHIRURGISCHER EINGRIFF: Neues Feld für Homepage-Sichtbarkeit
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
  // CHIRURGISCHER EINGRIFF: half_yearly hinzugefügt
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly';
  startDate?: number;
  endDate?: number;
  occurrenceCount?: number;
  nextEventDate?: number;
}

export type Event = ClubEvent;

export type ItemType = 'AGENDA' | 'INFO' | 'BESCHLUSS' | 'AUFGABE' | 'VORLAGE';
// CHIRURGISCHER EINGRIFF: Status 'TRASH' hinzugefügt
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
  completedAt?: number; // CHIRURGISCHER EINGRIFF: Neues Feld für echtes Erledigungsdatum
  assigneeUserIds: string[];  
  assigneeGroupIds: string[]; 
  assigneeHelperIds?: string[];
  assigneeTeamIds?: string[];    
  reminderSenderUserId?: string;   
  reminderLeadDays?: number;       
  reminderSentAt?: number;         
  comments: ItemComment[];
  checkliste: { id: string; text: string; isDone: boolean }[];
  
  // CHIRURGISCHER EINGRIFF: Veraltete Vorlauf-Logik auf "Relativ-Planung" umgebaut
  mustBeDoneBeforeEvent?: boolean; // Lassen wir aus Kompatibilitätsgründen zur alten Datenbank drin, nutzen es aber nicht mehr
  leadTimeValue?: number;
  leadTimeUnit?: 'days_before' | 'days_after' | 'same_day';
  
  isDueNextMeeting?: boolean;
  isRoutine?: boolean;
  // CHIRURGISCHER EINGRIFF: half_yearly hinzugefügt
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
  
  // ---> CHIRURGISCHER EINGRIFF: FATE-BINDING <---
  isHistorical?: boolean; // Markiert Unterpunkte und Oberpunkte, deren Zyklus versiegelt ist
  
  // CHIRURGISCHER EINGRIFF: Soft-Delete Tracking
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
  cachedEvents?: CachedIcsEvent[];
  sortOrder?: number; 
  showInMatchPlan?: boolean;
  reminderSenderUserId?: string;   
  reminderLeadDays?: number;       
  reminderCustomText?: string;
  
  // CHIRURGISCHER EINGRIFF: Empfänger-Arrays für In-App Erinnerungen bei Abos
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

  // CHIRURGISCHER EINGRIFF: Empfänger-Arrays für In-App Erinnerungen bei Terminen
  reminderRecipientUserIds?: string[];
  reminderRecipientGroupIds?: string[];
  reminderRecipientTeamIds?: string[];
  reminderRecipientHelperIds?: string[];
}

export interface TeamPin extends BaseDocument {
  teamName: string;                 // z.B. "Herren 1"
  signaturePinsText: string;        // Der Copy-Paste Text für Unterschriften
  signatureUrl?: string;            // Optionaler Link zum Portal
  gameEntryPinsText: string;        // Der Copy-Paste Text für Spieleingaben
  gameEntryUrl?: string;            // Optionaler Link zum Portal
  assignedUserIds: string[];        // Sichtbarkeit (Mannschaftsführer)
  assignedGroupIds: string[];       // Sichtbarkeit (Ganze Mannschaft)
  assignedHelperIds?: string[];
  assignedTeamIds?: string[];     // CHIRURGISCHER EINGRIFF: Sichtbarkeit (Gäste / Offline-Mitglieder)
}
// --- END OF FILE ---