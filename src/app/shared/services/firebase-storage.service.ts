import { inject, Injectable } from '@angular/core';
import { Firestore } from '@angular/fire/firestore';
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { UserInterface } from '../interfaces/user.interface';
import { ChannelInterface } from '../interfaces/channel.interface';
import { PostInterface } from '../interfaces/post.interface';
import { CurrentUserInterface } from '../interfaces/current-user-interface';
import { UidService } from './uid.service';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  firestore: Firestore = inject(Firestore);
  uid = inject(UidService);

  user: UserInterface[] = [];
  channel: ChannelInterface[] = [];
  currentUser: CurrentUserInterface = { name: '', email: '', avatar: '', status: '', dm: [], id: '' };
  authUid = sessionStorage.getItem("authUid") || 'oYhCXFUTy11sm1uKLK4l';


  unsubUsers;
  unsubChannels;
  unsubCurrentUser;


  /**
   * Im Constructor wird zuerst die Channel-Collection und User-Collection gespeichert.
   * Dann wird der aktuelle User registriert. 
   */
  constructor() {
    this.unsubChannels = this.getChannelCollection();
    this.unsubUsers = this.getUserCollection();
    this.unsubCurrentUser = this.getCurrentUser();
  }

  ngOnDestroy(): void {
    this.unsubUsers();
    this.unsubChannels();
    this.unsubCurrentUser();
  }

  /**
   * Diese Methode wird im Constructor aufgerufen und speichert alle Channels im Firebase im Array "channel".
   */
  getChannelCollection() {
    return onSnapshot(collection(this.firestore, "channel"), (snapshot) => {
      this.channel = [];
      snapshot.forEach((doc) => {
        const channelData = doc.data() as ChannelInterface;
        channelData.id = doc.id;
        this.channel.push(channelData);
      });
      console.log("Channel-Sammlung über die getChannelCollection() Methode:",this.channel);
    });
  }

  /**
   * Diese Methode wird im Constructor aufgerufen und speichert alle User im Firebase im Array "user".
   */
  getUserCollection() {
    return onSnapshot(collection(this.firestore, "user"), (snapshot) => {
      this.user = [];
      snapshot.forEach((doc) => {
        const userData = doc.data() as UserInterface;
        userData.id = doc.id;
        this.user.push(userData);
      });
      console.log("User-Sammlung über die getUserCollection() Methode:",this.user);
    });
  }

  /**
   * Diese Methode wird im Constructor aufgerufen und speichert den aktuellen User in die Variable "currentUser".
   */
  getCurrentUser() {
    // Das onSnapshot Abonnement hört auf Änderungen am spezifischen Benutzer-Dokument ("user" Collection, Dokument mit ID this.authUid).
    return onSnapshot(doc(this.firestore, "user", this.authUid), (snapshot) => {
      let userData = snapshot.data() as CurrentUserInterface;
      userData.id = snapshot.id; // wird das hier überhaupt gebraucht?

      userData.currentChannel = sessionStorage.getItem("currentChannel") 
        || this.channel.find(channel => channel.user.includes(snapshot.id))?.id
        || userData.dm.find(dm => dm.contact === snapshot.id)?.id;

      this.currentUser = userData;
      console.log("Der aktuelle User:", this.currentUser)
    })
  }

  /**
   * Diese Methode speichert die übergebene channel-Id in currentUser.currentChannel. Diese channel-Id wird auch in eine  Web Storage API im Browser gespeichert. 
   * Dies ermöglicht es deiner Anwendung, den aktuell ausgewählten Kanal über verschiedene Komponenten und Seiten hinweg zu verfolgen, solange die Browsersitzung aktiv ist.
   * Wird in workspace/workspace-menu/channel-section angewendet beim click auf einen channel.
   */
  setChannel(channelId: string) {
    this.currentUser.currentChannel = channelId;
    sessionStorage.setItem("currentChannel", channelId);
    console.log("currentChannel", channelId);
  }

  // after Firebase Auth registration
  async addUser(authUid: string, userData: { name: string, email: string, avatar: string }) {
    await setDoc(doc(this.firestore, "user", authUid), {
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      status: '',
      dm: [{
        contact: authUid,
        id: this.uid.generateUid(),
        posts: [],
      },],
    } as UserInterface);
  }

  // after sending new channel form
  async addChannel(channelData: { name: string, description: string, owner: string }) {
    await setDoc(doc(this.firestore, "channel"), {
      name: channelData.name,
      description: channelData.description,
      owner: channelData.owner,
      user: [channelData.owner],
      posts: [],
    } as ChannelInterface);
  }


  // after sending edit user profile form
  async updateUser(userId: string, userData: UserInterface) {
    await updateDoc(doc(this.firestore, "user", userId), {
      name: userData.name,
      email: userData.email,
      avatar: userData.avatar,
      status: userData.status,
      dm: userData.dm
    })
  }


  // after sending edit channel form
  async updateChannel(channelId: string, channelData: ChannelInterface) {
    await updateDoc(doc(this.firestore, "channel", channelId), {
      name: channelData.name,
      description: channelData.description,
      owner: channelData.owner,
      user: channelData.user,
      posts: channelData.posts,
    })
  }


  async writeDm(userId: string, contact: string, newPost: PostInterface) {
    let sendUser = this.user[this.user.findIndex(user => user.id === userId)];
    let newDm = sendUser.dm[sendUser.dm.findIndex(dm => dm.contact === contact)];

    if (newDm) {
      newDm.posts.push(newPost);
    } else {
      sendUser.dm.push({
        contact: contact,
        id: this.uid.generateUid(),
        posts: [newPost],
      });
    }
    await updateDoc(doc(this.firestore, "user", userId), {
      dm: sendUser.dm
    });
  };


  async writePosts(channelId: string, newPost: PostInterface) {
    let currentChannel = this.channel[this.channel.findIndex(channel => channel.id === channelId)];
    if (currentChannel) {
      await updateDoc(doc(this.firestore, "channel", channelId), {
        posts: [
          ...currentChannel.posts ?? [],
          newPost
        ]
      });
    };
  }
}
