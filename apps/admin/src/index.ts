export const ADMIN_PHASE = 'Phase 07 (Pending)';
export function getAdminStatus() {
  return {
    module: 'admin',
    scheduledPhase: 7,
    status: 'scaffolded',
  };
}
