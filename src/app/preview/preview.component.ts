import { Component, EventEmitter, Input, Output, OnChanges } from '@angular/core';

@Component({
  selector: 'app-preview',
  standalone: true,
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent implements OnChanges {
  @Input() content: string = '';
  @Output() closePreview = new EventEmitter<void>();

  ngOnChanges() {}

  backToEditor() {
    this.closePreview.emit();
  }
}
