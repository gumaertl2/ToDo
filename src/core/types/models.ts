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

export interface ClubEvent extends BaseDocument {
  title: string;
  description?: string;
  location?: string;
  status: 'PLANUNG' | 'AKTIV' | 'ABGESCHLOSSEN';
  
  isPublished: boolean; 
  seriesId?: string;    
  
  participantUserIds: string[];
  participantGroupIds: string[];
  
  plannedStartTime?: number;
  plannedEndTime?: number;
  actualEndTime?: number;
  
  isRecurring?: boolean;
  recurrencePattern?: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate?: number;
  endDate?: number;
  occurrenceCount?: number;

  // CHIRURGISCHER EINGRIFF: Termin für die Folge-Sitzung
  nextEventDate?: number;
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
  type: ItemType;
  title: string;
  description?: string;
  eventId?: string; 
  
  durationEstimate?: number;
  durationActual?: number;
  requestedBy?: string;

  status: ItemStatus;
  progress: number; 
  dueDate?: number; 
  assigneeUserIds: string[];  
  assigneeGroupIds: string[]; 
  comments: ItemComment[];
  checkliste: { id: string; text: string; isDone: boolean }[];

  mustBeDoneBeforeEvent?: boolean;
  leadTimeValue?: number;
  leadTimeUnit?: 'hours' | 'days';

  // CHIRURGISCHER EINGRIFF: Flag für Automatisierung
  isDueNextMeeting?: boolean;

  postponedToDate?: number;
  reportingEventId?: string;

  approvedBy?: string[];
  rejectedBy?: string[];
  abstainedBy?: string[];
}

export type Task = AgendaItem;
// Exakte Zeilenzahl: 106