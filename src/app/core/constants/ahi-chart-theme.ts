/**
 * AHI (Africa Health Intelligence System) chart palette — aligned with brand logo.
 */
export const AHI_CHART = {
  primary: '#006D77',
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
    '#006D77',
    '#7ec8cf',
    '#4CAF50',
    '#00838f',
    '#A8E063',
    '#005a62',
  ],

  /** Evaluator radial (4 segments) */
  radialBarShort: ['#006D77', '#7ec8cf', '#A8E063', '#4CAF50'],

  /** Line chart: manual / evaluation vs AI */
  lineEvaluation: '#006D77',
  lineAi: '#A8E063',

  /** Area comparison chart strokes */
  areaEvaluator: '#7ec8cf',
  areaAi: '#006D77',

  /** Early-warning & multi-series trends */
  trendLines: ['#006D77', '#A8E063', '#4CAF50', '#7ec8cf', '#00838f', '#c5e878'],

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
    '#006D77',
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
    '#006D77',
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
    AHI_CHART.scoreScale.length - 1
  );
  return AHI_CHART.scoreScale[index];
}

export function ahiCompletionColor(rate: number): string {
  if (rate >= 80) return AHI_CHART.completionHigh;
  if (rate >= 50) return AHI_CHART.completionMid;
  return AHI_CHART.completionLow;
}

/** Shared ApexCharts axis / grid styling */
export const AHI_AXIS_STYLE = {
  grid: {
    borderColor: AHI_CHART.grid,
    strokeDashArray: 4,
  },
  xaxisLabels: {
    style: {
      fontSize: '11px',
      fontWeight: 500,
      colors: AHI_CHART.textMuted,
    },
  },
  yaxisTitle: {
    style: {
      fontSize: '13px',
      fontWeight: 600,
      color: AHI_CHART.text,
    },
  },
  yaxisLabels: {
    style: {
      fontSize: '12px',
      colors: AHI_CHART.textMuted,
    },
  },
};
