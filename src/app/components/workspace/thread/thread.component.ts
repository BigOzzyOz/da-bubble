import { Component } from '@angular/core';
import { InputfieldComponent } from "../../../shared/components/inputfield/inputfield.component";
import { ThreadMessagesComponent } from "./thread-messages/thread-messages.component";
import { ThreadHeadComponent } from "./thread-head/thread-head.component";

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [InputfieldComponent, ThreadMessagesComponent, ThreadHeadComponent],
  templateUrl: './thread.component.html',
  styleUrl: './thread.component.scss'
})
export class ThreadComponent {

}