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
  date: number; // Timestamp
  location?: string;
  status: 'PLANUNG' | 'AKTIV' | 'ABGESCHLOSSEN';
  participantUserIds: string[];
  participantGroupIds: string[];
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
  eventId?: string;
  
  // Timeboxing
  durationEstimate?: number;
  durationActual?: number;

  // Aufgaben-Spezifisch
  status: ItemStatus;
  progress: number;
  dueDate?: number;
  assigneeUserIds: string[];
  assigneeGroupIds: string[];
  comments: ItemComment[];
  checkliste: { id: string; text: string; isDone: boolean }[];

  // Protokoll-Spezifisch
  requestedBy?: string;
  
  // Beschluss-Spezifisch
  approvedBy?: string[];
  rejectedBy?: string[];
  abstainedBy?: string[];
}

export type Task = AgendaItem;
