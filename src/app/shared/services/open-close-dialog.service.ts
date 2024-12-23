import { EventEmitter, Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})

export class OpenCloseDialogService {

  private dialogs: { [key: string]: BehaviorSubject<boolean> } = {
    userProfile: new BehaviorSubject<boolean>(false),
    channelMember: new BehaviorSubject<boolean>(false),
    workspaceMenu: new BehaviorSubject<boolean>(true),
    addChannelMember: new BehaviorSubject<boolean>(false),
  };

  profileId = new EventEmitter<string>();

  constructor() { }

  // Methode zum Öffnen eines Dialogs
  open(dialogName: string): void {
    const dialog = this.dialogs[dialogName];
    if (dialog) {
      dialog.next(true);
    } else {
      console.warn(`Dialog mit dem Namen "${dialogName}" existiert nicht.`);
    }
  }

  // Methode zum Schließen eines Dialogs
  close(dialogName: string): void {
    const dialog = this.dialogs[dialogName];
    if (dialog) {
      dialog.next(false);
    } else {
      console.warn(`Dialog mit dem Namen "${dialogName}" existiert nicht.`);
    }
  }

  // Observable zum Abonnieren des Dialogstatus
  isDialogOpen(dialogName: string): Observable<boolean> | null {
    const dialog = this.dialogs[dialogName];
    if (dialog) {
      return dialog.asObservable();
    }
    console.warn(`Dialog mit dem Namen "${dialogName}" existiert nicht.`);
    return null;
  }


  /**
   * Emits the new profile ID to the profileId EventEmitter.
   * @param userID The new profile ID to emit.
   */
  changeProfileId(userID: string) {
    this.profileId.emit(userID);
  }
}