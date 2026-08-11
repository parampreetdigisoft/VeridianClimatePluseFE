import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { AdminService } from '../../admin.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { ProgramHistoryDto, UserProgramRequestDto } from 'src/app/core/models/ProgramHistoryDto';
import { AiProgramPillarDashboardResponseDto } from 'src/app/core/models/AiProgramPillarDashboardResponseDto';
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
  buildPulseKpiCards,
  buildPulsePillarAreaChart,
  buildPulseRadialChart,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import {
  PULSE_KPI_TABS,
  closePulseKpiModal,
  formatPulseScore,
  openPulseKpiModal,
  pulseConditionClass,
  pulseProgramSearchFn,
  pulseScoreProgress,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';

@Component({
  selector: 'app-admin-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './admin-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class AdminPulseDashboardComponent implements OnInit {
  readonly kpiTabs = PULSE_KPI_TABS;
  readonly customSearchFn = pulseProgramSearchFn;
  readonly formatScore = formatPulseScore;
  readonly scoreProgress = pulseScoreProgress;
  readonly conditionClass = pulseConditionClass;

  isPageLoader = false;
  isKpiLoader = false;
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  pillarResponse: AiProgramPillarDashboardResponseDto | null = null;
  modeDashboard: DashboardModeResponseDto | null = null;
  activeKpiTab: PulseKpiTab = 'ambitionDelivery';
  selectedKpi: PulseKpiCard | null = null;

  summaryCards: PulseSummaryCard[] = [];
  kpiCards: PulseKpiCard[] = [];
  indexHero: PulseIndexHero | null = null;
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;

  private readonly kpiModalId = 'adminPulseKpiDetailModal';

  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.isPageLoader = true;
    this.getAllProgramsByUserId();
    this.getProgramHistory();
  }

  getAllProgramsByUserId(): void {
    this.adminService.getAllProgramsByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.programs = res.result;
        this.isPageLoader = false;
        if (this.programs?.length) {
          this.selectedPrograms = this.programs[0].climateProgramID;
          this.getProgramPillarHistory();
        }
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  getProgramHistory(): void {
    this.adminService.getProgramHistory(this.userService?.userInfo?.userID ?? 0).subscribe({
      next: (res) => {
        this.programHistory = res.result;
        this.buildSummaryCards();
        this.radialChartOptions = buildPulseRadialChart(this.programHistory, 'full');
      },
    });
  }

  onProgramChange(): void {
    this.activeKpiTab = 'ambitionDelivery';
    this.getProgramPillarHistory();
  }

  setKpiTab(tab: PulseKpiTab): void {
    if (this.activeKpiTab === tab) return;
    this.activeKpiTab = tab;
    this.loadModeDashboard(true);
  }

  getProgramPillarHistory(): void {
    if (!this.userService?.userInfo?.userID || !this.selectedPrograms) return;
    const request: UserProgramRequestDto = {
      userID: this.userService.userInfo.userID,
      climateProgramID: Number(this.selectedPrograms),
    };
    this.isPageLoader = true;
    this.adminService.getProgramPillarHistory(request).subscribe({
      next: (res) => {
        this.pillarResponse = res.result;
        this.refreshDerivedViews();
        this.loadModeDashboard(false);
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
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

    const programId = Number(this.selectedPrograms);
    this.getModeRequest(programId).subscribe({
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
      return this.adminService.getDiplomaticRiskDashboard(climateProgramID);
    }
    if (this.activeKpiTab === 'institutionalReadiness') {
      return this.adminService.getReadinessScorecardDashboard(climateProgramID);
    }
    return this.adminService.getAmbitionDeliveryIndexDashboard(climateProgramID);
  }

  private refreshDerivedViews(): void {
    const pillars = this.pillarResponse?.pillars ?? [];
    this.pillarChartOptions = buildPulsePillarAreaChart(pillars, { showAi: true, showManual: true });
    this.buildIndexHero();
  }

  private buildSummaryCards(): void {
    const h = this.programHistory;
    this.summaryCards = [
      {
        title: 'Total Programs',
        value: h?.totalProgram ?? 0,
        subtitle: 'Active Programs',
        icon: 'bi-buildings',
        accent: 'blue',
      },
      {
        title: 'Analyst',
        value: h?.totalAnalyst ?? 0,
        subtitle: 'Active Analyst',
        icon: 'bi-person-lines-fill',
        accent: 'teal',
      },
      {
        title: 'Evaluator',
        value: h?.totalEvaluator ?? 0,
        subtitle: 'Active Evaluator',
        icon: 'bi-people',
        accent: 'green',
      },
      {
        title: 'Assessed Programs',
        value: h?.totalAccessProgram ?? 0,
        subtitle: 'Programs with access',
        icon: 'bi-globe2',
        accent: 'cyan',
      },
    ];
  }

  private buildIndexHero(): void {
    const program = this.programs?.find((p) => p.climateProgramID === this.selectedPrograms);
    const d = this.modeDashboard;
    const pillars = this.pillarResponse?.pillars ?? [];
    const avgFromPillars =
      pillars.length > 0
        ? pillars.reduce((s, p) => s + (Number(p.aiValue ?? 0) + Number(p.evaluationValue ?? 0)) / 2, 0) /
          pillars.length
        : 0;
    const avg = d ? Number(d.vcp ?? 0) : avgFromPillars;
    const condition = d?.vcpCondition || (avg >= 70 ? 'Stable' : avg >= 40 ? 'Watch' : 'Critical');
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
      overallLabel: `Overall Score ${avg.toFixed(1)}/100 · ${condition}`,
      stats: [
        { label: 'VCP', value: d ? Number(d.vcp ?? 0).toFixed(1) : avg.toFixed(1) },
        {
          label: signals[1]?.code || signals[1]?.layerCode || 'SIG',
          value: signals[1] ? Number(signals[1].value ?? 0).toFixed(1) : '0.0',
        },
        {
          label: signals[2]?.code || signals[2]?.layerCode || 'KPI',
          value: signals[2] ? Number(signals[2].value ?? 0).toFixed(1) : '0.0',
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

  goToProgramAnalysis(): void {
    const queryParams: any = {};
    if (Number(this.selectedPrograms) > 0) {
      queryParams.climateProgramID = this.selectedPrograms;
    }
    this.router.navigate(['/admin/ai/program-analysis'], { queryParams });
  }

  exportProgramPillar(): void {
    const program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.pillarResponse?.pillars && program) {
      const exportData = this.pillarResponse.pillars.map((x) => ({
        programName: program.programName,
        PillarName: x.pillarName,
        AIScore: x.aiValue?.toFixed(2),
        EvaluationScore: x.evaluationValue?.toFixed(2),
      }));
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning('Please select program to export the records');
    }
  }
}
