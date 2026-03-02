import { Component, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(
    public authService: AuthService,
    private router: Router
  ) {
    effect(() => {
      const loading = this.authService.loading();
      const user = this.authService.user();
      if (!loading && user) {
        this.router.navigate(['/survey']);
      }
    });
  }

  onLogin() {
    this.authService.login();
  }
}
