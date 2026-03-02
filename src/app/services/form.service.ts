import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FormSubmission {
  id?: number;
  userId?: string;
  swName: string;
  supervisorName: string;
  interviewDate: string;
  consentRespondent: boolean;
  consentShareData: boolean;
  currentStep: number;
  step2Data?: any;
  step3Data?: any;
  step4Data?: any;
  step5Data?: any;
  status: string;
}

@Injectable({ providedIn: 'root' })
export class FormService {
  private readonly STORAGE_KEY = 'mosa_form_draft';

  constructor(private http: HttpClient) {}

  saveToServer(form: FormSubmission): Observable<FormSubmission> {
    if (form.id) {
      return this.http.put<FormSubmission>(`/api/forms/${form.id}`, form);
    }
    return this.http.post<FormSubmission>('/api/forms', form);
  }

  getFromServer(id: number): Observable<FormSubmission> {
    return this.http.get<FormSubmission>(`/api/forms/${id}`);
  }

  getUserForms(): Observable<FormSubmission[]> {
    return this.http.get<FormSubmission[]>('/api/forms');
  }

  saveDraftLocally(form: FormSubmission): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(form));
    } catch (e) {
      console.warn('Failed to save draft locally:', e);
    }
  }

  loadLocalDraft(): FormSubmission | null {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  clearLocalDraft(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  isOnline(): boolean {
    return navigator.onLine;
  }
}
