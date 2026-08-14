import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { EvaluatorService } from '../../evaluator.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import {
  GetProgramQuestionHistoryResponseDto,
  ProgramHistoryDto,
  UserProgramRequestDto,
} from 'src/app/core/models/ProgramHistoryDto';
import { DashboardModeResponseDto } from 'src/app/core/models/ProgramSignalDashboardDto';
import { ResultResponseDto } from 'src/app/core/models/ResultResponseDto';
import {
  PulseIndexHero,
  PulseKpiCard,
  PulseKpiTab,
  PulseSummaryCard,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard.models';
import {
  PulseAreaChartOptions,
  PulseRadialChartOptions,
  buildPulseEvaluatorBarChart,
  buildPulseKpiCards,
  buildPulseRadialChart,
  getSignalAiScore,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import {
  PULSE_KPI_TABS,
  closePulseKpiModal,
  formatPulseScore,
  isPulseGapScore,
  openPulseKpiModal,
  pulseConditionClass,
  pulseProgramSearchFn,
  pulseScoreProgress,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';

@Component({
  selector: 'app-evaluator-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './evaluator-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class EvaluatorPulseDashboardComponent implements OnInit {
  readonly kpiTabs = PULSE_KPI_TABS;
  readonly customSearchFn = pulseProgramSearchFn;
  readonly formatScore = formatPulseScore;
  readonly scoreProgress = pulseScoreProgress;
  readonly isGapScore = isPulseGapScore;
  readonly conditionClass = pulseConditionClass;

  isPageLoader = false;
  isKpiLoader = false;
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  questionHistory: GetProgramQuestionHistoryResponseDto | null = null;
  modeDashboard: DashboardModeResponseDto | null = null;
  activeKpiTab: PulseKpiTab = 'ambitionDelivery';
  selectedKpi: PulseKpiCard | null = null;

  summaryCards: PulseSummaryCard[] = [];
  kpiCards: PulseKpiCard[] = [];
  indexHero: PulseIndexHero | null = null;
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;

  private readonly kpiModalId = 'evaluatorPulseKpiDetailModal';

  constructor(
    private evaluatorService: EvaluatorService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.isPageLoader = true;
    this.getAllProgramsByUserId();
    this.getProgramHistory();
  }

  getAllProgramsByUserId(): void {
    this.evaluatorService.getAllProgramsByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.isPageLoader = false;
        this.programs = res.result;
        if (this.programs?.length) {
          this.selectedPrograms = this.programs[0].climateProgramID;
          this.getProgramQuestionHistory();
        }
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  getProgramHistory(): void {
    this.evaluatorService.getProgramHistory(this.userService?.userInfo?.userID ?? 0).subscribe({
      next: (res) => {
        this.programHistory = res.result;
        this.buildSummaryCards();
        this.radialChartOptions = buildPulseRadialChart(this.programHistory, 'simple');
      },
    });
  }

  getProgramQuestionHistory(): void {
    if (!this.userService?.userInfo?.userID || !this.selectedPrograms) return;
    const request: UserProgramRequestDto = {
      userID: this.userService.userInfo.userID,
      climateProgramID: Number(this.selectedPrograms),
    };
    this.isPageLoader = true;
    this.evaluatorService.getProgramQuestionHistory(request).subscribe({
      next: (res) => {
        this.questionHistory = res;
        this.refreshDerivedViews();
        this.loadModeDashboard(false);
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  onProgramChange(): void {
    this.activeKpiTab = 'ambitionDelivery';
    this.getProgramQuestionHistory();
  }

  setKpiTab(tab: PulseKpiTab): void {
    if (this.activeKpiTab === tab) return;
    this.activeKpiTab = tab;
    this.loadModeDashboard(true);
  }

  private loadModeDashboard(sectionOnly: boolean): void {
    if (!this.selectedPrograms) {
      this.isPageLoader = false;
      this.isKpiLoader = false;
      return;
    }

    if (sectionOnly) {
      this.isKpiLoader = true;
    } else {
      this.isPageLoader = true;
    }

    this.getModeRequest(Number(this.selectedPrograms)).subscribe({
      next: (res) => {
        this.isPageLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = res.succeeded ? res.result : null;
        this.kpiCards = buildPulseKpiCards(this.modeDashboard, {
          showAi: true,
          showManual: true,
        });
        this.buildIndexHero();
      },
      error: () => {
        this.isPageLoader = false;
        this.isKpiLoader = false;
        this.modeDashboard = null;
        this.kpiCards = [];
        this.buildIndexHero();
      },
    });
  }

  private getModeRequest(
    climateProgramID: number
  ): Observable<ResultResponseDto<DashboardModeResponseDto>> {
    if (this.activeKpiTab === 'diplomaticRisk') {
      return this.evaluatorService.getDiplomaticRiskDashboard(climateProgramID);
    }
    if (this.activeKpiTab === 'institutionalReadiness') {
      return this.evaluatorService.getReadinessScorecardDashboard(climateProgramID);
    }
    return this.evaluatorService.getAmbitionDeliveryIndexDashboard(climateProgramID);
  }

  private refreshDerivedViews(): void {
    const pillars = this.questionHistory?.pillars ?? [];
    this.pillarChartOptions = buildPulseEvaluatorBarChart(pillars);
    this.buildIndexHero();
  }

  private buildSummaryCards(): void {
    const h = this.programHistory;
    this.summaryCards = [
      {
        title: 'Total Programs',
        value: h?.totalProgram ?? 0,
        subtitle: 'Assigned Programs',
        icon: 'bi-buildings',
        accent: 'blue',
      },
      {
        title: 'Active',
        value: h?.activeProgram ?? 0,
        subtitle: 'Active assessments',
        icon: 'bi-clipboard2-check',
        accent: 'teal',
      },
      {
        title: 'In Progress',
        value: h?.inprocessProgram ?? 0,
        subtitle: 'Manual in progress',
        icon: 'bi-hourglass-split',
        accent: 'cyan',
      },
      {
        title: 'Completed',
        value: h?.compeleteProgram ?? 0,
        subtitle: 'Manual completed',
        icon: 'bi-check2-all',
        accent: 'green',
      },
    ];
  }

  private buildIndexHero(): void {
    const program = this.programs?.find((p) => p.climateProgramID === this.selectedPrograms);
    const d = this.modeDashboard;
    const pillars = this.questionHistory?.pillars ?? [];
    const avgFromPillars =
      pillars.length > 0
        ? pillars.reduce((s, p) => s + Number(p.scoreProgress ?? 0), 0) / pillars.length
        : 0;
    const aiScore = d ? Number(d.aiProgramScore ?? 0) : avgFromPillars;
    const manualScore = d ? Number(d.manualProgramScore ?? d.manualValue ?? 0) : avgFromPillars;
    const aiCondition = d?.vcpCondition || (aiScore >= 70 ? 'Stable' : aiScore >= 40 ? 'Watch' : 'Critical');
    const signals = d?.primarySignals?.length ? d.primarySignals : d?.signals ?? [];
    const fallbackMode =
      this.activeKpiTab === 'diplomaticRisk'
        ? 'DIPLOMATIC RISK & TRUST INDEX'
        : this.activeKpiTab === 'institutionalReadiness'
          ? 'INSTITUTIONAL READINESS SCORECARD'
          : 'AMBITION–DELIVERY INDEX';

    this.indexHero = {
      modeName: d?.modeName || fallbackMode,
      programLabel: program
        ? `${program.programName} · ${program.year || '—'} · ${program.location || '—'}`
        : 'Select a program',
      overallLabel: `AI ${aiScore.toFixed(1)}/100 · Manual ${manualScore.toFixed(1)}/100 · ${aiCondition}`,
      stats: [
        { label: 'AI Score', value: aiScore.toFixed(1) },
        { label: 'Manual Score', value: manualScore.toFixed(1) },
        {
          label: signals[1]?.code || signals[1]?.layerCode || 'SIG',
          value: signals[1] ? (getSignalAiScore(signals[1]) ?? 0).toFixed(1) : '0.0',
        },
        {
          label: 'Manual',
          value: d?.manualCondition || (manualScore >= 70 ? 'Stable' : manualScore >= 40 ? 'Watch' : 'Critical'),
        },
      ],
    };
  }

  openKpiDetails(kpi: PulseKpiCard, event?: Event): void {
    event?.stopPropagation();
    this.selectedKpi = kpi;
    openPulseKpiModal(this.kpiModalId);
  }

  closeKpiDetails(): void {
    closePulseKpiModal(this.kpiModalId);
    this.selectedKpi = null;
  }

  trackByTitle(_: number, item: PulseSummaryCard): string {
    return item.title;
  }

  trackByKpi(_: number, item: PulseKpiCard): string | number {
    return item.id;
  }

  exportProgramPillar(): void {
    const program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.questionHistory?.pillars && program) {
      const exportData = this.questionHistory.pillars.map((x) => ({
        programName: program.programName,
        PillarName: x.pillarName,
        Score: x.scoreProgress?.toFixed(2),
        AnsweredQuestion: x.ansQuestion,
        TotalQuestion: x.totalQuestion,
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select program to export the records');
    }
  }
}
