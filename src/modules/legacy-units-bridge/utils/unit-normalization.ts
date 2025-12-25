export const normalizeUnitNumber = (unitNumber: string): string =>
  unitNumber.trim().toLowerCase().replace(/\s+/g, '');
