// src/core/types/models.ts

export interface BaseDocument {
  id: string;
  schemaVersion: string;
}

export type UserRole = 'ADMIN' | 'VORSTAND';

export interface UserPermissions {
  canCreateTasks: boolean;
  canUpdateTaskStatus: boolean;
  canManageComments: boolean;
  canDeleteOwnTasks: boolean;
  canDeleteAnyTask: boolean;
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

export type TaskStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface TaskChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface Task extends BaseDocument {
  title: string;
  status: TaskStatus;
  dueDate: string;
  protocol_id?: string;
  event_id?: string;
  assignee_ids: string[];
  helper_ids: string[];
  checklist: TaskChecklistItem[];
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

export interface Event extends BaseDocument {
  title: string;
  startDate: string;
  endDate: string;
  location: string;
}

// Exakte Zeilenzahl: 59
