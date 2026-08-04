import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-ai-edit-toolbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-edit-toolbar.component.html',
  styleUrl: './ai-edit-toolbar.component.css'
})
export class AiEditToolbarComponent {
  @Input() canEdit = false;
  @Input() editMode = false;
  @Input() saving = false;
  @Input() title = 'Details';

  @Output() edit = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}
