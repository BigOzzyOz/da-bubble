import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import { sendPasswordResetEmail, signInWithEmailAndPassword } from '@firebase/auth';
import { CardComponent } from '../../../../shared/components/log-in/card/card.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc } from '@angular/fire/firestore';
import { FirebaseStorageService } from '../../../../shared/services/firebase-storage.service';
import { PostInterface } from '../../../../shared/interfaces/post.interface';
import { FirebaseAuthService } from '../../../../shared/services/firebase-auth.service';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { ResetPasswordCardComponent } from '../../reset-password/reset-password-card/reset-password-card.component';

@Component({
  selector: 'app-log-in-card',
  standalone: true,
  imports: [FormsModule, CardComponent, CommonModule],
  templateUrl: './log-in-card.component.html',
  styleUrls: ['./log-in-card.component.scss']
})
export class LogInCardComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  protected storage = inject(FirebaseStorageService);
  navigationService: NavigationService = inject(NavigationService);
  authService = inject(FirebaseAuthService);
  @Input() post: PostInterface = { text: '', author: '', timestamp: 0, thread: false, id: '' };
  loginData = {
    email: '',
    password: '',
  };

  passwordVisible: boolean = false;
  errorMessage: string = '';
  isLoading: boolean = false;

  @Output() login = new EventEmitter<boolean>();
  @Output() newAccount = new EventEmitter<boolean>();

  goToSendMail() {
    this.login.emit(false);
    this.newAccount.emit(false);
  }

  togglePasswordVisibility(): void {
    this.passwordVisible = !this.passwordVisible;
  }

  checkLogin(ngForm: NgForm) {
    if (ngForm.invalid) {
      this.errorMessage = "Bitte füllen Sie alle Felder korrekt aus.";
      return;
    }
    this.errorMessage = ''; // Fehlermeldung zurücksetzen

    console.log("Login gestartet...");
    signInWithEmailAndPassword(this.auth, this.loginData.email, this.loginData.password)
      .then(async (userCredential) => {
        const user = userCredential.user;

        // Überprüfen, ob die E-Mail-Adresse verifiziert ist
        if (!user.emailVerified) {
          this.errorMessage = "Ihre E-Mail-Adresse ist noch nicht verifiziert. Bitte überprüfen Sie Ihren Posteingang.";
          return; // Stoppt die weitere Verarbeitung
        }

        console.log("Benutzer eingeloggt:", user);

        // Speichern der Auth-UID
        sessionStorage.setItem("authUid", user.uid);
        this.storage.authUid = user.uid;

        // Benutzerinformationen laden
        this.authService.getCurrentUser();
        this.storage.getCurrentUserChannelCollection();

        console.log("Benutzerkanäle geladen:", this.storage.CurrentUserChannel);

        // Benutzerstatus auf "online" setzen
        await this.authService.setCurrentUserOnline(user.uid);

        this.router.navigate(['/workspace']);
      })
      
      .catch((error) => {
        switch (error.code) {
          case 'auth/user-not-found':
            this.errorMessage = "Anmeldung fehlgeschlagen! Überprüfen Sie Ihre Anmeldedaten.";
            break;
          case 'auth/wrong-password':
            this.errorMessage = "Das eingegebene Passwort ist falsch. Bitte versuchen Sie es erneut.";
            break;
          case 'auth/too-many-requests':
            this.errorMessage = "Zu viele Anmeldeversuche. Bitte versuchen Sie es später erneut.";
            break;
          default:
            this.errorMessage = "Es gibt kein Konto mit dieser E-Mail-Adresse. Bitte registrieren Sie sich zuerst.";
        }
      });
      
  }

  getGoogleLoginErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/popup-closed-by-user':
        return 'Das Anmelde-Popup wurde geschlossen, bevor die Anmeldung abgeschlossen werden konnte.';
      case 'auth/network-request-failed':
        return 'Netzwerkproblem! Bitte überprüfe deine Internetverbindung.';
      default:
        return 'Fehler bei der Anmeldung mit Google. Bitte versuche es später erneut.';
    }
  }

  resetPassword() {
    if (!this.loginData.email) {
      alert('Bitte geben Sie Ihre E-Mail-Adresse ein, um das Passwort zurückzusetzen.');
      return;
    }
    sendPasswordResetEmail(this.auth, this.loginData.email)
      .then(() => {
        alert('Passwort-Reset-Link wurde an Ihre E-Mail-Adresse gesendet.');
        this.router.navigate(['/resetpassword']); // Navigiert zur Reset-Password-Komponente
      })
      .catch((error) => {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        alert('Es gab ein Problem beim Zurücksetzen des Passworts. Bitte überprüfe deine Eingaben.');
      });
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

}
