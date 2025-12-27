export enum MaintenanceRequestStatusEnum {
  OPEN = 'OPEN',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

export const MAINTENANCE_STATUS_TRANSITIONS: Record<
  MaintenanceRequestStatusEnum,
  MaintenanceRequestStatusEnum[]
> = {
  [MaintenanceRequestStatusEnum.OPEN]: [MaintenanceRequestStatusEnum.ASSIGNED],
  [MaintenanceRequestStatusEnum.ASSIGNED]: [
    MaintenanceRequestStatusEnum.IN_PROGRESS,
  ],
  [MaintenanceRequestStatusEnum.IN_PROGRESS]: [
    MaintenanceRequestStatusEnum.COMPLETED,
  ],
  [MaintenanceRequestStatusEnum.COMPLETED]: [],
  [MaintenanceRequestStatusEnum.CANCELED]: [],
};
