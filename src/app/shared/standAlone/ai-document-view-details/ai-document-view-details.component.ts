import { Component, computed, EventEmitter, input, Input, OnChanges, OnInit, Output, output, signal, SimpleChanges } from '@angular/core';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { GetCountryDocumentResponseDto, GetCountryPillarDocumentResponseDto } from 'src/app/core/models/aiVm/GetCountryDocumentResponseDto';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { FormsModule } from '@angular/forms';
import { DeleteCountryDocumentRequestDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestDto';
import { PromptComponent } from '../../prompt/prompt.component';

export interface SelectedFileModel {
  file: File;
  pillarID?: number;
  pillarName?: string;
}

@Component({
  selector: 'app-ai-document-view-details',
  standalone: true,
  imports: [CommonModule, FormsModule, PromptComponent],
  templateUrl: './ai-document-view-details.component.html',
  styleUrl: './ai-document-view-details.component.css'
})

export class AiDocumentViewDetailsComponent implements OnInit, OnChanges {

  selectCountryDocuemnt?: number | string;
  totalFiles = computed(() => (this.selectedCountry()?.noOfFiles ?? 0) + this.selectedFiles().length);
  selectedCountry = input<GetCountryDocumentResponseDto | null | undefined>(null);
  documents = input<GetCountryPillarDocumentResponseDto[]>([]);
  pillars = input<PillarsVM[]>([]);
  isUploadModalOpen = false;
  selectedFiles = signal<SelectedFileModel[]>([]);
  selectedPillarID?: number;
  @Output() uploadedDocuments = new EventEmitter<FormData>();
  @Output() deleteDocument = new EventEmitter<DeleteCountryDocumentRequestDto>();
  @Output() downloadDocument = new EventEmitter<GetCountryPillarDocumentResponseDto>();
  @Input() saveDocumentLoader: boolean = false;
  countryDocuments = computed(() =>
    this.documents().filter(x => !x.pillarID)
  );

  pillarDocuments = computed(() =>
    this.documents().filter(x => x.pillarID != null && x.pillarID > 0)
  );

  urlBase = environment.apiUrl;

  ngOnInit(): void {
  }
  ngOnChanges(changes: SimpleChanges): void {
    this.selectedFiles.set([]);
    this.selectCountryDocuemnt = this.selectedCountry()?.countryID
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];

      if (!allowedTypes.includes(file.type)) continue;

      const exists = this.selectedFiles().some(
        f => f.file.name === file.name && f.file.size === file.size
      );

      if (!exists) {
        let f: SelectedFileModel = {
          pillarID: this.selectedPillarID,
          pillarName: this.pillars().find(x => x.pillarID == this.selectedPillarID)?.pillarName,
          file: file
        }

        this.selectedFiles.update(files => [...files, f]);
        this.selectedPillarID = undefined;
      }
    }

    input.value = '';
  }

  removeFile(index: number) {
    this.selectedFiles.update(files =>
      files.filter((_, i) => i !== index)
    );
  }

  formatFileSize(size: number): string {
    return (size / 1024).toFixed(2) + ' KB';
  }

  uploadDocuments() {
    const formData = new FormData();
    if (this.selectCountryDocuemnt && this.selectCountryDocuemnt != undefined && this.selectCountryDocuemnt != "undefined") {
      formData.append('CountryID', this.selectCountryDocuemnt.toString());
    }
    this.selectedFiles().forEach((item, index) => {
      formData.append('Files', item.file); 
      formData.append('PillarIDs', item.pillarID?.toString() ?? '0');
    });
    this.uploadedDocuments.emit(formData);
  }

  openUploadModal() {
    this.isUploadModalOpen = true;
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
    this.selectedFiles.set([]);
    this.selectedPillarID = undefined;
  }

  doneUploadModal() {
    this.isUploadModalOpen = false;
    this.selectedPillarID = undefined;
  }

  deleteCountryDocument(doc: GetCountryPillarDocumentResponseDto) {
    let payload: DeleteCountryDocumentRequestDto = {
      countryID: this.selectedCountry()?.countryID ?? 0,
      countryDocumentID: doc?.countryDocumentID,
      isAll: false
    }
    this.deleteDocument.emit(payload);
  }

  download(doc: GetCountryPillarDocumentResponseDto) {
    this.downloadDocument.emit(doc);
  }
}

