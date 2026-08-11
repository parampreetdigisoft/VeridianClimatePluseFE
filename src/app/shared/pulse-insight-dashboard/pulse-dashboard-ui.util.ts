import { PulseKpiTab } from './pulse-dashboard.models';

declare var bootstrap: any;

export const PULSE_KPI_TABS: { id: PulseKpiTab; label: string; icon: string }[] = [
  { id: 'ambitionDelivery', label: 'Ambition–Delivery Index', icon: 'bi-bullseye' },
  { id: 'diplomaticRisk', label: 'Diplomatic Risk & Trust Index', icon: 'bi-shield-exclamation' },
  { id: 'institutionalReadiness', label: 'Institutional Readiness Scorecard', icon: 'bi-clipboard-check' },
];

export function pulseProgramSearchFn(term: string, item: any): boolean {
  const q = term.toLowerCase();
  return (
    item.programName?.toLowerCase().includes(q) ||
    item.location?.toLowerCase().includes(q) ||
    item.year?.toString().includes(q)
  );
}

export function formatPulseScore(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return 'N/A';
  return Number(score).toFixed(1);
}

export function pulseScoreProgress(score: number | null | undefined): number {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return 0;
  return Math.max(0, Math.min(100, Number(score)));
}

export function pulseConditionClass(condition?: string | null): string {
  const value = (condition || '').toLowerCase();
  if (value.includes('critical') || value.includes('fragile')) return 'critical';
  if (value.includes('elevated') || value.includes('high')) return 'elevated';
  if (value.includes('watch') || value.includes('developing')) return 'watch';
  return 'stable';
}

export function openPulseKpiModal(modalId: string): void {
  setTimeout(() => {
    const modalEl = document.getElementById(modalId);
    if (!modalEl) return;
    let modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (!modalInstance) {
      modalInstance = new bootstrap.Modal(modalEl);
    }
    modalInstance.show();
  }, 40);
}

export function closePulseKpiModal(modalId: string): void {
  const modalEl = document.getElementById(modalId);
  if (modalEl) {
    bootstrap.Modal.getInstance(modalEl)?.hide();
  }
}
