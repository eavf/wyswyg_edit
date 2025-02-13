import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-preview',
  standalone: true,
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent {
  @Input() content: string = '';
  @Output() closePreview = new EventEmitter<void>();
  safeContent: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.safeContent = this.sanitizer.bypassSecurityTrustHtml(this.content);
  }

  backToEditor() {
    this.closePreview.emit();
  }
}
