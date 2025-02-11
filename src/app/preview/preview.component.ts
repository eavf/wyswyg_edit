import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';  // Import DomSanitizer
import { EditorContentService } from '../editor-content.service';

@Component({
  selector: 'app-preview',
  templateUrl: './preview.component.html',
  styleUrls: ['./preview.component.css']
})
export class PreviewComponent {
  content: SafeHtml = '';  // Use SafeHtml to store sanitized content

  constructor(
    private router: Router,
    private contentService: EditorContentService,
    private sanitizer: DomSanitizer  // Inject DomSanitizer
  ) {}

  ngOnInit() {
    const rawContent = this.contentService.getContent() || '<p>No content to preview.</p>';
    this.content = this.sanitizer.bypassSecurityTrustHtml(rawContent);  // Bypass Angular's sanitizer safely
  }

  goBackToEditor() {
    this.router.navigate(['/editor']);
  }
}
