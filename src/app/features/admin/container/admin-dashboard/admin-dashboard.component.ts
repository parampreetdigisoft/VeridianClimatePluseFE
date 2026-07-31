import {
  Component,
  OnInit,
  ViewEncapsulation,
  ViewChild,
  AfterViewInit,
} from "@angular/core";

import { AdminService } from "../../admin.service";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { ProgramVM } from "src/app/core/models/ProgramVM";
import { ProgramHistoryDto, UserProgramRequestDto } from "../../../../core/models/ProgramHistoryDto";
import { CommonService } from "src/app/core/services/common.service";
import { Router } from "@angular/router";
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexLegend,
  ChartComponent,
  ApexAxisChartSeries,
  ApexDataLabels,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ApexStates,
} from "ng-apexcharts";
import { AiProgramPillarDashboardResponseDto } from "src/app/core/models/AiProgramPillarDashboardResponseDto";
import { VCP_CHART, ahiScoreColor, VCP_AXIS_STYLE } from "src/app/core/constants/ahi-chart-theme";

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
};

export type PillarChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  colors: string[];
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  fill: any;
  states: ApexStates;
  dataLabels: ApexDataLabels;
  stroke: any;
  markers: any;
  grid: any;
};

@Component({
  selector: "app-admin-dashboard",
  templateUrl: "./admin-dashboard.component.html",
  styleUrl: "./admin-dashboard.component.css",
  encapsulation: ViewEncapsulation.None,
})

export class AdminDashboardComponent implements OnInit, AfterViewInit {
  selectedYear = new Date().getFullYear();
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | any = "";
  programHistory: ProgramHistoryDto | null = null;
  programQuestionHistoryResponse: AiProgramPillarDashboardResponseDto | null = null;
  isLoader: boolean = false;
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;
  @ViewChild("chartPillar") chartPillar!: ChartComponent;
  public chartPillarOptions: Partial<PillarChartOptions> = {};

  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.getAllProgramsByUserId();
    this.getProgramHistory();
  }

  ngAfterViewInit() { }

  getAllProgramsByUserId() {
    this.adminService
      .getAllProgramsByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.programs = res.result;
          this.isLoader = false;
          if (this.programs && this.programs.length > 0) {
            this.isLoader = true;
            this.selectedPrograms = this.programs[0].climateProgramID;
            this.getProgramPillarHistory();
          }
        },
      });
  }

  getProgramHistory() {
    this.adminService
      .getProgramHistory(
        this.userService?.userInfo?.userID ?? 0
         )
      .subscribe({
        next: (res) => {
          this.programHistory = res.result;
          this.getApexPieOptions();
        },
      });
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().includes(term)
    );
  }

  getProgramPillarHistory() {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedPrograms ||
      this.selectedPrograms === "" ||
      this.selectedPrograms == null
    ) {
      return;
    }
    let request: UserProgramRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      climateProgramID: this.selectedPrograms
    };
    this.adminService.getProgramPillarHistory(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.programQuestionHistoryResponse = res.result;
        if (this.programQuestionHistoryResponse) {
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
      },
    });
  }
  goToProgramAnalysis() {
    // If climateProgramID exists, pass it as a query parameter
    const queryParams: any = {};
    if (this.selectedPrograms > 0) {
      queryParams.climateProgramID = this.selectedPrograms;
    }

    this.router.navigate(["/admin/ai/program-analysis"], { queryParams });
  }

  ExportProgramPillar() {
    let program = this.programs?.find((x) => x.climateProgramID == this.selectedPrograms);
    if (this.programQuestionHistoryResponse?.pillars && program) {
      var exportData = this.programQuestionHistoryResponse?.pillars.map((x) => {
        return {
          programName: program?.programName,
          PillarName: x.pillarName,
          AIScore: x.aiValue?.toFixed(2),
          EvaluationScore: x.evaluationValue?.toFixed(2)
        };
      });
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning("Please select program to export the records");
    }
  }

  getApexPieOptions() {
    const total = this.programHistory?.totalProgram ?? 0;
    const active = this.programHistory?.activeProgram?? 0;
    const inprogress = this.programHistory?.inprocessProgram ?? 0;
    const complete = this.programHistory?.compeleteProgram ?? 0;

    const finalizeProgram = this.programHistory?.finalizeProgram ?? 0;
    const unFinalize = this.programHistory?.unFinalize ?? 0;

    this.chartOptions = {
      series: [
        (total / total) * 100,
        (active / total) * 100,
        (inprogress / total) * 100,
        (complete / total) * 100,
        (finalizeProgram / total) * 100,
        (unFinalize / total) * 100,
      ],

      chart: {
        height: 500,
        type: "radialBar",
        toolbar: {
          show: false,
        },
      },
      plotOptions: {
        radialBar: {
          startAngle: 20,
          endAngle: 300,
          offsetY: 10,
          offsetX: 10,
          hollow: {
            margin: 0,
            size: "40%",
            background: VCP_CHART.hollow,
            image: undefined,
            position: "front",
          },
          dataLabels: {
            show: true,
            name: {
              show: true,
              offsetY: -10,
            },
            value: {
              show: true,
              offsetY: 10,
              formatter: (value: number) => {
                return `${((value * total) / 100).toFixed(0)}`;
              },
            },
            total: {
              show: true,
              label: "Total Program",
              formatter: (value: any) => {
                return `${total}`;
              },
            },
          },
        },
      },
      colors: [...VCP_CHART.radialBar],
      labels: [
        "Total",
        "Manual Active",
        "Manual InProgress",
        "Manual Completed",
        "AI Finalized",
        "AI Pending Review"
      ],
      legend: {
        show: true,
        floating: false,
        fontSize: "16px",
        position: "top",
        offsetX: 0,
        offsetY: 10,
        labels: {
          useSeriesColors: true,
        },
        formatter: function (seriesName: any, opts: any) {
          return (
            seriesName +
            ":  " +
            `${(
              (opts.w.globals.series[opts.seriesIndex] * total) /
              100
            ).toFixed(0)}`
          );
        },
        itemMargin: {
          horizontal: 3,
        },
      },
    };
  }

  buildPillarComparisonChart() {
    const data = [...(this.programQuestionHistoryResponse?.pillars ?? [])];

    const categories = this.buildUniqueCategories(data);
    const aiSeries = data.map(x => x.aiValue);
    const evaluatorSeries = data.map(x => x.evaluationValue);
    this.chartPillarOptions = {
      series: [{
        name: 'AI Score',
        data: aiSeries
      },
      {
        name: 'Evaluator',
        data: evaluatorSeries
      }],

      chart: {
        type: 'area',
        height: 420,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        }
      },

      dataLabels: {
        enabled: false,
        formatter: (val: number, opts) => {
          const pillar = data[opts.dataPointIndex];

          return `${Math.round(val)}`;
        },
        offsetY: -10,
        style: {
          fontSize: '11px',
          fontWeight: 500,
          colors: ['#bcc0bf']
        },
        background: {
          enabled: true,
          foreColor: '#ffffff',
          padding: 6,
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#a4a5a5',
          opacity: 0.95
        }
      },

      stroke: {
        curve: 'smooth',
        width: 3,
        colors: [VCP_CHART.primary, VCP_CHART.secondary],
      },

      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.55,
          opacityTo: 0.06,
          stops: [0, 85, 100],
        }
      },

      colors: [VCP_CHART.primary, VCP_CHART.secondary],

      markers: {
        size: data.map(p => 4),
        colors: data.map(p => ahiScoreColor(p.aiValue)),
        strokeColors: '#77af93',
        strokeWidth: 2,
        hover: {
          size: 8,
          sizeOffset: 3
        }
      },

      xaxis: {
        categories: categories,
        labels: {
          rotateAlways: true,
          rotate: -45,
          style: {
            fontSize: '11px',
            fontWeight: 500,
            colors: '#6b7280'
          }
        },
        axisBorder: {
          show: true,
          color: '#e5e7eb'
        },
        axisTicks: {
          show: true,
          color: '#e5e7eb'
        }
      },

      yaxis: {
        title: {
          text: 'Score',
          style: {
            fontSize: '13px',
            fontWeight: 600,
            color: '#4b5563'
          }
        },
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          formatter: (val) => val >= 0 ? `${Math.round(val)}` : '',
          style: {
            fontSize: '12px',
            colors: '#6b7280'
          }
        }
      },

      grid: {
        ...VCP_AXIS_STYLE.grid,
        xaxis: {
          lines: { show: false }
        },
        yaxis: {
          lines: { show: true }
        }
      },

      tooltip: {
        enabled: true,
        theme: 'light',
        custom: ({ dataPointIndex }) => {
          const pillar = data[dataPointIndex];

          const progressColor = ahiScoreColor(pillar.aiValue);
          const evaluatorProgressColor = ahiScoreColor(pillar.evaluationValue);
          const progressPercent = pillar.aiValue ?? 0;
          const evaluatorProgressPercent = pillar.evaluationValue ?? 0;
          const avgScore = ((progressPercent + evaluatorProgressPercent) / 2);

          const statusText = avgScore >= 75 ? 'Excellent Performance' :
            avgScore >= 50 ? 'Strong Score' :
              avgScore >= 25 ? 'Steady Growth' : 'Early Stage';

          const statusIcon = avgScore >= 75 ? '🌟' :
            avgScore >= 50 ? '📈' :
              avgScore >= 25 ? '⚡' : '🌱';

          return `
          <div style="
            padding: 18px 20px;
            min-width: 300px;
            background: #ffffff;
            border-radius: 14px;
            box-shadow: 0 16px 48px rgba(0, 0, 0, 0.12);
            border-left: 4px solid ${VCP_CHART.primary};
            font-family: 'Poppins', system-ui, sans-serif;
            position: relative;
            overflow: hidden;
          ">
            <!-- Background Accent -->
            <div style="
              position: absolute;
              top: -30px;
              right: -30px;
              width: 120px;
              height: 120px;
              background: ${progressColor};
              opacity: 0.08;
              border-radius: 50%;
            "></div>

            <!-- Content -->
            <div style="position: relative; z-index: 1;">
              <!-- Header -->
              <div style="
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 16px;
              ">
                <div>
                  <div style="
                    font-weight: 700;
                    font-size: 16px;
                    color: ${VCP_CHART.text};
                    margin-bottom: 6px;
                  ">
                    ${pillar.pillarName}
                  </div>
                  <div style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    background: ${progressColor}15;
                    border-radius: 12px;
                    font-size: 11px;
                    font-weight: 600;
                    color: ${progressColor};
                  ">
                    ${statusIcon} ${statusText}
                  </div>
                </div>
                <div style="
                  font-size: 28px;
                  font-weight: 800;
                  color: ${progressColor};
                  line-height: 1;
                  margin-left:5px;
                ">
                  ${avgScore.toFixed(0)}
                </div>
              </div>

              <!-- Score Bar -->
              <div style="margin-bottom: 14px;">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.8px;
                  font-weight: 600;
                  color: #6b7280;
                ">
                  <span>AI</span>
                  <span>${progressPercent.toFixed(1)}</span>
                </div>
                <div style="
                  width: 100%;
                  height: 10px;
                  background: #e5e7eb;
                  border-radius: 10px;
                  overflow: hidden;
                  position: relative;
                ">
                  <div style="
                    width: ${progressPercent}%;
                    height: 100%;
                    background: linear-gradient(90deg, ${progressColor} 0%, ${progressColor}cc 100%);
                    border-radius: 10px;
                    position: relative;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                  ">
                    <div style="
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
                      animation: shimmer 2s infinite;
                    "></div>
                  </div>
                </div>
              </div>

              <div style="margin-bottom: 14px;">
                <div style="
                  display: flex;
                  justify-content: space-between;
                  margin-bottom: 8px;
                  font-size: 11px;
                  text-transform: uppercase;
                  letter-spacing: 0.8px;
                  font-weight: 600;
                  color: #6b7280;
                ">
                  <span>Evaluation</span>
                  <span>${evaluatorProgressPercent.toFixed(1)}</span>
                </div>
                <div style="
                  width: 100%;
                  height: 10px;
                  background: #e5e7eb;
                  border-radius: 10px;
                  overflow: hidden;
                  position: relative;
                ">
                  <div style="
                    width: ${evaluatorProgressPercent}%;
                    height: 100%;
                    background: linear-gradient(90deg, ${evaluatorProgressColor} 0%, ${evaluatorProgressColor}cc 100%);
                    border-radius: 10px;
                    position: relative;
                    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
                  ">
                    <div style="
                      position: absolute;
                      top: 0;
                      left: 0;
                      right: 0;
                      bottom: 0;
                      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%);
                      animation: shimmer 2s infinite;
                    "></div>
                  </div>
                </div>
              </div>


              <!-- Stats Grid -->
              <div style="
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 12px;
                margin-top: 14px;
              ">
                <div style="
                  padding: 10px 12px;
                  background: #f9fafb;
                  border-radius: 8px;
                  border: 1px solid #e5e7eb;
                ">
                  <div style="
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 4px;
                    font-weight: 600;
                  ">
                    Difference
                  </div>
                  <div style="
                    font-size: 13px;
                    font-weight: 700;
                    color: ${evaluatorProgressColor};
                  ">
                    ${Math.abs(progressPercent - evaluatorProgressPercent).toFixed(0)}
                  </div>
                </div>
                <div style="
                  padding: 10px 12px;
                  background: #f9fafb;
                  border-radius: 8px;
                  border: 1px solid #e5e7eb;
                ">
                  <div style="
                    font-size: 11px;
                    color: #6b7280;
                    margin-bottom: 4px;
                    font-weight: 600;
                  ">
                    Avg Score
                  </div>
                  <div style="
                    font-size: 13px;
                    font-weight: 700;
                    color: ${VCP_CHART.text};
                  ">
                   ${avgScore.toFixed(0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style>
            @keyframes shimmer {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(100%); }
            }
          </style>
        `;
        }
      },

      legend: {
        show: false
      }
    };
  }

PillarColorByScore(score: any): string {
  return ahiScoreColor(score);
}

  buildUniqueCategories(data: { pillarName: string }[]): string[] {
    const used = new Set<string>();
    return data.map(item => {
      if (!item.pillarName) return '';
      const words = item.pillarName.trim().split(/\s+/);
      let label = '';
      for (let i = 1; i <= words.length; i++) {
        const candidate = i < words.length ? words.slice(0, i).join(' ') : words.join(' ');
        if (!used.has(candidate)) {
          label = candidate + (i < words.length ? '...' : '');
          used.add(candidate);
          break;
        }
      }
      if (!label) label = words[0] + '...';
      return label;
    });
  }
}
