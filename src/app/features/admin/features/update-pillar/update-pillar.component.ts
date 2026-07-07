import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AnalyticalLayerResponseDto } from 'src/app/core/models/GetAnalyticalLayerResultDto';
import { AdminService } from '../../admin.service';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-update-pillar',
  templateUrl: './update-pillar.component.html',
  styleUrl: './update-pillar.component.css'
})
export class UpdatePillarComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() pillar: PillarsVM | null = null;
  @Input() kpis: AnalyticalLayerResponseDto[] = [];
  @Input() nextDisplayOrder = 1;
  @Output() pillarChange = new EventEmitter<PillarsVM | null>();
  @Output() closeModal = new EventEmitter<void>();
  @Input() loading: boolean = false;
  selectedImage: string | ArrayBuffer | null = null;
  imageFile: File | null = null;
  imageError: string = '';
  isSubmitted = false;
  isLoadingMappings = false;
  quillEditorKey = 0;
  pillarForm!: FormGroup;
  urlBase = environment.apiUrl;
  @ViewChild('fileInput') fileInput!: ElementRef;
  @ViewChild('kpiSelectContainer') kpiSelectContainer?: ElementRef<HTMLElement>;

  constructor(private fb: FormBuilder, private adminService: AdminService) { }

  ngAfterViewInit(): void {}

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  ngOnInit(): void {
    this.setupForm(this.pillar);
    this.quillEditorKey = 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pillar'] && this.pillarForm) {
      this.resetFileState();
      this.setupForm(this.pillar);
      this.quillEditorKey++;
    }

    if (changes['kpis'] && this.pillarForm && this.kpis.length > 0) {
      this.syncKpiControlValue();
    }
  }

  get kpiSelectReady(): boolean {
    return this.kpis.length > 0 && (!this.pillar?.pillarID || !this.isLoadingMappings);
  }

  get selectedKpiCount(): number {
    return this.getSelectedKpiIds().length;
  }

  get selectedFileName(): string {
    return this.imageFile?.name ?? 'No file chosen';
  }

  get selectedKpis(): AnalyticalLayerResponseDto[] {
    const ids = this.getSelectedKpiIds();
    return this.kpis.filter((k) => ids.includes(Number(k.layerID)));
  }

  compareKpiIds = (a: number, b: number) => Number(a) === Number(b);

  setupForm(pillar: PillarsVM | null) {
    this.pillarForm = this.fb.group({
      pillarName: [pillar?.pillarName ?? '', Validators.required],
      pillarCode: [pillar?.pillarCode ?? ''],
      displayOrder: [
        pillar?.displayOrder ?? this.nextDisplayOrder,
        [Validators.required, Validators.min(1)],
      ],
      weight: [pillar?.weight ?? 1, [Validators.required, Validators.min(0.01)]],
      reliability: [pillar?.reliability ?? true, [Validators.required]],
      description: [this.decodeDescription(pillar?.description), Validators.required],
      imageFile: [null],
      kpiLayerIds: [[] as number[]],
    });

    if (pillar?.pillarID) {
      this.loadPillarKpiMappings(pillar.pillarID);
    }
  }

  getSelectedKpiIds(): number[] {
    return this.normalizeKpiIds(this.pillarForm?.get('kpiLayerIds')?.value ?? []);
  }

  normalizeKpiIds(ids: Array<number | string>): number[] {
    return ids
      .map((id) => Number(id))
      .filter((id) => !Number.isNaN(id) && id > 0);
  }

  setKpiLayerIds(ids: number[]) {
    const control = this.pillarForm.get('kpiLayerIds');
    control?.setValue(this.normalizeKpiIds(ids));
    control?.markAsDirty();
    control?.updateValueAndValidity();
  }

  syncKpiControlValue() {
    const currentIds = this.getSelectedKpiIds();
    if (currentIds.length > 0) {
      this.setKpiLayerIds(currentIds);
    }
  }

  resetFileState() {
    this.isSubmitted = false;
    this.imageFile = null;
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    this.selectedImage = null;
  }

  decodeDescription(text?: string): string {
    if (!text) {
      return '';
    }
    const txt = document.createElement('textarea');
    txt.innerHTML = text;
    return txt.value.replace(/\u00a0/g, ' ');
  }

  onEditorCreated(quill: any) {
    const html = this.pillarForm?.get('description')?.value ?? '';
    if (html) {
      quill.clipboard.dangerouslyPasteHTML(html);
    }
  }

  loadPillarKpiMappings(pillarId: number) {
    this.isLoadingMappings = true;
    this.adminService.getPillarKpiMappings(pillarId).subscribe({
      next: (res) => {
        if (res.succeeded) {
          const layerIds = (res.result ?? []).map((m) => Number(m.layerID));
          this.setKpiLayerIds(layerIds);
        } else {
          this.setKpiLayerIds([]);
        }
        this.isLoadingMappings = false;
      },
      error: () => {
        this.setKpiLayerIds([]);
        this.isLoadingMappings = false;
      },
    });
  }

  customSearchFn(term: string, item: AnalyticalLayerResponseDto) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }

  onKpiDropdownOpen() {
    setTimeout(() => {
      document.querySelectorAll('body > .ng-dropdown-panel').forEach((panel) => {
        const element = panel as HTMLElement;
        element.style.zIndex = '20050';
      });
    });
  }

  onKpiSelectionChange() {
    this.setKpiLayerIds(this.pillarForm.get('kpiLayerIds')?.value ?? []);
  }

  removeKpi(layerId: number) {
    const current = this.getSelectedKpiIds();
    this.setKpiLayerIds(current.filter((id) => id !== Number(layerId)));
  }

  clearAllKpis() {
    this.setKpiLayerIds([]);
  }

  onSubmit() {
    this.isSubmitted = true;
    if (this.pillarForm.valid) {
      const pillarData: PillarsVM = {
        ...this.pillarForm.value,
        pillarID: this.pillar?.pillarID ?? 0,
        displayOrder: Number(this.pillarForm.value.displayOrder),
        pillarCode: (this.pillarForm.value.pillarCode ?? '').trim(),
        kpiLayerIds: this.getSelectedKpiIds(),
      };
      if (this.imageFile) {
        pillarData.imageFile = this.imageFile;
      }
      this.pillarChange.emit(pillarData);
      this.isSubmitted = false;
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    if (!file.type.startsWith('image/')) {
      this.imageError = 'Please select a valid image file.';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.imageError = 'Image size should be less than 5MB.';
      return;
    }

    this.imageError = '';
    this.imageFile = file;

    const reader = new FileReader();
    reader.onload = () => {
      this.selectedImage = reader.result;
    };
    reader.readAsDataURL(file);

    this.pillarForm.patchValue({ image: file });
  }
}
