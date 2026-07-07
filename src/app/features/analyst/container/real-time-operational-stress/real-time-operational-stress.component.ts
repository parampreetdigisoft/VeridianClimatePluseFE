import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexDataLabels,
  ApexGrid,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
} from 'ng-apexcharts';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { TieredAccessPlanValue } from 'src/app/core/enums/TieredAccessPlan';
import {
  DashboardInterpretationDto,
  DashboardModeResponseDto,
  DashboardQuestionScoreDto,
} from 'src/app/core/models/CountrySignalDashboardDto';
import { AHI_CHART, AHI_AXIS_STYLE } from 'src/app/core/constants/ahi-chart-theme';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { AnalystService } from '../../analyst.service';
declare var bootstrap: any;

export type GlanceBarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
};

export type GlanceDonutChartOptions = {
  series: number[];
  chart: ApexChart;
  labels: string[];
  legend: ApexLegend;
  dataLabels: ApexDataLabels;
  colors: string[];
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
};

type SignalTab = 'stress' | 'warning' | 'resilience';
@Component({
  selector: 'app-real-time-operational-stress',
  templateUrl: './real-time-operational-stress.component.html',
  styleUrl: './real-time-operational-stress.component.css'
})

export class RealTimeOperationalStressComponent implements OnInit, OnDestroy {
  countries: CountryVM[] = [];
  selectedCountryID: number | null = null;
  activeTab: SignalTab = 'stress';

  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;
  pillars: PillarsVM[] = [];
  loading = false;
  isLoading = false;

  stressDashboard: DashboardModeResponseDto | null = null;
  warningDashboard: DashboardModeResponseDto | null = null;
  resilienceDashboard: DashboardModeResponseDto | null = null;
  selectedQuestion: DashboardQuestionScoreDto | null = null;
  interpretationConditions: DashboardInterpretationDto[] = [];

  glanceBarChartOptions: Partial<GlanceBarChartOptions> = {};
  glanceDonutChartOptions: Partial<GlanceDonutChartOptions> = {};

  constructor(
    private analystService: AnalystService,
    private toaster: ToasterService,
    private userService: UserService
  ) {
    this.tier = this.userService?.userInfo?.tier || TieredAccessPlanValue.Pending;
  }

  ngOnInit(): void {
    this.getAllCountriesByUserID();
  }

  ngOnDestroy(): void {
  
  }

  getAllCountriesByUserID(): void {
   this.isLoading = true;
   this.analystService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
      next: (res) => {
        this.isLoading = false;
        if (res.succeeded) {
          this.countries = res.result ?? [];
          if (this.countries.length) {
            this.selectedCountryID = this.countries[0].countryID;
            this.loadActiveTabData();
          } else {
            this.selectedCountryID = null;
            this.getAllPillars();
            this.opendialog();
          }
        } else {
          this.toaster.showWarning(res.errors?.[0] || 'Failed to load countries.');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Failed to load country list.');
      },
    });
  }

  onCountryChanged(): void {
    this.loadActiveTabData();
  }

  setActiveTab(tab: SignalTab): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.loadActiveTabData();
  }

  loadActiveTabData(): void {
    if (!this.selectedCountryID) {
      this.toaster.showWarning('Please select a country.');
      return;
    }

    if (this.activeTab === 'stress') {
      this.loadStressDashboard();
      return;
    }
    if (this.activeTab === 'warning') {
      this.loadEarlyWarningDashboard();
      return;
    }
    this.loadResilienceDashboard();
  }

  loadStressDashboard(): void {
    if (!this.selectedCountryID) return;
    this.isLoading = true;
    this.analystService.getPeaceStressTestDashboard(this.selectedCountryID).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res.succeeded) {
          this.stressDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No stress test data found.');
          return;
        }
        this.stressDashboard = res.result;
        this.interpretationConditions = res.result?.dashboardInterpretations ?? [];
        if (this.activeTab === 'stress') this.updateGlanceCharts(res.result);
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Failed to load stress test dashboard.');
      },
    });
  }

  loadEarlyWarningDashboard(isSilent = false): void {
    if (!this.selectedCountryID) return;
    if (!isSilent) this.isLoading = true;
    this.analystService.getEarlyWarningDashboard(this.selectedCountryID).subscribe({
      next: (res) => {
        if (!isSilent) this.isLoading = false;
        if (!res.succeeded) {
          this.warningDashboard = null;
          if (!isSilent) {
            this.toaster.showWarning(res.errors?.[0] || 'No early warning data found.');
          }
          return;
        }
        this.warningDashboard = res.result;
        if (this.activeTab === 'warning') this.updateGlanceCharts(res.result);
      },
      error: () => {
        if (!isSilent) this.isLoading = false;
        if (!isSilent) {
          this.toaster.showError('Failed to load early warning dashboard.');
        }
      },
    });
  }

  loadResilienceDashboard(): void {
    if (!this.selectedCountryID) return;
    this.isLoading = true;
    this.analystService.getResilienceScorecard(this.selectedCountryID).subscribe({
      next: (res) => {
        this.isLoading = false;
        if (!res.succeeded) {
          this.resilienceDashboard = null;
          this.toaster.showWarning(res.errors?.[0] || 'No resilience data found.');
          return;
        }
        this.resilienceDashboard = res.result;
        if (this.activeTab === 'resilience') this.updateGlanceCharts(res.result);
      },
      error: () => {
        this.isLoading = false;
        this.toaster.showError('Failed to load resilience scorecard.');
      },
    });
  }

  getActiveDashboard(): DashboardModeResponseDto | null {
    if (this.activeTab === 'stress') return this.stressDashboard;
    if (this.activeTab === 'warning') return this.warningDashboard;
    return this.resilienceDashboard;
  }

  getQuestions(dashboard: DashboardModeResponseDto | null): DashboardQuestionScoreDto[] {
    return dashboard?.questions ?? [];
  }

  hasScore(score: number | null | undefined): boolean {
    return score !== null && score !== undefined;
  }

  formatScore(score: number | null | undefined): string {
    if (!this.hasScore(score)) return 'N/A';
    return Number(score).toFixed(1);
  }

  getConditionClass(condition?: string | null): string {
    const value = (condition || '').toLowerCase();
    if (value.includes('critical') || value.includes('fragile')) return 'critical';
    if (value.includes('elevated') || value.includes('high')) return 'elevated';
    if (value.includes('watch') || value.includes('developing')) return 'watch';
    return 'stable';
  }

  isAlertQuestion(question: DashboardQuestionScoreDto): boolean {
    const condition = (this.getInterpretationConditionByScore(question.aiScore).condition || '').toLowerCase();
    return (
      condition.includes('critical') ||
      condition.includes('elevated') ||
      condition.includes('high') ||
      condition.includes('watch') ||
      condition.includes('fragile')
    );
  }

  getSignalProgress(score: number | null | undefined): number {
    if (!this.hasScore(score)) return 0;
    return Math.max(0, Math.min(100, Number(score)));
  }

  getAverageScore(dashboard: DashboardModeResponseDto | null): number | null {
    const scores = (dashboard?.questions ?? [])
      .map((q) => q.aiScore)
      .filter((score): score is number => this.hasScore(score));
    if (!scores.length) return null;
    return scores.reduce((sum, score) => sum + score, 0) / scores.length;
  }

  getReportingCount(dashboard: DashboardModeResponseDto | null): number {
    return (dashboard?.questions ?? []).filter((q) => this.hasScore(q.aiScore)).length;
  }

  getTotalQuestionCount(dashboard: DashboardModeResponseDto | null): number {
    return dashboard?.questions?.length ?? 0;
  }

  getCountryName(): string {
    return (
      this.countries.find((x) => x.countryID === this.selectedCountryID)?.countryName ||
      'Selected Country'
    );
  }
  
  getUpdateStatus(date: Date | string | null | undefined): { label: string; class: string } {
    if (!date) { return { label: 'N/A', class: 'status-intermediate' }; 
    }
    
    const updatedDate = new Date(date);
    const today = new Date();
    const diffTime = today.getTime() - updatedDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return { label: 'Recent', class: 'status-recent'
      };
    }
    
    if (diffDays <= 15) {
      return {
        label: 'Aging',
        class: 'status-intermediate'
      };
    }

    return {
      label: 'Outdated',
      class: 'status-outdated'
    };
  }

  getQuestionName(question: DashboardQuestionScoreDto): string {
    return question.questionDescription ;
  }

  getQuestionIconClass(question: DashboardQuestionScoreDto): string {
    const value = (question.questionDescription || '').toLowerCase();
    if (value.includes('fever') || value.includes('respiratory') || value.includes('disease')) return 'bi-virus';
    if (value.includes('icu') || value.includes('ventilator') || value.includes('emergency')) return 'bi-hospital';
    if (value.includes('rain') || value.includes('flood') || value.includes('heat') || value.includes('drought')) return 'bi-cloud-rain-heavy';
    if (value.includes('vaccin') || value.includes('medicine') || value.includes('stock')) return 'bi-capsule';
    if (value.includes('ambulance') || value.includes('continuity')) return 'bi-truck';
    if (value.includes('lab') || value.includes('movement')) return 'bi-radar';
    return 'bi-graph-up-arrow';
  }

  getQuestionAccentClass(question: DashboardQuestionScoreDto): string {
    const score = question.aiScore;
    if (!this.hasScore(score)) return 'accent-default';
    if (Number(score) <= 40) return 'accent-alert';
    if (Number(score) <= 60) return 'accent-warning';
    return 'accent-cohesion';
  }

  getTabIcon(tab: SignalTab): string {
    const icons: Record<SignalTab, string> = {
      stress: 'bi-speedometer2',
      warning: 'bi-bell',
      resilience: 'bi-bar-chart-steps',
    };
    return icons[tab];
  }

  getOutlookLines(dashboard: DashboardModeResponseDto | null): string[] {
    const alertCount = (dashboard?.questions ?? []).filter((q) => this.isAlertQuestion(q)).length;
    if (!dashboard) return [];
    if (alertCount >= 4) return ['Escalation watch: multiple indicators are in elevated or critical range.'];
    if (alertCount >= 2) return ['Cautionary watch: monitor highlighted indicators closely.'];
    return ['Stable watch: no major escalation detected across mapped indicators.'];
  }

  openQuestionDetails(question: DashboardQuestionScoreDto): void {
    this.selectedQuestion = question;
    setTimeout(() => {
      const modalEl = document.getElementById('signalDetailModal');
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
      }
    }, 50);
  }

  closeQuestionDetails(): void {
    const modalEl = document.getElementById('signalDetailModal');
    if (!modalEl) return;
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
    this.selectedQuestion = null;
  }

  getAllPillars(): void {
    this.analystService.getAllPillars().subscribe({
      next: (res) => {
        this.pillars = res ?? [];
      },
    });
  }

  opendialog(): void {
    setTimeout(() => {
      const modalEl = document.getElementById('exampleModal');
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show();
      }
    }, 100);
  }

  closeModal(): void {
    this.loading = false;
    const homeTab = document.querySelector('#pills-home-tab') as HTMLElement;
    if (homeTab) {
      homeTab.click();
    }
    const modalEl = document.getElementById('exampleModal');
    if (!modalEl) return;
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) {
      modalInstance.hide();
    }
  }

  private updateGlanceCharts(dashboard: DashboardModeResponseDto | null): void {
    const questions = dashboard?.questions ?? [];
    const categories = questions.map((q) => this.truncateLabel(q.questionDescription || `Q${q.questionID}`, 22));
    const scores = questions.map((q) => (this.hasScore(q.aiScore) ? Number(q.aiScore) : 0));
    const barColors = questions.map((q, i) => {
      if (!this.hasScore(q.aiScore)) return '#cbd5e1';
      const score = Number(q.aiScore);
      if (score <= 40) return '#dc3545';
      if (score <= 60) return '#fd7e14';
      if (score <= 80) return '#006D77';
      return '#77BD3E';
    });

    this.glanceBarChartOptions = {
      series: [{ name: 'Score', data: scores }],
      chart: {
        type: 'bar',
        height: 340,
        toolbar: { show: false },
        fontFamily: 'Poppins, sans-serif',
      },
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: '62%',
          distributed: true,
          dataLabels: { position: 'top' },
        },
      },
      colors: barColors,
      dataLabels: {
        enabled: true,
        formatter: (val: number, opts: any) => {
          const q = questions[opts.dataPointIndex];
          return this.hasScore(q?.aiScore) ? Number(val).toFixed(1) : 'N/A';
        },
        offsetX: 24,
        style: { fontSize: '11px', fontWeight: 700, colors: [AHI_CHART.text] },
      },
      xaxis: {
        categories,
        max: 100,
        labels: {
          style: AHI_AXIS_STYLE.xaxisLabels.style,
          formatter: (v: string) => v,
        },
        axisBorder: { color: AHI_CHART.border },
      },
      yaxis: {
        labels: {
          style: { ...AHI_AXIS_STYLE.yaxisLabels.style, fontSize: '12px' },
        },
      },
      grid: {
        borderColor: AHI_CHART.grid,
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } },
      },
      legend: { show: false },
      tooltip: {
        theme: 'light',
        y: {
          formatter: (val: number, opts: any) => {
            const q = questions[opts.dataPointIndex];
            if (!this.hasScore(q?.aiScore)) return 'No data';
            return `${Number(val).toFixed(1)} / 100`;
          },
        },
      },
      stroke: { width: 0 },
    };

    const conditionMap = new Map<string, number>();
    let noDataCount = 0;
    questions.forEach((q) => {
      if (!this.hasScore(q.aiScore)) {
        noDataCount++;
        return;
      }
     const key = this.getInterpretationConditionByScore(q.aiScore).condition || 'Stable';
      conditionMap.set(key, (conditionMap.get(key) ?? 0) + 1);
    });
    if (noDataCount > 0) {
      conditionMap.set('No Data', noDataCount);
    }

    const donutLabels = Array.from(conditionMap.keys());
    const donutSeries = Array.from(conditionMap.values());
    const donutColors = donutLabels.map((label) => this.getConditionColor(label));

    this.glanceDonutChartOptions = {
      series: donutSeries.length ? donutSeries : [1],
      labels: donutLabels.length ? donutLabels : ['No indicators'],
      chart: {
        type: 'donut',
        height: 300,
        fontFamily: 'Poppins, sans-serif',
      },
      colors: donutColors.length ? donutColors : ['#cbd5e1'],
      legend: {
        position: 'bottom',
        fontSize: '12px',
        fontWeight: 600,
        labels: { colors: AHI_CHART.textMuted },
      },
      dataLabels: {
        enabled: true,
        formatter: (val: number) => `${Math.round(val)}%`,
        style: { fontSize: '11px', fontWeight: 700 },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '62%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Indicators',
                fontSize: '13px',
                fontWeight: 600,
                color: AHI_CHART.textMuted,
                formatter: () => `${questions.length}`,
              },
            },
          },
        },
      },
      tooltip: {
        theme: 'light',
        y: { formatter: (val: number) => `${val} indicator(s)` },
      },
    };
  }

  private truncateLabel(value: string, max: number): string {
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
  }

  private getConditionColor(condition: string): string {
    const value = condition.toLowerCase();
    if (value.includes('no data')) return '#cbd5e1';
    if (value.includes('critical') || value.includes('fragile')) return '#dc3545';
    if (value.includes('elevated') || value.includes('high')) return '#fd7e14';
    if (value.includes('watch') || value.includes('developing')) return '#ffc107';
    if (value.includes('stable')) return '#006D77';
    if (value.includes('strong')) return '#77BD3E';
    return AHI_CHART.primarySoft;
  }
  
  getInterpretationConditionByScore(score: number | null | undefined) {
    if (score === null || score === undefined || !this.interpretationConditions?.length) {
      return {
        condition: 'No Data',
        description: 'No interpretation available.'
      };
    }
    
    const match = this.interpretationConditions.find(x =>
      score >= (x.minRange ?? 0) &&
      score <= (x.maxRange ?? 100)
    );
    
    return {
      condition: match?.condition ?? 'No Data',
      description: match?.description ?? 'No interpretation available.'
    };
  }

  formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  }
}