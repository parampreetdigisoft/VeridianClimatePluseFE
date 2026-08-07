/**
 * VCP (Veridian Climate Pulse System) chart palette — aligned with brand logo.
 */
export const VCP_CHART = {
  primary: 'var(--Primary-Color)',
  primaryMid: '#00838f',
  primarySoft: '#7ec8cf',
  secondary: '#A8E063',
  accent: '#4CAF50',
  deep: '#004d55',
  text: '#003d44',
  textMuted: '#4a5f62',
  grid: '#dce8e9',
  border: '#c5dddf',
  hollow: 'rgba(0, 109, 119, 0.06)',
  tooltipShadow: '0 12px 32px rgba(0, 109, 119, 0.18)',

  /** Radial / multi-segment status charts */
  radialBar: [
    'var(--Primary-Color)',
    '#7ec8cf',
    '#4CAF50',
    '#00838f',
    '#A8E063',
    '#005a62',
  ],

  /** Evaluator radial (4 segments) */
  radialBarShort: ['var(--Primary-Color)', '#7ec8cf', '#A8E063', '#4CAF50'],

  /** Line chart: manual / evaluation vs AI */
  lineEvaluation: 'var(--Primary-Color)',
  lineAi: '#A8E063',

  /** Area comparison chart strokes */
  areaEvaluator: '#7ec8cf',
  areaAi: 'var(--Primary-Color)',

  /** Early-warning & multi-series trends */
  trendLines: ['var(--Primary-Color)', '#A8E063', '#4CAF50', '#7ec8cf', '#00838f', '#c5e878'],

  /** Bar / score scale (low → high) */
  scoreScale: [
    '#b9bdbc',
    '#8ea89f',
    '#598175',
    '#6eb0b6',
    '#5ab8b8',
    '#4CAF50',
    '#3d9a46',
    '#2d8a6e',
    'var(--Primary-Color)',
    '#004d55',
  ],

  /** Pillar bar chart (evaluator) — light to strong */
  pillarBar: [
    '#b9bdbc',
    '#8ea89f',
    '#598175',
    '#6eb0b6',
    '#5ab8b8',
    '#4CAF50',
    '#3d9a46',
    '#2d8a6e',
    'var(--Primary-Color)',
    '#004d55',
  ],

  completionHigh: '#4CAF50',
  completionMid: '#A8E063',
  completionLow: '#d97757',
} as const;

export function ahiScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined || Number.isNaN(Number(score))) {
    return '#d1d5db';
  }
  const safe = Math.min(Math.max(Number(score), 0), 100);
  const index = Math.min(
    Math.floor(safe / 10),
    VCP_CHART.scoreScale.length - 1
  );
  return VCP_CHART.scoreScale[index];
}

export function ahiCompletionColor(rate: number): string {
  if (rate >= 80) return VCP_CHART.completionHigh;
  if (rate >= 50) return VCP_CHART.completionMid;
  return VCP_CHART.completionLow;
}

/** Shared ApexCharts axis / grid styling */
export const VCP_AXIS_STYLE = {
  grid: {
    borderColor: VCP_CHART.grid,
    strokeDashArray: 4,
  },
  xaxisLabels: {
    style: {
      fontSize: '11px',
      fontWeight: 500,
      colors: VCP_CHART.textMuted,
    },
  },
  yaxisTitle: {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: VCP_CHART.text,
    },
  },
  yaxisLabels: {
    style: {
      fontSize: '12px',
      colors: VCP_CHART.textMuted,
    },
  },
};
