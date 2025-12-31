export const MAINTENANCE_REQUEST_EVENTS = {
  CREATED: 'maintenance.request.created',
  ASSIGNED: 'maintenance.request.assigned',
  STATUS_CHANGED: 'maintenance.request.status_changed',
  COMMENTED: 'maintenance.request.commented',
  CANCELED: 'maintenance.request.canceled',
} as const;

export type MaintenanceRequestSnapshot = {
  id: string;
  orgId: string;
  buildingId: string;
  unitId?: string | null;
  title: string;
  status?: string | null;
  createdByUserId: string;
  assignedToUserId?: string | null;
  unit?: { id: string; label: string } | null;
};

export type MaintenanceRequestCommentSnapshot = {
  id: string;
  message: string;
};

export type MaintenanceRequestEventPayload = {
  request: MaintenanceRequestSnapshot;
  actorUserId: string;
  actorIsResident?: boolean;
  comment?: MaintenanceRequestCommentSnapshot;
};
