import { Component, inject } from '@angular/core';
import { FirebaseStorageService } from '../../../../shared/services/firebase-storage.service';
import { NavigationService } from '../../../../shared/services/navigation.service';
import { SearchComponent } from '../../navbar/search/search.component'; 

@Component({
  selector: 'app-head-section',
  standalone: true,
  imports: [SearchComponent],
  templateUrl: './head-section.component.html',
  styleUrl: './head-section.component.scss'
})
export class HeadSectionComponent {

  storage = inject(FirebaseStorageService);
  navigationService = inject(NavigationService);

  constructor() { }

}
