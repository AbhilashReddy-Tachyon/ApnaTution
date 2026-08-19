import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type TermsTab = 'parent' | 'tutor';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './terms.html',
  styleUrl: './terms.css',
})
export class TermsComponent {
  activeTab: TermsTab = 'parent';

  setTab(tab: TermsTab): void {
    this.activeTab = tab;
  }
}
