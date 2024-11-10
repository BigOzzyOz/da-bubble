import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-imprint',
  standalone: true,
  imports: [],
  templateUrl: './imprint.component.html',
  styleUrls: ['./imprint.component.scss']
})
export class ImprintComponent {

  constructor(
    private location: Location) {}

  goBack() {
    this.location.back();
  }
}