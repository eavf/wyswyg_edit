import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorComponent } from '../editor/editor.component';
import { PreviewComponent } from '../preview/preview.component';
import { EditorContentService } from '../editor-content.service';

@Component({
  selector: 'app-editor-preview-wrapper',
  standalone: true,
  imports: [CommonModule, EditorComponent, PreviewComponent],
  templateUrl: './editor-preview-wrapper.component.html',
  styleUrls: ['./editor-preview-wrapper.component.css'],
  providers: [EditorContentService]
})
export class EditorPreviewWrapperComponent {
  isPreviewMode = false;
  content: string = '';

  constructor(private contentService: EditorContentService) {}

  goToPreview() {
    this.content = this.contentService.getContent();
    this.isPreviewMode = true;
  }

  backToEditor() {
    this.isPreviewMode = false;
  }
}
