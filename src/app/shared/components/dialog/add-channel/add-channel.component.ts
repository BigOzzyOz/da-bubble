import { Component, inject, HostListener, OnDestroy, OnInit } from '@angular/core';
import { NgIf } from '@angular/common';
import { NgForm, FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../../services/firebase-storage.service';
import { Subscription } from 'rxjs';
import { OpenCloseDialogService } from '../../../services/open-close-dialog.service';
import { NavigationService } from '../../../services/navigation.service';
import { ChannelInterface } from '../../../interfaces/channel.interface';

@Component({
  selector: 'app-add-channel',
  standalone: true,
  imports: [NgIf, FormsModule],
  templateUrl: './add-channel.component.html',
  styleUrl: './add-channel.component.scss'
})
export class AddChannelComponent implements OnInit, OnDestroy {
  protected storage = inject(FirebaseStorageService);
  isDialogVisible: boolean = false;
  channelData = this.setChannelData();
  navigation = inject(NavigationService);
  isChannelNameExists: boolean = false;
  errorMessage: string = '';

  private subscriptions: Subscription = new Subscription();


  constructor(
    public openCloseDialogService: OpenCloseDialogService,
  ) { }


  /**
   * Closes the dialog by click on esc key.
   * 
   * @param event - click escape Key
   */
  @HostListener('document:keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    if (this.isDialogVisible) {
      this.closeDialog();
    }
  }


  /**
   * Subscribes to the open/close status of the dialog, setting visibility based on the status.
   */
  ngOnInit(): void {
    const sub = this.openCloseDialogService
      .isDialogOpen('addChannel')
      ?.subscribe((status) => {
        this.isDialogVisible = status;
      });

    if (sub) this.subscriptions.add(sub);
  }


  /**
   * Unsubscribes from all active subscriptions when the component is destroyed to prevent memory leaks.
   */
  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }


  /**
   * Opens the dialog for adding a new channel.
   */
  public openDialog() {
    this.isDialogVisible = true;
  }


  /**
   * Closes the dialog for adding a new channel.
   */
  public closeDialog() {
    this.openCloseDialogService.close('addChannel');
  }


  /**
   * Handles the submission of the channel creation form.
   * Checks if the channel name exists and, if not, proceeds to create the channel and navigate to it.
   */
  async openAddChannelMemberChoiceDialog() {
    if (this.isChannelNameTaken()) {
      this.isChannelNameExists = true;
      this.errorMessage = 'Der Channel-Name existiert bereits. Bitte wählen Sie einen anderen Namen.';
      return;
    } else {
      this.isChannelNameExists = false;
    }
    if (this.isChannelNameExists === false) {
      await this.createNewDMChannelAndOpen();
    }
  }

  /**
   * Creates a new dm Channel and navigate to it.
   */
  async createNewDMChannelAndOpen() {
    await this.takeChannelInfo();
    this.navigation.setChannel(this.storage.lastCreatedChannel);
    this.openCloseDialogService.open('SelectionOfAddingChannelMembers');
    this.closeDialog();
  }


  /**
   * Validates the channel name against existing channels to prevent duplicates.
   * @returns {boolean} True if the channel name already exists, false otherwise.
   */
  isChannelNameTaken(): boolean {
    return !!this.findChannelName(this.channelData.name);
  }


  /**
   * Takes the channel information from the form and adds the channel to the storage.
   */
  async takeChannelInfo(): Promise<void> {
    try {
      await this.storage.addChannel({
        name: this.channelData.name,
        description: this.channelData.description,
        owner: this.storage.currentUser.id || ""
      });
      this.closeDialog();
      this.channelData = this.setChannelData();
    } catch (error) {
      console.error("Fehler beim Hinzufügen des Channels:", error);
    }
  }

  /**
   * 
   * @returns channel-information of new dm
   */
  setChannelData() {
    return {
      name: "",
      description: "",
      user: [this.storage.currentUser.id],
      owner: this.storage.currentUser.id,
      posts: [],
      id: ""
    };
  }


  /**
   * Searches for an existing channel by name.
   * @param {string} inputChannel - The name of the channel to search for.
   * @returns {string | undefined} The name of the found channel or undefined if no match is found.
   */
  findChannelName(inputChannel: string): string | undefined {
    let channels: ChannelInterface[] = this.storage.channel;
    let match = channels.find(channel =>
      channel.name.toLowerCase() === inputChannel.toLowerCase());
    return match?.name!;
  }

}
