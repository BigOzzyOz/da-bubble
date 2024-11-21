import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { NgForm, FormsModule } from '@angular/forms';
import {  sendPasswordResetEmail, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from '@firebase/auth';
import { CardComponent } from '../../../../shared/components/log-in/card/card.component';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, updateDoc } from '@angular/fire/firestore';
import { FirebaseStorageService } from '../../../../shared/services/firebase-storage.service';
import { PostInterface } from '../../../../shared/interfaces/post.interface';

@Component({
  selector: 'app-log-in-card',
  standalone: true,
  imports: [FormsModule, CardComponent, CommonModule ],
  templateUrl: './log-in-card.component.html',
  styleUrls: ['./log-in-card.component.scss']
})
export class LogInCardComponent {
  private auth = inject(Auth);
  private router = inject(Router);
  private firestore = inject(Firestore);
  protected storage = inject(FirebaseStorageService);
  @Input() post: PostInterface = { text: '', author: '', timestamp: 0, thread: false, id: '' };

  loginData = {
    email: '',
    password: ''
  };

  @Output() login = new EventEmitter<boolean>();

  goToResetPassword() {
    this.router.navigate(['/reset-password']);
  }

  checkLogin(ngForm: NgForm) {
    if (ngForm.invalid) {
      alert('Bitte füllen Sie alle erforderlichen Felder aus.');
      return;
    }

    signInWithEmailAndPassword(this.auth, this.loginData.email, this.loginData.password)
    .then(async (userCredential) => {
      const user = userCredential.user;
      console.log('Eingeloggt', user);

      const userDocRef = doc(this.firestore, 'user', user.uid);

      // Online-Status aktualisieren
      await updateDoc(userDocRef, { online: true });

      this.router.navigate(['/workspace']);
    })
    .catch((error) => {
      console.error('Fehler beim Einloggen: ', error.message);
      alert('Anmeldung fehlgeschlagen! Überprüfe die Anmeldedaten.');
    });
}

guestLogin() {
  // Lokale Daten löschen
  console.log('Gast-Login aktiviert.');
  this.router.navigate(['/workspace']);
}

  googleLogin() {
    const provider = new GoogleAuthProvider();
    signInWithPopup(this.auth, provider)
      .then(async (result) => {
        const user = result.user;
        console.log('Google-Benutzer:', user);
  
        const userDocRef = doc(this.firestore, 'user', user.uid);
        const docSnapshot = await getDoc(userDocRef);
  
        if (!docSnapshot.exists()) {
          await setDoc(userDocRef, {
            name: user.displayName || 'Unbekannter Benutzer',
            email: user.email || '',
            avatar: user.photoURL || '',
            online: true,
          });
        } else {
          await updateDoc(userDocRef, { online: true });
        }
  
        this.router.navigate(['/workspace']);
      })
      .catch((error) => {
        console.error('Fehler beim Google-Login: ', error.message);
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
        this.router.navigate(['/login']);
      })
      .catch((error) => {
        console.error('Fehler beim Zurücksetzen des Passworts:', error);
        alert('Es gab ein Problem beim Zurücksetzen des Passworts. Bitte überprüfe deine Eingaben.');
      });
  }

  logout() {
    const user = this.storage.auth.currentUser; // Authentifizierter Benutzer aus dem Service abrufen
  
    if (user) {
      const userDocRef = doc(this.storage.firestore, 'user', user.uid);
      this.guestLogin();
      // Online-Status in Firestore zurücksetzen
      updateDoc(userDocRef, { online: false })
        .then(() => {
          console.log(`Benutzer ${user.uid} wurde als offline markiert.`);
        })
        .catch((error) => {
          console.error(`Fehler beim Zurücksetzen des Online-Status für ${user.uid}:`, error);
        });
    }
  
    // Firebase-Session beenden
    signOut(this.storage.auth)
      .then(() => {
        console.log('Benutzer erfolgreich abgemeldet.');
        this.storage.clearCurrentUser(); // Lokale Daten über den Service löschen
      })
      .catch((error) => {
        console.error('Fehler beim Abmelden:', error);
      });
  }
  
}
