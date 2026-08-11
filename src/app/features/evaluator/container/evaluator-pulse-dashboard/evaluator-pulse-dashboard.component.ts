import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTooltipModule } from '@angular/material/tooltip';
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
import {
  PulseIndexHero,
  PulseMetricCard,
  PulseSummaryCard,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard.models';
import {
  PulseAreaChartOptions,
  PulseRadialChartOptions,
  buildPulseEvaluatorBarChart,
  buildPulseRadialChart,
  computePulseMetrics,
} from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-chart.util';
import { pulseProgramSearchFn } from 'src/app/shared/pulse-insight-dashboard/pulse-dashboard-ui.util';

@Component({
  selector: 'app-evaluator-pulse-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule, NgApexchartsModule, MatTooltipModule],
  templateUrl: './evaluator-pulse-dashboard.component.html',
  styleUrl: '../../../../shared/pulse-insight-dashboard/pulse-dashboard.shared.css',
  encapsulation: ViewEncapsulation.None,
})
export class EvaluatorPulseDashboardComponent implements OnInit {
  readonly customSearchFn = pulseProgramSearchFn;

  isPageLoader = false;
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | '' | null = '';
  programHistory: ProgramHistoryDto | null = null;
  questionHistory: GetProgramQuestionHistoryResponseDto | null = null;

  summaryCards: PulseSummaryCard[] = [];
  primaryMetrics: PulseMetricCard[] = [];
  secondaryMetrics: PulseMetricCard[] = [];
  indexHero: PulseIndexHero | null = null;
  pillarChartOptions: Partial<PulseAreaChartOptions> | null = null;
  radialChartOptions: Partial<PulseRadialChartOptions> | null = null;

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
        this.isPageLoader = false;
        this.questionHistory = res;
        this.refreshDerivedViews();
      },
      error: () => {
        this.isPageLoader = false;
      },
    });
  }

  private refreshDerivedViews(): void {
    const pillars = this.questionHistory?.pillars ?? [];
    this.pillarChartOptions = buildPulseEvaluatorBarChart(pillars);
    const mapped = pillars.map((p) => ({
      pillarName: p.pillarName,
      evaluationValue: p.scoreProgress,
      scoreProgress: p.scoreProgress,
    }));
    const metrics = computePulseMetrics(mapped, this.programHistory, {
      showAi: false,
      showManual: true,
    });
    this.primaryMetrics = metrics.primary.slice(0, 4);
    this.secondaryMetrics = metrics.secondary.slice(0, 4);
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



  trackByTitle(_: number, item: PulseSummaryCard): string {
    return item.title;
  }

  trackByMetric(_: number, item: PulseMetricCard): string {
    return item.title;
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
