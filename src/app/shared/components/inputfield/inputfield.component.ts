import { AfterViewInit, Component, ElementRef, HostListener, inject, Input, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FirebaseStorageService } from '../../services/firebase-storage.service';
import { PostInterface } from '../../interfaces/post.interface';
import { UidService } from '../../services/uid.service';
import { PickerModule } from '@ctrl/ngx-emoji-mart';
import { EmojiSelectorComponent } from "../emoji-selector/emoji-selector.component";
import { TextFormatterDirective } from '../../directive/text-formatter.directive';
import { UserInterface } from '../../interfaces/user.interface';

@Component({
  selector: 'app-inputfield',
  standalone: true,
  imports: [FormsModule, PickerModule, EmojiSelectorComponent, TextFormatterDirective],
  templateUrl: './inputfield.component.html',
  styleUrl: './inputfield.component.scss'
})
export class InputfieldComponent implements AfterViewInit {
  elementRef: ElementRef = inject(ElementRef);
  storage = inject(FirebaseStorageService);
  uid = inject(UidService);

  @ViewChild(TextFormatterDirective) formatter!: TextFormatterDirective

  @Input() thread: boolean = false;

  public message: string = '';
  startInput: boolean = false;
  showEmojiSelector: boolean = false;
  showTagSearch: boolean = false;
  tagSearch: string = '';
  suggestion: UserInterface | undefined = undefined;
  matchingUsers: UserInterface[] = [];


  constructor() { }

  @HostListener('document:click', ['$event'])

  ngAfterViewInit() {
    setTimeout(() => this.setFocus(), 250);
  }

  ngOnChanges(): void {
    setTimeout(() => this.setFocus(), 250);
  }


  setFocus() {
    const focusElement = this.getFocusElement();
    if (focusElement) focusElement.focus();
  }


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
  outsideClick(event: any) {
    event.stopPropagation();
    const path = event.path || (event.composedPath && event.composedPath());
    if (!path.includes(this.elementRef.nativeElement.querySelector('.smileys, .smileys-container'))) {
      this.showEmojiSelector = false;
    }
  }


  checkKey(event: KeyboardEvent) {
    console.log(event);
    const targetElement = event.target as HTMLElement;
    console.log(event.key);
    console.log(targetElement.id);

    if (targetElement.id === 'tag-search-input' || targetElement.id === 'tag-search-input-thread') {
      if ((event.key === 'Enter' || event.key === 'NumpadEnter' || event.key === 'Tab') && this.suggestion) {
        this.formatter.addTag(this.suggestion);
      }
      if (event.key === 'Escape') this.toggleTagSearch();
    }

    if (targetElement.id === 'messageContent' || targetElement.id === 'messageContentThread') {
      if ((event.key === 'Enter' || event.key === 'NumpadEnter') && this.message !== '') {
        this.sendMessage();
      }
      if (event.key === 'Backspace') {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;
        const offset = range.startOffset;

        if (currentNode.nodeType === Node.TEXT_NODE && currentNode.previousSibling) {
          const previousElement = currentNode.previousSibling as HTMLElement;

          if (previousElement.tagName === 'SPAN' && previousElement.classList.contains('tagMessage')) {
            const textBeforeCursor = currentNode.textContent?.slice(0, offset) || '';
            const zeroWidthSpace = '\u200B';

            if (textBeforeCursor.endsWith(zeroWidthSpace)) {
              previousElement.remove();
              currentNode.textContent = textBeforeCursor.slice(0, -1) + (currentNode.textContent?.slice(offset) || '');
              event.preventDefault();
            }
          }
        }
      }
    }


  }


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
  sendMessage() {
    let message = this.elementRef.nativeElement.classList.contains('message-content') ? this.elementRef.nativeElement : this.elementRef.nativeElement.querySelector('.message-content');
    if (!message.innerHTML || !this.storage.currentUser.id || !this.storage.currentUser.currentChannel) return;
    let newPost: PostInterface = this.generateNewPost();
    if (this.thread) this.handleThreadPost(newPost);
    else this.handleNormalPost(newPost);
    message.innerHTML = '';
    this.startInput = false;
  }


  /**
   * Checks if the current channel is a channel in the storage.
   * Searches the list of channels to find one matching the current channel ID.
   * 
   * @returns {object | undefined} The channel object if found, otherwise undefined.
   */
  isChannel() {
    return this.storage.channel.find(channel => channel.id === this.storage.currentUser.currentChannel);
  }


  /**
   * Checks if the current channel is a direct message (DM).
   * Searches the current user's DM list to find a DM matching the current channel ID.
   * 
   * @returns {object | undefined} The DM object if found, otherwise undefined.
   */
  isDM() {
    return this.storage.currentUser.dm.find(dm => dm.id === this.storage.currentUser.currentChannel);
  }


  /**
   * Checks if the current direct message is a self-direct message.
   * A self-direct message is a direct message where the contact is the same as the current user.
   * @returns {boolean}
   */
  isSelfDm() {
    return this.storage.currentUser.id === this.storage.currentUser.dm.find(dm => dm.id === this.storage.currentUser.currentChannel)?.contact;
  }


  /**
   * Generates a new post object with the current message as the text and
   * fills in the other properties with sensible defaults.
   * @returns {PostInterface}
   */
  generateNewPost() {
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
   * If the user is in a channel, calls writeThreadToChannel with the new post.
   * If the user is in a DM, calls writeThreadToDm with the new post.
   * @param newPost - The new post to append to the currently replied-to post.
   */
  handleThreadPost(newPost: PostInterface) {
    if (this.isChannel()) this.writeThreadToChannel(newPost);
    else if (this.isDM()) this.writeThreadToDm(newPost);
  }


  /**
   * If the user is in a channel, finds the post that the user is currently replying to by ID,
   * and updates it with the new post text.
   * @param newPost - The new post to append to the currently replied-to post.
   */
  writeThreadToChannel(newPost: PostInterface) {
    if (!this.storage.currentUser.currentChannel || !this.storage.currentUser.id) return;
    let posts = this.storage.channel.find(channel => channel.id === this.storage.currentUser.currentChannel)?.posts;
    let post = posts?.find(post => post.id === this.storage.currentUser.postId);
    if (post && this.storage.currentUser.postId) {
      let updatedPost = this.updatePost(post, newPost);
      this.storage.updateChannelPost(this.storage.currentUser.currentChannel, this.storage.currentUser.postId, updatedPost);
    }
  }


  /**
   * Writes a new thread message to a direct message (DM).
   * This function updates the existing post with a new message in the thread.
   * If the DM is not a self-DM, it updates the DM for both users involved.
   * 
   * @param newPost - The new post to add to the thread.
   */
  writeThreadToDm(newPost: PostInterface) {
    if (!this.storage.currentUser.currentChannel || !this.storage.currentUser.id) return;
    let dm = this.storage.currentUser.dm.find(dm => dm.id === this.storage.currentUser.currentChannel);
    let post = dm?.posts.find(post => post.id === this.storage.currentUser.postId);
    if (post && this.storage.currentUser.postId) {
      let updatedPost = this.updatePost(post, newPost);
      this.storage.updateDmPost(this.storage.currentUser.id, dm?.contact || '', this.storage.currentUser.postId, updatedPost);
      if (!this.isSelfDm())
        this.storage.updateDmPost(dm?.contact || '', this.storage.currentUser.id, this.storage.currentUser.postId, updatedPost);
    }
  }


  /**
   * Updates an existing post with a new post and sets the post as a thread.
   * The new post is added to the threadMsg array of the existing post.
   * @param post - The existing post to update.
   * @param newPost - The new post to add to the thread.
   * @returns The updated post with the new post added to its thread.
   */
  updatePost(post: PostInterface, newPost: PostInterface) {
    post.thread = true;
    post.threadMsg?.push(newPost);
    return post;
  }


  /**
   * Writes a new post to a channel or a DM and updates the Firestore "channel" or "user" collection.
   * If the post is a DM and the recipient is not the user itself, it writes the post to the recipient's DM as well.
   * @param newPost - The new post to add.
   */
  handleNormalPost(newPost: PostInterface) {
    if (this.isChannel()) this.writeNormalPostToChannel(newPost);
    else if (this.isDM()) {
      this.writeNormalPostToDm(newPost);
      if (!this.isSelfDm()) this.writeNormalPostToContactDm(newPost);
    }
  }


  /**
   * Writes a normal post to the current channel.
   * 
   * If the current user or channel information is not available, the function returns immediately.
   * Otherwise, it writes the new post to the channel associated with the current user's active channel.
   *
   * @param newPost - The new post to write to the channel.
   */
  writeNormalPostToChannel(newPost: PostInterface) {
    if (!this.storage.currentUser.currentChannel || !this.storage.currentUser.id) return;
    this.storage.writePosts(this.storage.currentUser.currentChannel, newPost);
  }


  /**
   * Writes a normal post to the direct message (DM) of the current user.
   * 
   * If the current user or channel information is not available, the function returns immediately.
   * Otherwise, it writes the new post to the DM with the contact associated with the current DM.
   *
   * @param newPost - The new post to write to the DM.
   */
  writeNormalPostToDm(newPost: PostInterface) {
    if (!this.storage.currentUser.currentChannel || !this.storage.currentUser.id) return;
    this.storage.writeDm(this.storage.currentUser.id, this.storage.currentUser.dm.find(dm => dm.id === this.storage.currentUser.currentChannel)?.contact || '', newPost);
  }


  /**
   * Writes a normal post to the direct message (DM) of the contact associated with the current DM.
   * 
   * If the current user or channel information is not available, the function returns immediately.
   * Otherwise, it writes the new post to the contact's DM with the current user's ID as the contact.
   *
   * @param newPost - The new post to write to the contact's DM.
   */
  writeNormalPostToContactDm(newPost: PostInterface) {
    if (!this.storage.currentUser.currentChannel || !this.storage.currentUser.id) return;
    this.storage.writeDm(this.storage.currentUser.dm.find(dm => dm.id === this.storage.currentUser.currentChannel)?.contact || '', this.storage.currentUser.id, newPost);
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


  toggleTagSearch() {
    this.tagSearch = '';
    this.matchingUsers = [];
    this.suggestion = undefined;
    this.showTagSearch = !this.showTagSearch;
    this.setFocus();
  }


  tagSearchInput() {
    let match: UserInterface | undefined;
    this.matchingUsers = [];
    if (this.tagSearch && this.tagSearch.length > 0) {
      let users: UserInterface[] = this.storage.user;
      this.matchingUsers = users.filter(user => user.name.toLowerCase().includes(this.tagSearch.toLowerCase()));
      match = this.matchingUsers.length > 0 ? this.matchingUsers[0] : undefined;
      if (match) this.suggestion = match;
      else this.suggestion = { name: 'Channel', id: 'channel', email: '', online: false, avatar: '', dm: [] };
    }
    else this.suggestion = { name: 'Channel', id: 'channel', email: '', online: false, avatar: '', dm: [] };
  }
}



