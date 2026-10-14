import { Component } from '@angular/core';

import { EditorPreviewWrapperComponent } from './editor-preview-wrapper/editor-preview-wrapper.component'; // ✅ Import Wrapper Component

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EditorPreviewWrapperComponent], // ✅ Add it to imports
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {}
