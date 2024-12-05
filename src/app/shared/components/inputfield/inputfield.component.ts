import { AfterViewInit, Component, ElementRef, HostListener, inject, Input, OnChanges, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../services/firebase-storage.service';
import { PostInterface } from '../../interfaces/post.interface';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { EmojiSelectorComponent } from "../emoji-selector/emoji-selector.component";
import { TextFormatterDirective } from '../../directive/text-formatter.directive';
import { UserInterface } from '../../interfaces/user.interface';
import { NavigationService } from '../../services/navigation.service';
import { Subscription } from 'rxjs';
import { CloudStorageService } from '../../services/cloud-storage.service';
import { SendMessageService } from './services/send-message.service';
import { InputEventsService } from './services/input-events.service';
import { UidService } from '../../services/uid.service';


@Component({
  selector: 'app-inputfield',
  standalone: true,
  imports: [FormsModule, PickerModule, EmojiSelectorComponent, TextFormatterDirective],
  templateUrl: './inputfield.component.html',
  styleUrl: './inputfield.component.scss'
})
export class InputfieldComponent implements OnInit, OnChanges, AfterViewInit, OnDestroy {
  elementRef: ElementRef = inject(ElementRef);
  storage = inject(FirebaseStorageService);
  uid = inject(UidService);
  navigationService = inject(NavigationService);
  cloud = inject(CloudStorageService);
  sendMessageService = inject(SendMessageService);
  inputEvent = inject(InputEventsService)

  @ViewChild(TextFormatterDirective) formatter!: TextFormatterDirective

  @Input() thread: boolean = false;

  public message: string = '';
  startInput: boolean = false;
  showEmojiSelector: boolean = false;
  showTagSearch: boolean = false;
  showUpload: boolean = false;
  tagSearch: string = '';
  suggestion: UserInterface | undefined = undefined;
  matchingUsers: UserInterface[] = [];
  private subscription!: Subscription;


  constructor() { }

  @HostListener('document:keydown', ['$event'])
  @HostListener('document:click', ['$event'])
  @HostListener('document:keyup', ['$event'])

  ngOnInit() {
    this.subscription = this.navigationService.channelChanged.subscribe((channelId) => {
      console.log('Kanal geändert:', channelId);
      this.reset();
    });
  }


  /**
   * Sets the focus on the input field after the component has finished rendering.
   * This is needed because the input field is not yet rendered when the component
   * is initialized, so setting the focus immediately does not work.
   */
  ngAfterViewInit() {
    setTimeout(() => this.setFocus(), 250);
  }


  /**
   * Lifecycle hook that is called when any data-bound property of the component changes.
   * Sets the focus on the input field after the component has finished rendering.
   * This is needed because the input field is not yet rendered when the component
   * is initialized, so setting the focus immediately does not work.
   */
  ngOnChanges(): void {
    setTimeout(() => this.setFocus(), 250);
  }


  /**
   * Cleans up the subscription to the channel changes event when the component is destroyed.
   * This is necessary to prevent memory leaks.
   */
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }


  /**
   * Sets the focus on the input field if it exists.
   * This method is called in lifecycle hooks to ensure that the focus is set
   * after the component has finished rendering.
   */
  setFocus() {
    const focusElement = this.getFocusElement();
    if (!focusElement) return;

    focusElement.focus();

    // Prüfen, ob das Element contentEditable ist
    if (focusElement.isContentEditable) {
      const range = document.createRange();
      const selection = window.getSelection();

      // Cursor ans Ende setzen
      range.selectNodeContents(focusElement);
      range.collapse(false);

      selection?.removeAllRanges();
      selection?.addRange(range);
    } else if ('selectionStart' in focusElement) {
      // Für Input- und Textarea-Felder
      (focusElement as HTMLInputElement).selectionStart = (focusElement as HTMLInputElement).value.length;
      (focusElement as HTMLInputElement).selectionEnd = (focusElement as HTMLInputElement).value.length;
    }
  }


  /**
   * Retrieves the HTML element that should receive focus based on the current state.
   * If the tag search is active, it returns the input element for tag search, 
   * otherwise returns the message content element. The specific element is chosen 
   * based on whether the thread is open or not.
   * 
   * @returns {HTMLElement | null} The HTML element to be focused, or null if not found.
   */
  getFocusElement(): HTMLElement | null {
    const isThreadOpen = this.storage.currentUser.threadOpen;
    if (this.showTagSearch) return this.elementRef.nativeElement.querySelector(
      isThreadOpen ? '#tag-search-input-thread' : '#tag-search-input'
    );
    return this.elementRef.nativeElement.querySelector(
      isThreadOpen ? '#messageContentThread' : '#messageContent'
    );
  }


  /**
     * Handles outside clicks on the emoji selector.
     * If the target element is not the emoji selector or one of its children, hide the emoji selector.
     * @param {MouseEvent} event The event object.
     * @returns {void}
     */
  outsideClick(event: MouseEvent): void {
    console.log(event);
    event.stopPropagation();
    const path = (event.composedPath && event.composedPath());
    console.log(path);
    if (!path.includes(this.elementRef.nativeElement.querySelector('.smileys, .smileys-container'))) {
      this.showEmojiSelector = false;
    }
  }


  /**
 * Handles keydown events for the input field.
 * Determines the context of the key press by checking whether the event target
 * is within the tag search input or the message content area, and delegates
 * handling to respective functions.
 * 
 * @param {KeyboardEvent} event - The keyboard event triggered by user input.
 */
  checkKey(event: KeyboardEvent) {
    const targetElement = event.target as HTMLElement;
    if (this.inputEvent.isInsideTagSearch(targetElement)) this.handleTagSearch(event);
    if (this.inputEvent.isInsideMessageContent(targetElement)) this.handleMessage(event);
  }


  /**
   * Handles tag search key events.
   * If a send button-related key event occurs and there is a suggestion, 
   * it adds the formatted tag to the input field. 
   * If the 'Escape' key is pressed, it toggles the tag search off.
   * 
   * @param {KeyboardEvent} event - The keyboard event to handle.
   */
  handleTagSearch(event: KeyboardEvent) {
    if (this.inputEvent.isSendButtonAndTagSearch(event) && this.suggestion) this.formatter.addTag(this.suggestion);
    if (event.key === 'Escape') this.toggleTagSearch();
  }


  /**
   * Handles key presses in the message content element.
   * If the 'Enter' key is pressed and there is a message in the input field, it sends the message.
   * If the 'Backspace' key is pressed and the caret is at the beginning of the message content, it removes the last tag.
   * @param {KeyboardEvent} event The event object.
   * @returns {void}
   */
  handleMessage(event: KeyboardEvent): void {
    let message = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    if (this.inputEvent.isSendButtonAndMessage(event) && message !== '') this.sendMessage();
    if (event.key === 'Backspace') this.inputEvent.isBackspaceAndMessage(event);
  }


  /**
 * Generates a new post from the current message content.
 * 
 * @returns {PostInterface} A new post object with the current message content.
 */
  generateNewPost(): PostInterface {
    let newMessage = this.elementRef.nativeElement.querySelector('.message-content');
    return {
      text: newMessage.innerHTML,
      timestamp: new Date().getTime(),
      author: this.storage.currentUser.id || '',
      id: this.uid.generateUid(),
      thread: false,
      emoticons: [],
      threadMsg: [],
    }
  }


  /**
   * Checks the input field's content and updates the startInput state.
   * Determines if the input field is empty or contains only a line break,
   * and sets startInput to true if there is content, otherwise false.
   * 
   * @param {KeyboardEvent} event - The keyboard event triggered by user input.
   */
  checkInput(event: KeyboardEvent) {
    let message = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    this.startInput = (message.innerHTML === '' || message.innerHTML === '<br>') ? false : true;
  }


  /**
   * Handles sending a message.
   * If the message is empty or the user is not logged in or no channel is selected, do nothing.
   * Otherwise, generate a new post and handle it differently depending on whether it's a thread or not.
   * @returns {void}
   */
  sendMessage(): void {
    let message = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    if (!message.innerHTML || !this.storage.currentUser.id || !this.storage.currentUser.currentChannel) return;
    let newPost: PostInterface = this.generateNewPost();
    if (this.thread) this.sendMessageService.handleThreadPost(newPost);
    else this.sendMessageService.handleNormalPost(newPost);
    message.innerHTML = '';
    this.startInput = false;
  }


  /**
   * Appends the given emoji to the current message.
   * 
   * @param emoji - The emoji string to add to the message.
   */
  addEmoji(emoji: string) {
    let newMessage = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    newMessage.innerHTML += emoji;
    let messageContent = newMessage.innerHTML;
    let lastIndex = messageContent.lastIndexOf('<br>');
    if (lastIndex !== -1) messageContent = messageContent.slice(0, lastIndex);
    newMessage.innerHTML = messageContent;
    this.startInput = true;
    this.showEmojiSelector = false;
    this.setFocus();
  }


  /**
   * Toggles the visibility of the tag search input.
   * Resets the tag search, matching users, and suggestion when toggled.
   * Disables the emoji selector and file upload options.
   * Sets focus to the appropriate element based on the new state.
   */
  toggleTagSearch() {
    this.tagSearch = '';
    this.matchingUsers = [];
    this.suggestion = undefined;
    this.showTagSearch = !this.showTagSearch;
    this.showEmojiSelector = false;
    this.showUpload = false;
    this.setFocus();
  }


  /**
   * Toggles the visibility of the emoji selector.
   * Resets the tag search, matching users, and suggestion when toggled.
   * Disables the tag search input and file upload options.
   * Sets focus to the appropriate element based on the new state.
   */
  toggleEmojiSelector() {
    this.showEmojiSelector = !this.showEmojiSelector;
    this.showTagSearch = false;
    this.showUpload = false;
    this.setFocus();
  }


  /**
   * Toggles the visibility of the file upload section.
   * Resets the emoji selector when toggled.
   * Sets focus to the appropriate element based on the new state.
   */
  toggleAppendix() {
    this.showUpload = !this.showUpload;
    this.showEmojiSelector = false;
    this.setFocus();
  }


  /**
   * Handles user input in the tag search input field.
   * If the input field contains text, it initiates a tag search.
   * If the input field is empty, it resets the suggestion to a channel tag.
   */
  tagSearchInput() {
    this.matchingUsers = [];
    if (this.tagSearch && this.tagSearch.length > 0) this.initiateTagSearch();
    else this.suggestion = this.generateChannelTag();
  }


  /**
   * Initiates the tag search by filtering users within the current channel
   * whose names include the provided tag search string. Updates the
   * matchingUsers array with the filtered users. If there is a match,
   * sets the suggestion to the first matching user; otherwise, generates
   * a channel tag as the suggestion.
   */
  initiateTagSearch() {
    let match: UserInterface | undefined;
    let channelUsers: string[] = this.storage.channel.find(channel => channel.id === this.storage.currentUser.currentChannel)?.user || [];
    let users: UserInterface[] = channelUsers.length > 0 ? this.storage.user.filter(user => channelUsers.includes(user.id!)) : [];
    this.matchingUsers = users.filter(user => user.name.toLowerCase().includes(this.tagSearch.toLowerCase()));
    match = this.matchingUsers.length > 0 ? this.matchingUsers[0] : undefined;
    if (match) this.suggestion = match;
    else this.suggestion = this.generateChannelTag();
  }

  /**
   * Generates a default channel tag object.
   * 
   * @returns {Object} An object representing a channel tag with default properties:
   * - name: 'Channel'
   * - id: 'channel'
   * - email: ''
   * - online: false
   * - avatar: ''
   * - dm: []
   */
  generateChannelTag(): UserInterface {
    return { name: 'Channel', id: 'channel', email: '', online: false, avatar: '', dm: [] };
  }


  /**
   * Resets the input field and its properties to their initial states.
   * Called when a message is sent or the user navigates away from the channel.
   */
  reset() {
    let message = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    message.innerHTML = '';
    this.tagSearch = '';
    this.matchingUsers = [];
    this.suggestion = undefined;
    this.showTagSearch = false;
    this.showEmojiSelector = false;
    this.showUpload = false;
  }


  getUploadedFiles(input: HTMLInputElement) {
    if (!input.files || !input.files.length || !input) return
    const files: FileList = input.files;
    console.log(files);
    return Array.from(files);
  }


}



