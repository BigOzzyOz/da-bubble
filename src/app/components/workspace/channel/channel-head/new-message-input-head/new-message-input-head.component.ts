import { Component, inject } from '@angular/core';
import { FirebaseStorageService } from '../../../../../shared/services/firebase-storage.service';
import { FormsModule } from '@angular/forms';
import { ChannelInterface } from '../../../../../shared/interfaces/channel.interface';
import { UserInterface } from '../../../../../shared/interfaces/user.interface';
import { NavigationService } from '../../../../../shared/services/navigation.service';

@Component({
  selector: 'app-new-message-input-head',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './new-message-input-head.component.html',
  styleUrls: ['./new-message-input-head.component.scss']

})
export class NewMessageInputHeadComponent {

  protected storage = inject(FirebaseStorageService);
  navigationService: NavigationService = inject(NavigationService);
  userInput: string = ''; // Binding to input value
  suggestion: string = ''; // saves the current autocomplete

  /**
   * During input in the input field, the function “updateSuggestion” is called, which updates the suggested text in the background of input field.
   */
  onInput(): void {
    this.updateSuggestion();
  }

  /**
   * Finds a conditional match with usern, channel or e-mail and sets the default text for autocomplete.
   */
  updateSuggestion(): void {
    if (this.userInput) {
      let match = this.findMatch(this.userInput);
      this.suggestion = match || '';
    } else {
      this.suggestion = '';
    }
  }

  /**
   * Depending on the initial prefix, a function is called that returns a match with the entered term from the respective property array.
   * 
   * @param userInput - Input String of User
   * @returns 
   */
  findMatch(userInput: string): string | undefined {
    let prefix = userInput.slice(0, 1);
    if (prefix === '#') {
      return this.handleChannelSearch(userInput);
    }
    if (prefix === '@') {
      return this.handleUserSearch(userInput)
    }
    if (!(prefix === '@') && !(prefix === '#')) {
      return this.handleEmailSearch(userInput)
    }
    return undefined;
  }

  /**
   * If userInput starts with a #, the first channel name of the current user's channel is returned. 
   * If further inputs follow #, matching channel names of the current user are returned.  
   * 
   * @param userInput - Input String of User
   * @returns 
   */
  handleChannelSearch(userInput: string): string | undefined {
    let inputHasOnlyPrefix = userInput.length === 1;
    let channelsAssignedToCurrentUser = this.storage.CurrentUserChannel.length > 0;
    let firstChannelOfCurrentUser = this.storage.CurrentUserChannel[0].name;
    let userInputWithoutPrefix = userInput.slice(1);

    if (inputHasOnlyPrefix) {
      return channelsAssignedToCurrentUser ? firstChannelOfCurrentUser : undefined;
    } else {
      let searchTerm = userInputWithoutPrefix;
      return this.matchChannel(searchTerm);
    }
  }

  /**
   * If userInput starts with a @, the first User name is returned. 
   * If further inputs follow @, matching User names returned.  
   * 
   * @param userInput - Input String of User
   * @returns 
   */
  handleUserSearch(userInput: string): string | undefined {
    if (userInput.length === 1) {
      return this.storage.user.length > 0 ? this.storage.user[0].name : undefined;
    } else {
      let searchTerm = userInput.slice(1);
      return this.matchUser(searchTerm);
    }
  }

  handleEmailSearch(userInput: string): string | undefined {
    return this.matchEmail(userInput);
  }

  /**
   * Finds the first match between the input content and the CurrentUserChannel array and return an object of matched channel.
   * 
   * @param searchTerm - Input String of User
   * @returns - object of channel is matched
   */
  matchChannel(searchTerm: string): string | undefined {
    let channels: ChannelInterface[] = this.storage.CurrentUserChannel;
    let match = channels.find(channel =>
      channel.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    return match?.name;
  }

  /**
   * Finds the first match between the input content and the User array and returns an object of matched channel.
   * 
   * @param searchTerm 
   * @returns 
   */
  matchUser(searchTerm: string): string | undefined {
    let users: UserInterface[] = this.storage.user;
    let match = users.find(user =>
      user.name.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    return match?.name;
  }

  matchEmail(searchTerm: string): string | undefined {
    let users: UserInterface[] = this.storage.user;
    let match = users.find(user =>
      user.email.toLowerCase().startsWith(searchTerm.toLowerCase())
    );
    return match?.email;
  }

  /**
   * A getter that assembles the displayed text in the suggestion div. 
   * It combines the userInput with the rest of the suggestion to display the suggestion.
   */
  get displayText(): string {
    if (!this.suggestion) {
      return this.userInput;
    }
    return this.handleUserInputForSuggestionText();
  }

  handleUserInputForSuggestionText() {
    const prefix = this.userInput.charAt(0);
    const inputHasOnlyPrefix = this.userInput.length === 1;
    const hasPrefix = prefix === '#' || prefix === '@';
    if (hasPrefix) {
      if (inputHasOnlyPrefix) {
        return `${prefix}${this.suggestion}`;
      } else {
        return this.returnUserInputWithRemainingTerm();
      }
    } else {
      return this.suggestion;
    }
  }

  returnUserInputWithRemainingTerm() {
    const searchTerm = this.userInput.slice(1);
    const remainingTerm = this.suggestion.slice(searchTerm.length);
    return `${this.userInput}${remainingTerm}`;
  }


  // FUNCTIONS FOR TRANSFERRING THE SUGGESTION TO THE CHANNEL DISPLAY

  /**
     * Renders the userInput such as channel or user by pressing Enter or Tab key.
     * 
     * @param event 
     */
  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Tab' && this.suggestion ||
      event.key === 'Enter' && this.suggestion) {
      this.handleSubmitSuggestion(event)
    }
  }

  /**
   * Accepts the submitted autocomplete by transferring it to the input field. 
   * Calls the showSuggestion() function, which renders the channel or direct messages.
   * 
   * @param event 
   */
  handleSubmitSuggestion(event: KeyboardEvent) {
    event.preventDefault();
    this.acceptSuggestion();
    this.showSuggestion();
  }

  /**
   * Depending on which prefix is placed in front, 
   * the submitted autocomplete with the corresponding prefix is placed as content in the input field.
   */
  acceptSuggestion(): void {
    if (this.userInput.startsWith('#')) {
      this.userInput = `#${this.suggestion}`;
    } else if (this.userInput.startsWith('@')) {
      this.userInput = `@${this.suggestion}`;
    } else {
      this.userInput = this.suggestion;
    }
    this.suggestion = '';
    console.log('acceptSuggestion(), userInput: ', this.userInput);
    console.log('acceptSuggestion(), suggestion: ', this.suggestion);
  }

  /**
   * Depending on whether # or @ is at the beginning of the input field, 
   * the channel of the currentUser is set to the entered channel or direct message 
   * so that it is displayed.
   */
  showSuggestion() {
    let prefix = this.userInput.charAt(0);
    let searchTerm = this.userInput.slice(1);
    if (prefix === '#') {
      this.showSubmittedChannel(searchTerm);
    } else if (prefix === '@') {
      this.showSubmittedDirectMessage(searchTerm);
    } else if (prefix) {
      this.showSubmittedEmail()
      console.log('showSuggestion(), userInput: ', this.userInput);
      console.log('showSuggestion(), suggestion', this.suggestion);
    }
  }

  /**
   * Sets the current Channel of current User to the submitted channel
   * 
   * @param {string} searchTerm  - channel name as submitted
   */
  showSubmittedChannel(searchTerm: string) {
    let foundChannelId = this.findChannelId(searchTerm);
    this.navigationService.setChannel(foundChannelId);
  }

  /**
   * Sets the current Channel of current User to the submitted direct message user. 
   * If a dm already exists, it will be shown, 
   * otherwise a new dm will be created for the affected users (current user and submitted user) and shown.
   * 
   * @param {string} searchTerm - user name as submitted
   */
  showSubmittedDirectMessage(searchTerm: string) {
    const userOfSuggestion = this.storage.user.find(user => user.name.toLowerCase().startsWith(searchTerm.toLowerCase()));

    if (userOfSuggestion && this.findUserInDms(userOfSuggestion)) {
      this.showExistingDm(userOfSuggestion)
    } else if (userOfSuggestion && !this.findUserInDms(userOfSuggestion)) {
      this.showNewDm(userOfSuggestion)
    }
  }

  showExistingDm(userOfSuggestion: UserInterface) {
    let dmsOfCurrentUser = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm;
    let dmWithUserOfSuggestion = dmsOfCurrentUser?.find(dm => dm.contact === userOfSuggestion.id);
    this.navigationService.setChannel(dmWithUserOfSuggestion!.id);
  }

  async showNewDm(userOfSuggestion: UserInterface) {
    await this.createEmptyDms(userOfSuggestion);
    let dmWithUserOfSuggestion = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm.find(dm => dm.contact === userOfSuggestion.id);
    if (dmWithUserOfSuggestion) this.navigationService.setChannel(dmWithUserOfSuggestion!.id);
  }

  showSubmittedEmail() {
    const userOfSuggestion = this.storage.user.find(user => user.email.startsWith(this.userInput.toLowerCase()));

    if (userOfSuggestion && this.findUserInDms(userOfSuggestion)) {
      this.showExistingDmEmail(userOfSuggestion)
    } else if (userOfSuggestion && !this.findUserInDms(userOfSuggestion)) {
      this.showNewDmEmail(userOfSuggestion)
    }
  }

  showExistingDmEmail(userOfSuggestion: UserInterface) {
    let dmsOfCurrentUser = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm;
    let dmWithUserOfSuggestion = dmsOfCurrentUser?.find(dm => dm.contact === userOfSuggestion.id);
    this.navigationService.setChannel(dmWithUserOfSuggestion!.id);
  }

  async showNewDmEmail(userOfSuggestion: UserInterface) {
    console.log('showNewDmEmail(userOfSuggestion: UserInterface): ', userOfSuggestion)
    await this.createEmptyDms(userOfSuggestion);
    let dmWithUserOfSuggestion = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm.find(dm => dm.contact === userOfSuggestion.id);
    if (dmWithUserOfSuggestion) this.navigationService.setChannel(dmWithUserOfSuggestion!.id);
  }

  async createEmptyDms(userOfSuggestion: UserInterface) {
    let currentUserId = this.storage.currentUser.id;
    let suggestedUserId = userOfSuggestion.id;
    if (currentUserId && suggestedUserId) {
      await this.storage.createNewEmptyDm(currentUserId, suggestedUserId);
      await this.storage.createNewEmptyDm(suggestedUserId, currentUserId);
    }
  }

  findUserInDms(userOfSuggestion: UserInterface): boolean {
    let match = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm.some(dm => dm.contact === userOfSuggestion.id);
    if (match) return true;
    else return false;
  }

  findUserInCurrentUserDms(foundUser: UserInterface) {
    let match = this.storage.user.find(user => user.id === this.storage.currentUser.id)?.dm.find(user => user.id === foundUser.id);
    return match
  }

  /**
   * Matches the input with the names of the channels of the current user and returns the id of the matching channel.
   * 
   * @param searchTerm - string of input content
   * @returns - id of channel is matched with input
   */
  findChannelId(searchTerm: string): string {
    let channels: ChannelInterface[] = this.storage.CurrentUserChannel;
    let match = channels.find(channel =>
      channel.name.toLowerCase().startsWith(searchTerm.toLowerCase()));
    return match?.id!;
  }

  channelName() {
    return this.storage.channel.find(channel => channel.id === this.storage.currentUser.currentChannel)?.name;
  }

  channelUser() {
    let users = this.storage.channel.find(channel => channel.id === this.storage.currentUser.currentChannel)?.user;
    if (users) return users;
    else return [];
  }


}