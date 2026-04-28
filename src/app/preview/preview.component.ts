import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-preview',
  standalone: true,
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent {
  @Input() content: string = '';
  @Output() closePreview = new EventEmitter<void>();

  backToEditor() {
    this.closePreview.emit();
  }

  onPreviewClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (anchor) {
      event.preventDefault();
      window.open(anchor.href, '_blank', 'noopener,noreferrer');
    }
  }
}
