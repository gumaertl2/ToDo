// src/core/types/models.ts

export interface BaseDocument {
  id: string;
  schemaVersion: string;
  createdAt?: number;
  updatedAt?: number;
}

export type UserRole = 'ADMIN' | 'VORSTAND' | 'BEREICHSLEITER';

export interface UserPermissions {
  canCreateTasks: boolean;
  canUpdateTaskStatus: boolean;
  canManageComments: boolean;
  canDeleteOwnTasks: boolean;
  canDeleteAnyTask: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
}

export interface User extends BaseDocument {
  name: string;
  amt: string;
  rolle: UserRole;
  email: string;
  telefon?: string;
  groupIds: string[];
  permissions: UserPermissions;
}

export interface Group extends BaseDocument {
  name: string;
  description?: string;
}

export interface Helper extends BaseDocument {
  name: string;
  bezug: string;
  email: string;
  telefon: string;
  consentConfirmed: boolean;
  lastActivityAt: number;
  retentionExpiresAt: number;
}

export interface Template extends BaseDocument {
  title: string;
  category: ProtocolItemCategory;
  defaultDurationMin: number;
}

export type LeadTimeUnit = 'HOURS' | 'DAYS';

export interface Routine extends BaseDocument {
  title: string;
  mustBeDoneBeforeEvent: boolean;
  leadTimeValue?: number;
  leadTimeUnit?: LeadTimeUnit;
}

export type ProtocolItemCategory = 'INFO' | 'DECISION' | 'TASK';

export interface ProtocolItem extends BaseDocument {
  category: ProtocolItemCategory;
  task_id?: string;
}

export interface Protocol extends BaseDocument {
  date: string;
  participants: string[];
  items: ProtocolItem[];
}

export interface ClubEvent extends BaseDocument {
  title: string;
  description?: string;
  location?: string;
  status: 'PLANUNG' | 'AKTIV' | 'ABGESCHLOSSEN';
  
  // Workflow-Status
  isPublished: boolean; // true = Für alle sichtbar, false = Entwurf
  seriesId?: string;    // Bündelt Einzelsitzungen zu einer logischen Serie/Projekt
  
  participantUserIds: string[];
  participantGroupIds: string[];
  
  // Zeiten
  plannedStartTime?: number;
  plannedEndTime?: number;
  actualEndTime?: number;
  
  // Wiederkehrend
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: number;
  endDate?: number;
  occurrenceCount?: number;
}

export type Event = ClubEvent;

export type ItemType = 'AGENDA' | 'INFO' | 'BESCHLUSS' | 'AUFGABE' | 'VORLAGE';
export type ItemStatus = 'OFFEN' | 'IN_ARBEIT' | 'ERLEDIGT';
export type TaskStatus = ItemStatus;

export interface ItemComment {
  id: string;
  text: string;
  authorId: string;
  createdAt: number;
}

export interface AgendaItem extends BaseDocument {
  // Basis-Meta
  type: ItemType;
  title: string;
  description?: string;
  eventId?: string; // Kopplung an eine Sitzung/Event
  
  // Timeboxing & Einbringer
  durationEstimate?: number;
  durationActual?: number;
  requestedBy?: string;

  // Aufgaben-Spezifisch (Task/Kanban)
  status: ItemStatus;
  progress: number; // 0 bis 100 Prozent
  dueDate?: number; // Timestamp für "Bis wann"
  assigneeUserIds: string[];  // Zuweisung an Personen
  assigneeGroupIds: string[]; // Zuweisung an Rollen/Ämter
  comments: ItemComment[];
  checkliste: { id: string; text: string; isDone: boolean }[];

  // Event-Bindung & Kaskaden (Reverse-Scheduling)
  mustBeDoneBeforeEvent?: boolean;
  leadTimeValue?: number;
  leadTimeUnit?: 'hours' | 'days';

  // Sonderfelder Aufgabe
  postponedToDate?: number;
  reportingEventId?: string;

  // Beschluss-Spezifisch
  approvedBy?: string[];
  rejectedBy?: string[];
  abstainedBy?: string[];
}

export type Task = AgendaItem;
