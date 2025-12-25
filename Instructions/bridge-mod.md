You are Codex.

Create a NEW, SEPARATE module in the existing NestJS + Prisma backend called:

modules/legacy-units-bridge/

This module is TEMPORARY and MUST:
- Be fully isolated from auth, users, roles, permissions
- NOT depend on JWT, guards, or RBAC
- Only accept legacy identifiers passed explicitly in requests

DO NOT modify existing auth/user modules.

GOAL
Provide a clean bridge to track:
- units created by legacy admins
- which legacy tenant occupies which unit
- scoped by legacyAdminId and legacyBuildingId

ASSUMPTIONS
- One legacy admin owns many buildings
- One building belongs to one admin
- Unit identity = (legacyBuildingId + unitNumber)
- Units are created before tenants
- No reservation flow; rely on DB constraints
- Tenants can move in/out; occupancy history required
- One active unit per tenant (v1)

DATA MODEL (Prisma)
Create minimal tables:

1) BuildingBridge
- legacyBuildingId (int, unique)
- legacyAdminId (int)
- buildingName (string)
- timestamps

2) UnitBridge
- id (uuid)
- legacyBuildingId (int)
- unitNumberRaw (string)
- unitNumberNorm (string)
- unitTypeName (string?, optional)
- status enum: AVAILABLE | OCCUPIED | INACTIVE
- timestamps
- unique (legacyBuildingId, unitNumberNorm)

3) OccupancyBridge
- id (uuid)
- legacyTenantId (int)
- unitId (uuid)
- startDate (datetime)
- endDate (datetime, nullable)
- timestamps
- enforce:
  - only one active occupancy per unit
  - only one active unit per tenant

BEHAVIOR RULES
- When creating a unit:
  - auto-create BuildingBridge if missing
  - if building exists and legacyAdminId mismatches → reject
  - normalize unitNumber for uniqueness
  - create unit as AVAILABLE
- When linking tenant to unit:
  - unit must exist
  - unit must be AVAILABLE
  - create occupancy with startDate
  - mark unit OCCUPIED
  - on conflict → return 409

API ENDPOINTS (no auth guards)
- POST /legacy-bridge/units
- GET  /legacy-bridge/units/by-admin/:legacyAdminId
- GET  /legacy-bridge/units/by-building/:legacyBuildingId
- POST /legacy-bridge/occupancy/assign
- POST /legacy-bridge/occupancy/unassign
- GET  /legacy-bridge/occupancy/by-tenant/:legacyTenantId

ERROR HANDLING
- Use consistent JSON errors
- Use 409 for conflicts (unit exists, already occupied, etc.)

QUALITY
- Keep logic in services
- DB access in repos
- No cross-module imports
- Easy to delete or migrate later

DO NOT:
- Add auth
- Add user tables
- Add permissions
- Add background jobs
