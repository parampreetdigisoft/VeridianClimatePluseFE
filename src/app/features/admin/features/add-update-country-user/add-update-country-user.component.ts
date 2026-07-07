import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { CountryVM } from "../../../../core/models/CountryVM";
import { AbstractControl, AsyncValidatorFn, FormBuilder, FormGroup, ValidationErrors, Validators } from "@angular/forms";
import {
  InviteUserDto,
  UpdateInviteUserDto,
} from "../../../../core/models/AnalystVM";
import { GetUserByRoleResponse } from "../../../../core/models/GetUserByRoleResponse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { UserRoleValue } from "src/app/core/enums/UserRole";
import { UserService } from "src/app/core/services/user.service";
import { catchError, debounceTime, map, Observable, of, switchMap } from "rxjs";
import { AdminService } from "../../admin.service";
import { TieredAccessPlan, TieredAccessPlanValue } from "src/app/core/enums/TieredAccessPlan";
import { PillarsVM } from "src/app/core/models/PillersVM";


@Component({
  selector: "app-add-update-country-user",
  templateUrl: "./add-update-country-user.component.html",
  styleUrl: "./add-update-country-user.component.css",
})
export class AddUpdateCountryUserComponent implements OnInit {
  @Input() countryUser: GetUserByRoleResponse | null = null;
  @Input() countries: CountryVM[] | null = [];
  @Output() countryUserChange = new EventEmitter<UpdateInviteUserDto | null>();
  @Output() closeCountryUserModel = new EventEmitter<boolean>();
  @Output() bulkImportChange = new EventEmitter<UpdateInviteUserDto[] | null>();
  @ViewChild("fileInput") fileInput!: ElementRef<HTMLInputElement>;
  @Input() loading: boolean = false;
  @Input() pillars: PillarsVM[] = [];

  alertMsg = "";
  excelData: any;
  isSubmitted: boolean = false;
  requiredHeaders = ["FullName", "Email", "Phone", "CountryName"];
  countryUserForm: FormGroup<any> = this.fb.group({});
  tierOptions = [
    { label: 'Basic', value: TieredAccessPlanValue.Basic },
    { label: 'Standard', value: TieredAccessPlanValue.Standard },
    { label: 'Premium', value: TieredAccessPlanValue.Premium }
  ];
  tierLimits: any = {
    1: { min: 5, max: 7, name: 'Basic' },
    2: { min: 8, max: 12, name: 'Standard' },
    3: { min: 13, max: 23, name: 'Premium' }
  };
  pillarLimitMsg: string = '';
  limitMessages: { [key: string]: string } = {};

  constructor(private fb: FormBuilder, private userService: UserService, private adminService: AdminService,) {
  }
  ngOnInit(): void {
    this.initializeForm();
  }
  initializeForm() {
    this.countryUserForm = this.fb.group({
      fullName: [this.countryUser?.fullName, [Validators.required]],
      email: [this.countryUser?.email, [Validators.required, Validators.email], this.emailExistsValidator()],
      phone: [this.countryUser?.phone, [Validators.required]],
      tier: [this.countryUser?.tier, [Validators.required]],
      pillars: [this.countryUser?.pillars, [Validators.required]],
      country: [
        this.countryUser?.countries?.map((x) => x?.countryID) ?? [],
        [Validators.required],
      ],
    });
  }
  emailExistsValidator(): AsyncValidatorFn {
    return (control: AbstractControl): Observable<ValidationErrors | null> => {

      if (!control.value) {
        return of(null);
      }

      return of(control.value).pipe(
        debounceTime(500),
        switchMap(email =>
          this.adminService.checkEmailExist({
            email: email,
            userId: this.countryUser?.userID ?? 0
          })
        ),
        map((exists: boolean) => {
          return exists ? { emailExists: true } : null;
        }),
        catchError(() => of(null))
      );
    };
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.alertMsg = "";
    this.isSubmitted = false;
    if (this.countryUser && this.countryUser.countries) {
      const selectedCountryIds = this.countryUser.countries.map(c => c.countryID);
      this.countryUserForm.patchValue({
        country: selectedCountryIds
      });
    }
    this.limitMessages={};
  }


  onSubmit() {
    this.isSubmitted = true;
    if (this.countryUserForm.valid) {
      const countryData: UpdateInviteUserDto = {
        ...this.countryUserForm.value,
        userID: this.countryUser?.userID ?? 0,
        countryID: this.countryUserForm.value.country,
      };
      this.countryUserChange.emit(countryData);
    }
  }
  downloadTemplate() {
    const headers = ["FullName", "Email", "Phone", "countryName"];

    const sampleRow = {
      FullName: "FullName of Country User",
      Email: "Enter Email of Country User",
      Phone: "Enter Phone Number of Country User",
      countryName: "Enter country seprated by comma, like :- USA, Canada, Brazil",
    };

    const ws: XLSX.WorkSheet = XLSX.utils.json_to_sheet([sampleRow], {
      header: headers,
    });
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb: XLSX.WorkBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "CountryUserTemplate");

    const excelBuffer: any = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });
    const data: Blob = new Blob([excelBuffer], {
      type: "application/octet-stream",
    });
    saveAs(data, "AnalystTemplate.xlsx");
  }
  onFileChange(evt: any) {
    this.alertMsg = "";
    const target: DataTransfer = <DataTransfer>evt.target;
    if (target.files.length !== 1) return;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: "binary" });
      const wsname: string = wb.SheetNames[0];
      const ws: XLSX.WorkSheet = wb.Sheets[wsname];

      const jsonData = <any[]>XLSX.utils.sheet_to_json(ws, { defval: "" });

      // ✅ Header validation
      const headers = Object.keys(jsonData[0] || {});
      const missingHeaders = this.requiredHeaders.filter(
        (h) => !headers.includes(h)
      );
      if (missingHeaders.length > 0) {
        this.alertMsg = `Invalid file format. Missing headers: ${missingHeaders.join(
          ", "
        )}`;
        this.fileInput.nativeElement.value = "";
        return;
      }

      // ✅ Validation regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const phoneRegex = /^[0-9+\-\s()]+$/;

      const excelData: InviteUserDto[] = [];

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];

        const fullName = String(row["FullName"] || "").trim();
        const email = String(row["Email"] || "").trim();
        const phone = String(row["Phone"] || "").trim();
        const countryName = String(row["countryName"] || "").trim();

        const isCompletelyBlank = !fullName && !email && !phone && !countryName;
        if (isCompletelyBlank) {
          continue;
        }
        // ✅ Required check
        if (!fullName || !email || !phone || !countryName) {
          this.alertMsg = `Row ${i + 2}: All fields are required.`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (fullName.toLowerCase() === "FullName of Analyst".toLowerCase()) {
          continue;
        }

        // ✅ Email validation
        if (!emailRegex.test(email)) {
          this.alertMsg = `Row ${i + 2}: Invalid email format (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        if (
          excelData.some((c) => c.email.toLowerCase() === email.toLowerCase())
        ) {
          this.alertMsg = `Row ${i + 2}: Duplicate email name (${email}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }
        // ✅ Phone validation
        if (!phoneRegex.test(phone)) {
          this.alertMsg = `Row ${i + 2
            }: Invalid phone number format (${phone}).`;
          this.fileInput.nativeElement.value = "";
          return;
        }

        // ✅ Construct DTO (invitedUserID/userID can be handled later by API)
        const dto: InviteUserDto = {
          invitedUserID: this.userService.userInfo?.userID ?? 0,
          fullName,
          email,
          phone,
          password: email,
          role: UserRoleValue.CountryUser,
          countryID: this.getCountryByName(countryName),
        };
        excelData.push(dto);
      }
      this.excelData = excelData;
      if (this.excelData.length == 0) {
        this.alertMsg = "The uploaded file does not contain any valid records.";
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }

  getCountryByName(countryNames: string): number[] {
    if (!countryNames) return [];
    return countryNames
      .split(",")
      .map((name) => name.trim())
      .map((name) => this.countries?.find((c) => c.countryName === name)?.countryID)
      .filter((id): id is number => id !== undefined);
  }

  bulkImport() {
    if (this.excelData.length > 0 && this.fileInput.nativeElement.value != "") {
      this.bulkImportChange.emit(this.excelData);
      this.fileInput.nativeElement.value = "";
      this.excelData = [];
    }
  }
  closeModel() {
    if (this.fileInput?.nativeElement?.value)
      this.fileInput.nativeElement.value = "";
    this.alertMsg = "";
    this.closeCountryUserModel.emit(true);
  }

  numberOnly(event: KeyboardEvent): void {
    const key = event.key;
    if (!/^[0-9+]$/.test(key)) {
      event.preventDefault();
    }
  }
  checkSelectionLimit(controlName: string) {
    const control = this.countryUserForm.get(controlName);
    const selected = control?.value || [];
    const tier = this.countryUserForm.get('tier')?.value;

    let message = '';

    if (!tier || !this.tierLimits[tier]) {
      this.limitMessages[controlName] = 'Please select a tier first.';
      return;
    }

    const { min, max, name } = this.tierLimits[tier];

    // ✅ Only for multi-select
    if (Array.isArray(selected)) {

      // Enforce MAX limit
      if (selected.length > max) {
        control?.patchValue(selected.slice(0, max));
        message = `${name} plan allows maximum ${max} selections.`;
      }

      // Enforce MIN validation (message only)
      else if (selected.length < min) {
        message = `${name} plan requires at least ${min} selections.`;
      } else {
        message = ''; // valid
      }
    }

    this.limitMessages[controlName] = message;
  }
  trackByFn(item: any) {
    return item.pillarID;
  }
}
