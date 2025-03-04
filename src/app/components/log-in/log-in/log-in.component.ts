import { Component } from '@angular/core';
import { LogInCardComponent } from './log-in-card/log-in-card.component';
import { BackgroundWithSignInComponent } from "../../../shared/components/log-in/background-with-sign-in/background-with-sign-in.component";
import { SendEmailCardComponent } from "./send-email-card/send-email-card.component";
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';


@Component({
  selector: 'app-log-in',
  standalone: true,
  imports: [CommonModule, LogInCardComponent, BackgroundWithSignInComponent, SendEmailCardComponent],
  templateUrl: './log-in.component.html',
  styleUrls: ['./log-in.component.scss']
})
export class LogInComponent {

  login: boolean = true;
  showLoading: boolean = true;


  /**
   * The constructor injects the 'ActivatedRoute' service to access information about the current route.
   * @param route - The Angular service used to access route-related information.
   */
  constructor(private route: ActivatedRoute) { }


  /**
   * When the component gets initialized, the overlay is shown for 3 seconds.
   */
  ngOnInit() {
    setTimeout(() => {
      this.showLoading = false;
    }, 3000);
  }
}
