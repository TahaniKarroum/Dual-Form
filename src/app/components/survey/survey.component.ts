import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
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
  totalSteps = 6;
  steps = [1, 2, 3, 4, 5, 6];

  consentForm!: FormGroup;
  step2Form!: FormGroup;
  step3Form!: FormGroup;
  step4Form!: FormGroup;
  step5Form!: FormGroup;
  step6Form!: FormGroup;

  formId: number | null = null;
  isOnline = signal(navigator.onLine);
  saving = signal(false);
  savedMessage = signal('');
  submitted = signal(false);
  step2SavedOnce = signal(false);

  respondentType = signal<'head' | 'representative'>('head');
  noIdCard = signal(false);
  gender = signal<'male' | 'female'>('male');
  hasDisability = signal<'yes' | 'no'>('no');
  idFrontFile = signal<string>('');
  idBackFile = signal<string>('');
  passportFile = signal<string>('');
  allLiveInLebanon = signal<'yes' | 'no'>('yes');
  agreeTerms = signal(false);
  expandedMemberIndex = signal<number | null>(null);
  memberCountMismatch = signal(false);

  headUnder18 = signal(false);
  headMaritalInvalid = signal(false);

  private calculateAge(dob: string): number {
    if (!dob) return -1;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  private readonly marriedStatuses = ['married', 'polygamous', 'widowed', 'divorced', 'separated'];

  private checkHeadAge() {
    const dob = this.step2Form?.get('dateOfBirth')?.value;
    const age = this.calculateAge(dob);
    this.headUnder18.set(age >= 0 && age < 18);
    this.checkHeadMaritalStatus();
  }

  private checkHeadMaritalStatus() {
    const dob = this.step2Form?.get('dateOfBirth')?.value;
    const age = this.calculateAge(dob);
    const status = this.step2Form?.get('maritalStatus')?.value;
    this.headMaritalInvalid.set(age >= 0 && age < 9 && this.marriedStatuses.includes(status));
  }

  isMemberMaritalInvalid(index: number): boolean {
    const member = this.getMemberGroup(index);
    const dob = member?.get('dateOfBirth')?.value;
    const age = this.calculateAge(dob);
    const status = member?.get('maritalStatus')?.value;
    return age >= 0 && age < 9 && this.marriedStatuses.includes(status);
  }

  districtsMap: Record<string, { value: string; label: string }[]> = {
    beirut: [
      { value: 'beirut', label: 'بيروت' },
    ],
    mount_lebanon: [
      { value: 'baabda', label: 'بعبدا' },
      { value: 'aley', label: 'عاليه' },
      { value: 'chouf', label: 'الشوف' },
      { value: 'keserwan', label: 'كسروان' },
      { value: 'metn', label: 'المتن' },
      { value: 'jbeil', label: 'جبيل' },
    ],
    north: [
      { value: 'tripoli', label: 'طرابلس' },
      { value: 'minieh_dennie', label: 'المنية الضنية' },
      { value: 'zgharta', label: 'زغرتا' },
      { value: 'koura', label: 'الكورة' },
      { value: 'bcharre', label: 'بشري' },
      { value: 'batroun', label: 'البترون' },
    ],
    south: [
      { value: 'saida', label: 'صيدا' },
      { value: 'tyre', label: 'صور' },
      { value: 'jezzine', label: 'جزين' },
    ],
    bekaa: [
      { value: 'zahle', label: 'زحلة' },
      { value: 'west_bekaa', label: 'البقاع الغربي' },
      { value: 'rashaya', label: 'راشيا' },
    ],
    nabatieh: [
      { value: 'nabatieh', label: 'النبطية' },
      { value: 'hasbaya', label: 'حاصبيا' },
      { value: 'marjayoun', label: 'مرجعيون' },
      { value: 'bent_jbeil', label: 'بنت جبيل' },
    ],
    akkar: [
      { value: 'akkar', label: 'عكار' },
    ],
    baalbek_hermel: [
      { value: 'baalbek', label: 'بعلبك' },
      { value: 'hermel', label: 'الهرمل' },
    ],
  };

  availableDistricts = computed(() => {
    const gov = this.step2Form?.get('governorate')?.value;
    return this.districtsMap[gov] || [];
  });

  getDistrictsForGovernorate(gov: string): { value: string; label: string }[] {
    return this.districtsMap[gov] || [];
  }

  onGovernorateChange() {
    this.step2Form.patchValue({ district: '' });
  }

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

    this.step2Form.get('dateOfBirth')?.valueChanges.subscribe(() => {
      this.checkHeadAge();
    });
    this.step2Form.get('maritalStatus')?.valueChanges.subscribe(() => {
      this.checkHeadMaritalStatus();
    });

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
      consentRespondent: ['', Validators.required],
      consentShareData: [''],
    });

    this.step2Form = this.fb.group({
      respondentType: ['head'],
      noIdCard: [false],
      idNumber: [''],
      idFrontFileName: [''],
      idBackFileName: [''],
      passportNumber: [''],
      passportFileName: [''],
      firstName: [''],
      lastName: [''],
      fatherName: [''],
      motherName: [''],
      motherMaidenName: [''],
      dateOfBirth: [''],
      placeOfBirth: [''],
      city: [''],
      gender: ['male'],
      registrationPlace: [''],
      registrationNumber: [''],
      maritalStatus: [''],
      governorate: [''],
      district: [''],
      townCity: [''],
      neighborhood: [''],
      area: [''],
      street: [''],
      buildingName: [''],
      floor: [''],
      apartment: [''],
      nearestKnownPlace: [''],
      mobilePhone: [''],
      homePhone: [''],
      email: [''],
      householdSize: [''],
      domesticWorkers: [''],
      hasDisability: ['no'],
    });

    this.step3Form = this.fb.group({
      employmentStatus: [''],
      incomeFreshDollar: [0],
      incomeLollar: [0],
      incomeLBP: [0],
      otherIncomeDescription: [''],
      otherIncomeAmount: [0],
      otherIncomeCurrency: [''],
      remittanceAmount: [0],
      remittanceCurrency: [''],
      taxId: [''],
    });

    this.step4Form = this.fb.group({
      members: this.fb.array([]),
      allLiveInLebanon: ['yes'],
      agreeTerms: [false],
    });

    this.step5Form = this.fb.group({
      placeType: [''],
      displacedOrHost: [''],
      previousAddress: [''],
      previousHousingCondition: [''],
      housingType: [''],
      housingTypeOther: [''],
      livingArrangement: [''],
      livingArrangementOther: [''],
      numberOfRooms: [''],
      numberOfFamilies: [''],
      totalIndividuals: [''],
      cookingFuel: [''],
      drinkingWaterSource: [''],
      hasWorkingFridge: [''],
      hasWorkingWaterHeater: [''],
      heatingSource: [''],
      electricitySource: [''],
      electricityHours: [''],
      generatorAmps: [''],
      numberOfToilets: [''],
      toiletType: [''],
      sharesToilet: [''],
      hasHealthInsurance: [''],
      healthInsuranceType: [''],
      numberOfMobilePhones: [''],
      assistanceReceived: [''],
      caseNumber: [''],
    });

    this.step6Form = this.fb.group({
      childLostToConflict: [''],
      childSeparatedAccepted: [''],
      childPsychologicalDistress: [''],
    });
  }

  get membersArray(): FormArray {
    return this.step4Form.get('members') as FormArray;
  }

  private createMemberGroup(): FormGroup {
    return this.fb.group({
      noIdCard: [false],
      idNumber: [''],
      idFrontFileName: [''],
      idBackFileName: [''],
      passportNumber: [''],
      passportFileName: [''],
      firstName: [''],
      lastName: [''],
      fatherName: [''],
      motherName: [''],
      motherMaidenName: [''],
      dateOfBirth: [''],
      placeOfBirth: [''],
      city: [''],
      gender: ['male'],
      registrationPlace: [''],
      registrationNumber: [''],
      maritalStatus: [''],
      relationToHead: [''],
      mobilePhone: [''],
      employmentStatus: [''],
      incomeFreshDollar: [0],
      incomeLollar: [0],
      incomeLBP: [0],
      otherIncomeAmount: [0],
      otherIncomeCurrency: [''],
      remittanceAmount: [0],
      remittanceCurrency: [''],
      taxId: [''],
    });
  }

  addMember() {
    this.membersArray.push(this.createMemberGroup());
    this.expandedMemberIndex.set(this.membersArray.length - 1);
    this.memberCountMismatch.set(false);
  }

  removeMember(index: number) {
    this.membersArray.removeAt(index);
    if (this.expandedMemberIndex() === index) {
      this.expandedMemberIndex.set(null);
    }
    this.memberCountMismatch.set(false);
  }

  toggleMember(index: number) {
    this.expandedMemberIndex.set(this.expandedMemberIndex() === index ? null : index);
  }

  getMemberGroup(index: number): FormGroup {
    return this.membersArray.at(index) as FormGroup;
  }

  setMemberGender(index: number, g: 'male' | 'female') {
    this.getMemberGroup(index).patchValue({ gender: g });
  }

  toggleMemberNoIdCard(index: number) {
    const member = this.getMemberGroup(index);
    const current = member.value.noIdCard;
    member.patchValue({ noIdCard: !current });
    if (!current) {
      member.patchValue({ idNumber: '', idFrontFileName: '', idBackFileName: '' });
    }
  }

  onMemberFileSelected(event: Event, index: number, field: 'idFront' | 'idBack' | 'passport') {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const fileName = input.files[0].name;
      const member = this.getMemberGroup(index);
      switch (field) {
        case 'idFront':
          member.patchValue({ idFrontFileName: fileName });
          break;
        case 'idBack':
          member.patchValue({ idBackFileName: fileName });
          break;
        case 'passport':
          member.patchValue({ passportFileName: fileName });
          break;
      }
    }
  }

  setAllLiveInLebanon(val: 'yes' | 'no') {
    this.allLiveInLebanon.set(val);
    this.step4Form.patchValue({ allLiveInLebanon: val });
  }

  toggleAgreeTerms() {
    this.agreeTerms.set(!this.agreeTerms());
    this.step4Form.patchValue({ agreeTerms: this.agreeTerms() });
  }

  private restoreFromDraft(draft: FormSubmission) {
    if (draft.consentRespondent) {
      this.consentForm.patchValue({
        consentRespondent: draft.consentRespondent,
        consentShareData: draft.consentShareData,
      });
    }
    if (draft.step2Data) {
      this.step2Form.patchValue(draft.step2Data);
      if (draft.step2Data.respondentType) this.respondentType.set(draft.step2Data.respondentType);
      if (draft.step2Data.noIdCard) this.noIdCard.set(draft.step2Data.noIdCard);
      if (draft.step2Data.gender) this.gender.set(draft.step2Data.gender);
      if (draft.step2Data.hasDisability) this.hasDisability.set(draft.step2Data.hasDisability);
      if (draft.step2Data.idFrontFileName) this.idFrontFile.set(draft.step2Data.idFrontFileName);
      if (draft.step2Data.idBackFileName) this.idBackFile.set(draft.step2Data.idBackFileName);
      if (draft.step2Data.passportFileName) this.passportFile.set(draft.step2Data.passportFileName);
      this.step2SavedOnce.set(true);
    }
    if (draft.step3Data) this.step3Form.patchValue(draft.step3Data);
    if (draft.step4Data) {
      if (draft.step4Data.allLiveInLebanon) {
        this.allLiveInLebanon.set(draft.step4Data.allLiveInLebanon);
        this.step4Form.patchValue({ allLiveInLebanon: draft.step4Data.allLiveInLebanon });
      }
      if (draft.step4Data.agreeTerms) {
        this.agreeTerms.set(draft.step4Data.agreeTerms);
        this.step4Form.patchValue({ agreeTerms: draft.step4Data.agreeTerms });
      }
      if (draft.step4Data.members && Array.isArray(draft.step4Data.members)) {
        draft.step4Data.members.forEach((m: any) => {
          const memberGroup = this.createMemberGroup();
          memberGroup.patchValue(m);
          this.membersArray.push(memberGroup);
        });
      }
    }
    if (draft.step5Data) this.step5Form.patchValue(draft.step5Data);
    if (draft.step6Data) this.step6Form.patchValue(draft.step6Data);
    if (draft.currentStep) this.currentStep.set(draft.currentStep);
    if (draft.id) this.formId = draft.id;
  }

  get canStartSurvey(): boolean {
    return this.consentForm.get('consentRespondent')?.value === 'yes';
  }

  startSurvey() {
    if (this.canStartSurvey) {
      this.currentStep.set(2);
      this.saveDraft();
    }
  }

  goToStep(step: number) {
    if (step === 1 || (step > 1 && this.canStartSurvey)) {
      this.currentStep.set(step);
    }
  }

  get expectedMemberCount(): number {
    const size = parseInt(this.step2Form.get('householdSize')?.value, 10);
    return isNaN(size) ? 0 : size - 1;
  }

  get actualMemberCount(): number {
    return this.membersArray.length;
  }

  nextStep() {
    if (this.currentStep() === 2 && (this.headUnder18() || this.headMaritalInvalid())) {
      return;
    }
    if (this.currentStep() === 4) {
      const expected = this.expectedMemberCount;
      const actual = this.actualMemberCount;
      if (expected > 0 && actual !== expected) {
        this.memberCountMismatch.set(true);
        return;
      }
      this.memberCountMismatch.set(false);
    }
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
      step4Data: {
        members: this.membersArray.value,
        allLiveInLebanon: this.step4Form.value.allLiveInLebanon,
        agreeTerms: this.step4Form.value.agreeTerms,
      },
      step5Data: this.step5Form.value,
      step6Data: this.step6Form.value,
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

  saveCurrentSection() {
    this.saving.set(true);
    const data = this.buildFormData();
    this.formService.saveDraftLocally(data);

    if (this.isOnline()) {
      this.formService.saveToServer(data).subscribe({
        next: (saved) => {
          this.formId = saved.id!;
          data.id = saved.id;
          this.formService.saveDraftLocally(data);
          this.saving.set(false);

          if (this.currentStep() === 2 && !this.step2SavedOnce()) {
            this.step2SavedOnce.set(true);
            window.location.reload();
          } else {
            this.savedMessage.set('تم الحفظ بنجاح');
            setTimeout(() => this.savedMessage.set(''), 3000);
          }
        },
        error: () => {
          this.saving.set(false);
          this.savedMessage.set('تم حفظ النموذج محلياً');
          setTimeout(() => this.savedMessage.set(''), 3000);
        }
      });
    } else {
      this.saving.set(false);
      this.savedMessage.set('تم حفظ النموذج محلياً. سيتم إرساله عند استعادة الاتصال.');
      setTimeout(() => this.savedMessage.set(''), 3000);
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

  setGender(g: 'male' | 'female') {
    this.gender.set(g);
    this.step2Form.patchValue({ gender: g });
  }

  setDisability(val: 'yes' | 'no') {
    this.hasDisability.set(val);
    this.step2Form.patchValue({ hasDisability: val });
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
    this.step2SavedOnce.set(false);
    this.expandedMemberIndex.set(null);
    this.allLiveInLebanon.set('yes');
    this.agreeTerms.set(false);
    this.initForms();
  }

  onLogout() {
    this.authService.logout();
  }
}
