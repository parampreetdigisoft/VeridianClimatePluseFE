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
import { CountryVM } from "src/app/core/models/CountryVM";
import { CountryHistoryDto, UserCountryRequestDto } from "../../../../core/models/countryHistoryDto";
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
import { AiCountryPillarDashboardResponseDto } from "src/app/core/models/AiCountryPillarDashboardResponseDto";
import { AHI_CHART, ahiScoreColor, AHI_AXIS_STYLE } from "src/app/core/constants/ahi-chart-theme";

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
  countries: CountryVM[] | null = [];
  selectedCountries: number | any = "";
  countryHistory: CountryHistoryDto | null = null;
  countryQuestionHistoryResponse: AiCountryPillarDashboardResponseDto | null = null;
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
    this.getAllCountriesByUserId();
    this.GetCountryHistory();
  }

  ngAfterViewInit() { }

  getAllCountriesByUserId() {
    this.adminService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result;
          this.isLoader = false;
          if (this.countries && this.countries.length > 0) {
            this.isLoader = true;
            this.selectedCountries = this.countries[0].countryID;
            this.getCountryPillarHistory();
          }
        },
      });
  }

  yearChanged() {
    this.getCountryPillarHistory();
    this.GetCountryHistory();
  }

  GetCountryHistory() {
    this.adminService
      .getCountryHistory(
        this.userService?.userInfo?.userID ?? 0,
        this.commonService.getStartOfYearLocal(this.selectedYear)
      )
      .subscribe({
        next: (res) => {
          this.countryHistory = res.result;
          this.GetApexPieOptions();
        },
      });
  }

  getCountryPillarHistory() {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedCountries ||
      this.selectedCountries === "" ||
      this.selectedCountries == null
    ) {
      return;
    }
    let request: UserCountryRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
    };
    this.adminService.getCountryPillarHistory(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.countryQuestionHistoryResponse = res.result;
        if (this.countryQuestionHistoryResponse) {
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
      },
    });
  }
  goToCountryAnalysis() {
    // If countryID exists, pass it as a query parameter
    const queryParams: any = {};
    if (this.selectedCountries > 0) {
      queryParams.countryID = this.selectedCountries;
    }

    this.router.navigate(["/admin/ai/country-analysis"], { queryParams });
  }

  ExportCountryPillar() {
    let country = this.countries?.find((x) => x.countryID == this.selectedCountries);
    if (this.countryQuestionHistoryResponse?.pillars && country) {
      var exportData = this.countryQuestionHistoryResponse?.pillars.map((x) => {
        return {
          countryName: country?.countryName,
          PillarName: x.pillarName,
          AIScore: x.aiValue?.toFixed(2),
          EvaluationScore: x.evaluationValue?.toFixed(2)
        };
      });
      this.commonService.exportExcel(exportData);
    } else {
      this.toaster.showWarning("Please select country to export the records");
    }
  }
  GetApexPieOptions() {
    const total = this.countryHistory?.totalCountry ?? 0;
    const active = this.countryHistory?.activeCountry?? 0;
    const inprogress = this.countryHistory?.inprocessCountry ?? 0;
    const complete = this.countryHistory?.compeleteCountry ?? 0;

    const finalizeCountry = this.countryHistory?.finalizeCountry ?? 0;
    const unFinalize = this.countryHistory?.unFinalize ?? 0;

    this.chartOptions = {
      series: [
        (total / total) * 100,
        (active / total) * 100,
        (inprogress / total) * 100,
        (complete / total) * 100,
        (finalizeCountry / total) * 100,
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
            background: AHI_CHART.hollow,
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
              label: "Total Country",
              formatter: (value: any) => {
                return `${total}`;
              },
            },
          },
        },
      },
      colors: [...AHI_CHART.radialBar],
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
    const data = [...(this.countryQuestionHistoryResponse?.pillars ?? [])];

    const categories = this.buildUniqueCategories(data);
    const aiSeries = data.map(x => x.aiValue);
    const evaluatorSeries = data.map(x => x.evaluationValue);
    this.chartPillarOptions = {
      series: [{
        name: 'AI Progress',
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
        colors: [AHI_CHART.primary, AHI_CHART.secondary],
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

      colors: [AHI_CHART.primary, AHI_CHART.secondary],

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
        ...AHI_AXIS_STYLE.grid,
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
            avgScore >= 50 ? 'Strong Progress' :
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
            border-left: 4px solid ${AHI_CHART.primary};
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
                    color: ${AHI_CHART.text};
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

              <!-- Progress Bar -->
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
                    color: ${AHI_CHART.text};
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
