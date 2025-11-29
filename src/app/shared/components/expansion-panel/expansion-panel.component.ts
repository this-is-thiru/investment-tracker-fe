import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChevronDown, Upload, Database, LucideAngularModule } from 'lucide-angular'; // Reusing Lucide icons

@Component({
  selector: 'app-expansion-panel',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './expansion-panel.component.html',
  styleUrls: ['./expansion-panel.component.scss'],
})
export class ExpansionPanelComponent {
  readonly ChevronDown = ChevronDown;
  readonly uploadIcon = Upload; 
  readonly databaseIcon = Database;

  // Panel title and optional subtitle
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;

  // Lucide icon name (e.g. 'TrendingUp', 'Upload', etc.)
  @Input() titleIcon: string = '';

  // Background class for icon container
  @Input() iconBgClass: string = 'bg-[#282828]';

  // Default expansion state
  @Input() isExpanded: boolean = true;

  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
  }
}
