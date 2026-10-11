/**
 * Shared between the character at the desk and the monitor: the screen only fills in while someone is
 * actually typing. `present` stays false when there's no character, and the monitor then types on its own.
 */
export const typing = { present: false, active: false };
