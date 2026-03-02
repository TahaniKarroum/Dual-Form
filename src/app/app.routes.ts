import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { SurveyComponent } from './components/survey/survey.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', component: LoginComponent },
  { path: 'survey', component: SurveyComponent, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
