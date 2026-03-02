import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { FormService, FormSubmission } from '../../services/form.service';

@Component({
  selector: 'app-survey',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './survey.component.html',
  styleUrl: './survey.component.css'
})
export class SurveyComponent implements OnInit {
  currentStep = signal(1);
  totalSteps = 5;
  steps = [1, 2, 3, 4, 5];

  consentForm!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;
  step4Form!: FormGroup;
  step5Form!: FormGroup;

  formId: number | null = null;
  isOnline = signal(navigator.onLine);
  saving = signal(false);
  savedMessage = signal('');
  submitted = signal(false);

  respondentType = signal<'head' | 'representative'>('head');
  noIdCard = signal(false);
  idFrontFile = signal<string>('');
  idBackFile = signal<string>('');
  passportFile = signal<string>('');

  swName = computed(() => {
    const user = this.authService.user();
    if (!user) return '';
    return [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || '';
  });

  interviewDate = computed(() => {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  });

  constructor(
    public authService: AuthService,
    private formService: FormService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  ngOnInit() {
    this.initForms();

    window.addEventListener('online', () => {
      this.isOnline.set(true);
      this.syncLocalDraft();
    });
    window.addEventListener('offline', () => this.isOnline.set(false));

    const draft = this.formService.loadLocalDraft();
    if (draft) {
      this.restoreFromDraft(draft);
    }
  }

  private initForms() {
    this.consentForm = this.fb.group({
      consentRespondent: [false, Validators.requiredTrue],
      consentShareData: [false, Validators.requiredTrue],
    });

    this.step2Form = this.fb.group({
      respondentType: ['head'],
      noIdCard: [false],
      idNumber: [''],
      idFrontFileName: [''],
      idBackFileName: [''],
      passportNumber: [''],
      passportFileName: [''],
    });

    this.step3Form = this.fb.group({
      incomeSource: [''],
      monthlyIncome: [''],
      employmentStatus: [''],
      housingType: [''],
    });

    this.step4Form = this.fb.group({
      healthConditions: [''],
      disabilities: [''],
      educationLevel: [''],
      schoolEnrollment: [''],
    });

    this.step5Form = this.fb.group({
      currentAssistance: [''],
      assistanceType: [''],
      additionalNeeds: [''],
      notes: [''],
    });
  }

  private restoreFromDraft(draft: FormSubmission) {
    if (draft.consentRespondent) {
      this.consentForm.patchValue({
        consentRespondent: draft.consentRespondent,
        consentShareData: draft.consentShareData,
      });
    }
    if (draft.step2Data) this.step2Form.patchValue(draft.step2Data);
    if (draft.step3Data) this.step3Form.patchValue(draft.step3Data);
    if (draft.step4Data) this.step4Form.patchValue(draft.step4Data);
    if (draft.step5Data) this.step5Form.patchValue(draft.step5Data);
    if (draft.currentStep) this.currentStep.set(draft.currentStep);
    if (draft.id) this.formId = draft.id;
  }

  get canStartSurvey(): boolean {
    return this.consentForm.valid;
  }

  startSurvey() {
    if (this.canStartSurvey) {
      this.currentStep.set(2);
      this.saveDraft();
    }
  }

  goToStep(step: number) {
    if (step === 1 || (step > 1 && this.consentForm.valid)) {
      this.currentStep.set(step);
    }
  }

  nextStep() {
    if (this.currentStep() < this.totalSteps) {
      this.currentStep.set(this.currentStep() + 1);
      this.saveDraft();
    }
  }

  prevStep() {
    if (this.currentStep() > 1) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  private buildFormData(): FormSubmission {
    return {
      id: this.formId ?? undefined,
      swName: this.swName(),
      supervisorName: '',
      interviewDate: this.interviewDate(),
      consentRespondent: this.consentForm.value.consentRespondent,
      consentShareData: this.consentForm.value.consentShareData,
      currentStep: this.currentStep(),
      step2Data: this.step2Form.value,
      step3Data: this.step3Form.value,
      step4Data: this.step4Form.value,
      step5Data: this.step5Form.value,
      status: 'draft',
    };
  }

  saveDraft() {
    const data = this.buildFormData();
    this.formService.saveDraftLocally(data);

    if (this.isOnline()) {
      this.formService.saveToServer(data).subscribe({
        next: (saved) => {
          this.formId = saved.id!;
          data.id = saved.id;
          this.formService.saveDraftLocally(data);
        },
        error: () => {}
      });
    }
  }

  async submitForm() {
    this.saving.set(true);
    const data = this.buildFormData();
    data.status = 'submitted';

    if (this.isOnline()) {
      this.formService.saveToServer(data).subscribe({
        next: () => {
          this.formService.clearLocalDraft();
          this.saving.set(false);
          this.submitted.set(true);
        },
        error: () => {
          this.formService.saveDraftLocally(data);
          this.saving.set(false);
          this.savedMessage.set('تم حفظ النموذج محلياً. سيتم إرساله عند استعادة الاتصال.');
        }
      });
    } else {
      this.formService.saveDraftLocally(data);
      this.saving.set(false);
      this.savedMessage.set('تم حفظ النموذج محلياً. سيتم إرساله عند استعادة الاتصال.');
    }
  }

  setRespondentType(type: 'head' | 'representative') {
    this.respondentType.set(type);
    this.step2Form.patchValue({ respondentType: type });
  }

  toggleNoIdCard() {
    this.noIdCard.set(!this.noIdCard());
    this.step2Form.patchValue({ noIdCard: this.noIdCard() });
    if (this.noIdCard()) {
      this.step2Form.patchValue({ idNumber: '', idFrontFileName: '', idBackFileName: '' });
      this.idFrontFile.set('');
      this.idBackFile.set('');
    }
  }

  onFileSelected(event: Event, field: 'idFront' | 'idBack' | 'passport') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileName = input.files[0].name;
      switch (field) {
        case 'idFront':
          this.idFrontFile.set(fileName);
          this.step2Form.patchValue({ idFrontFileName: fileName });
          break;
        case 'idBack':
          this.idBackFile.set(fileName);
          this.step2Form.patchValue({ idBackFileName: fileName });
          break;
        case 'passport':
          this.passportFile.set(fileName);
          this.step2Form.patchValue({ passportFileName: fileName });
          break;
      }
    }
  }

  private syncLocalDraft() {
    const draft = this.formService.loadLocalDraft();
    if (draft && draft.status === 'submitted') {
      this.formService.saveToServer(draft).subscribe({
        next: () => {
          this.formService.clearLocalDraft();
          this.savedMessage.set('تم إرسال النموذج المحفوظ بنجاح');
        },
        error: () => {}
      });
    } else if (draft) {
      this.formService.saveToServer(draft).subscribe({
        next: (saved) => {
          this.formId = saved.id!;
          draft.id = saved.id;
          this.formService.saveDraftLocally(draft);
        },
        error: () => {}
      });
    }
  }

  startNewForm() {
    this.formService.clearLocalDraft();
    this.formId = null;
    this.currentStep.set(1);
    this.submitted.set(false);
    this.savedMessage.set('');
    this.initForms();
  }

  onLogout() {
    this.authService.logout();
  }
}
