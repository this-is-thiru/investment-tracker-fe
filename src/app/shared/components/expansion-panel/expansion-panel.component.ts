import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideIconsModule } from '../../../core/icons/lucide-icons.module';
@Component({
  selector: 'app-expansion-panel',
  standalone: true,
  imports: [CommonModule, LucideIconsModule],
  templateUrl: './expansion-panel.component.html',
  styleUrls: ['./expansion-panel.component.scss'],
})
export class ExpansionPanelComponent implements OnInit {

  // Panel title and optional subtitle
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;

  // Lucide icon name (e.g. 'TrendingUp', 'Upload', etc.)
  @Input() titleIcon: string = '';

  // Background class for icon container
  @Input() iconBgClass: string = 'bg-[#282828]';

  // Default expansion state
  @Input() isExpanded: boolean = true;

  ngOnInit(): void {
    console.log(this.titleIcon);
  }

  toggleExpansion(): void {
    this.isExpanded = !this.isExpanded;
  }
}
