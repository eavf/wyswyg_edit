import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { EditorComponent } from '../editor/editor.component';
import { PreviewComponent } from '../preview/preview.component';
import { EditorContentService } from '../editor-content.service';

@Component({
  selector: 'vovo-editor',
  standalone: true,
  imports: [EditorComponent, PreviewComponent],
  templateUrl: './editor-preview-wrapper.component.html',
  styleUrls: ['./editor-preview-wrapper.component.css'],
  changeDetection: ChangeDetectionStrategy.Eager,
  providers: [EditorContentService]
})
export class EditorPreviewWrapperComponent {
  @Input() apiUrl: string = '';
  @Input() set initialContent(val: string) {
    if (val !== undefined) {
      this.isPreviewMode = false;
      this.contentService.reset(val);
    }
  }
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
