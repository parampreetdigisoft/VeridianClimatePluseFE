import { Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { AgBarSeriesOptions, AgLineSeriesOptions, AgTooltipRendererDataRow } from "ag-charts-community";
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { AnalystService } from '../../analyst.service';
import { CountryHistoryDto, GetCountriesSubmitionHistoryResponseDto, UserCountryRequestDto } from 'src/app/core/models/countryHistoryDto';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CommonService } from 'src/app/core/services/common.service';

import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexLegend,
  ChartComponent, ApexAxisChartSeries, ApexXAxis, ApexYAxis, ApexStroke, ApexTooltip, ApexDataLabels,
  ApexStates
} from "ng-apexcharts";
import { AiCountryPillarDashboardResponseDto } from 'src/app/core/models/AiCountryPillarDashboardResponseDto';
import { ActivatedRoute, Router } from '@angular/router';
import { AHI_CHART, ahiScoreColor, AHI_AXIS_STYLE } from 'src/app/core/constants/ahi-chart-theme';




export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;

};
export type ApexChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  colors:any;
  dataLabels: ApexDataLabels;
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
  selector: 'app-analyst-dashboard',
  templateUrl: './analyst-dashboard.component.html',
  styleUrl: './analyst-dashboard.component.css',
})
export class AnalystDashboardComponent implements OnInit {
  selectedYear = new Date().getFullYear();
  countries: CountryVM[] | null = [];
  selectedCountries: number | any = '';
  countryHistory: CountryHistoryDto | null = null;
  countryQuestionHistoryReponse: AiCountryPillarDashboardResponseDto | null = null;
  pillarBarOptions: any = {};
  isLoader: boolean = false;
  resizeTimeout: any;
  constructor(private analystService: AnalystService, private toaster: ToasterService,
    private userService: UserService, public commonService: CommonService, private router: Router) { }
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  @ViewChild("apexchart") apexchart!: ChartComponent;
  public apexchartOptions: Partial<ApexChartOptions> = {};

  @ViewChild("chartPillar") chartPillar!: ChartComponent;
  public chartPillarOptions: Partial<PillarChartOptions> = {};

  ngAfterViewInit() { }

  ngOnInit(): void {
    this.isLoader = true;
    this.getAllCountriesByUserId();
    this.yearChanged();

  }
  yearChanged() {
    this.GetCountryHistory();
    this.getCountriesProgressByUserId();
    this.getCountryPillarHistory();
  }
  getCountriesProgressByUserId() {
    this.analystService.getCountriesProgressByUserId(this.userService?.userInfo?.userID ?? 0, this.commonService.getStartOfYearLocal(this.selectedYear)).subscribe({
      next: (res) => {
        if (res.succeeded && res.result) {
          this.apexchartOptions = this.getCountryLineChartOptions(res.result);
        }
      }
    })
  }
  getAllCountriesByUserId() {
    this.analystService.getAllCountriesByUserId(this.userService?.userInfo?.userID).subscribe({
      next: (res) => {
        this.countries = res.result;
        this.isLoader = false;
        if (this.countries && this.countries.length > 0) {
          this.isLoader = true;
          this.selectedCountries = this.countries[0].countryID;
          this.getCountryPillarHistory();
        }
      }
    });
  }

  GetCountryHistory() {
    this.analystService.getCountryHistory(this.userService?.userInfo?.userID ?? 0, this.commonService.getStartOfYearLocal(this.selectedYear)).subscribe({
      next: (res) => {
        this.countryHistory = res.result;;
        this.GetApexPieOptions();
      }
    });
  }
  getCountryPillarHistory() {
    if (this.userService?.userInfo?.userID == null || !this.selectedCountries || this.selectedCountries === '' || this.selectedCountries == null) {
      return;
    }
    let request: UserCountryRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear)
    }
    this.analystService.getCountryPillarHistory(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.countryQuestionHistoryReponse = res.result;
        if (this.countryQuestionHistoryReponse) {
          this.buildPillarComparisonChart();
        }
      },
      error: (err) => {
        this.isLoader = false;
      }
    });
  }
  goToCountryAnalysis() {
    // If countryID exists, pass it as a query parameter
    const queryParams: any = {};
    if (this.selectedCountries > 0) {
      queryParams.countryID = this.selectedCountries;
    }

    this.router.navigate(["/analyst/ai/country-analysis"], { queryParams });
  }

  ExportCountryPillar() {
    let country = this.countries?.find((x) => x.countryID == this.selectedCountries);
    if (this.countryQuestionHistoryReponse?.pillars && country) {
      var exportData = this.countryQuestionHistoryReponse?.pillars.map((x) => {
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
  getCountryLineChartOptions(countriesHistory: GetCountriesSubmitionHistoryResponseDto[]) {

    const evaluationColor = AHI_CHART.lineEvaluation;
    const aiColor = AHI_CHART.lineAi;

    const categories = countriesHistory.map(x => x.countryName);
    const evaluationSeries = countriesHistory.map(x => x.scoreProgress ?? 0);
    const aiSeries = countriesHistory.map(x => x.aiScore ?? 0);

    let option: Partial<ApexChartOptions> = {
      series: [
        {
          name: "Evaluation Progress",
          data: evaluationSeries,
          color: evaluationColor
        },
        {
          name: "AI Progress",
          data: aiSeries,
          color: aiColor
        }
      ],

      chart: {
        type: "line",
        height: 420,
        zoom: { enabled: false },
        toolbar: { show: false }
      },

      stroke: {
        curve: "smooth",
        width: 3
      },



      dataLabels: {
        enabled: true,
        offsetY: -8,
        formatter: (val: number, opts: any) => {
          const d = countriesHistory[opts.dataPointIndex];
          if (!d || val <= 0) return "";

          const country = d.countryName;
          const percent = val.toFixed(val >= 100 ? 0 : 1);
          return `${country} ${percent}`;
        },
        style: {
          fontSize: "11px",
          fontWeight: "600",
          colors: ["#2b2b2b"]
        },
        background: {
          enabled: true,
          borderRadius: 5,
          padding: 6,
          borderWidth: 1,
          borderColor: AHI_CHART.border,
          opacity: 0.95
        }
      },

      colors: [evaluationColor, aiColor],

      xaxis: {
        categories,
        labels: {
          rotate: -25,
          style: { fontSize: "12px" }
        }
      },

      yaxis: {
        min: 0,
        max: 100,
        decimalsInFloat: 0,
        title: {
          text: "Submission  Progress",
          style: { fontSize: "13px", fontWeight: 600 }
        }
      },

      tooltip: {
        theme: 'light',
        custom: ({ dataPointIndex }) => {
          const d = countriesHistory[dataPointIndex];
          if (!d) return "";

          return `
          <div style="padding:14px 16px; min-width:220px; font-size:12px; font-family:Poppins,sans-serif; background:#fff; border-radius:12px; box-shadow:${AHI_CHART.tooltipShadow}; border-left:4px solid ${AHI_CHART.primary};">
            <div style="font-weight:700; margin-bottom:10px; color:${AHI_CHART.primary}; font-size:14px;">
              ${d.countryName}
            </div>
            <div style="margin-bottom:8px; color:${AHI_CHART.textMuted};">
              Total Answered: <b style="color:${AHI_CHART.text}">${d.ansQuestion}</b>
            </div>

            <div style="display:flex; align-items:center; gap:8px; margin:6px 0; padding:6px 8px; background:rgba(0,109,119,0.06); border-radius:8px;">
              <span style="width:10px; height:10px; background:${evaluationColor}; border-radius:50%; box-shadow:0 0 0 2px ${evaluationColor}33;"></span>
              <span style="color:${AHI_CHART.textMuted}">Evaluation:</span>
              <b style="margin-left:auto; color:${AHI_CHART.text}">${(d.scoreProgress ?? 0).toFixed(1)}</b>
            </div>

            <div style="display:flex; align-items:center; gap:8px; margin:6px 0; padding:6px 8px; background:rgba(168,224,99,0.12); border-radius:8px;">
              <span style="width:10px; height:10px; background:${aiColor}; border-radius:50%; box-shadow:0 0 0 2px ${aiColor}44;"></span>
              <span style="color:${AHI_CHART.textMuted}">AI Score:</span>
              <b style="margin-left:auto; color:${AHI_CHART.text}">${(d.aiScore ?? 0).toFixed(1)}</b>
            </div>
          </div>
        `;
        }
      }
    };

    return option;
  }


  GetApexPieOptions() {
    const total = this.countryHistory?.totalCountry ?? 0;
    const active = this.countryHistory?.activeCountry ?? 0;
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
    const data = [...(this.countryQuestionHistoryReponse?.pillars ?? [])];

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

          return `${Math.round(val)}%`;
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
        strokeColors: '#fff',
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
          formatter: (val) => val >= 0 ? `${Math.round(val)}%` : '',
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
