import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EditorPreviewWrapperComponent } from './editor-preview-wrapper/editor-preview-wrapper.component'; // ✅ Import Wrapper Component

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, EditorPreviewWrapperComponent], // ✅ Add it to imports
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {}
