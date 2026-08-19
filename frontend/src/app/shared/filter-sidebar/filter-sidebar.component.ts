import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type FilterFieldType = 'text' | 'select';

export interface FilterFieldOption {
  value: string;
  label: string;
}

export interface FilterFieldConfig {
  key: string;
  label: string;
  type: FilterFieldType;
  placeholder?: string;
  options?: FilterFieldOption[];
}

@Component({
  selector: 'app-filter-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.css',
})
export class FilterSidebarComponent {
  @Input() title = 'Filters';
  @Input() fields: FilterFieldConfig[] = [];
  @Input() filters: Record<string, string> = {};
  @Input() resultsLabel: string | null = null;
  @Input() showClear = true;

  @Output() filterChange = new EventEmitter<{ key: string; value: string }>();
  @Output() clear = new EventEmitter<void>();

  onFieldChange(key: string, event: Event) {
    const value = (event.target as HTMLInputElement | HTMLSelectElement).value;
    this.filterChange.emit({ key, value });
  }

  onClear() {
    this.clear.emit();
  }
}
