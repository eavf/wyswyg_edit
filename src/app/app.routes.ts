import { Routes } from '@angular/router';
import { EditorComponent } from './editor/editor.component';
import { PreviewComponent } from './preview/preview.component';

export const routes: Routes = [
  { path: 'editor', component: EditorComponent },
  { path: 'preview', component: PreviewComponent },
  { path: '', redirectTo: 'editor', pathMatch: 'full' }, // Removed leading slash here
  { path: '**', redirectTo: 'editor' } // Removed leading slash here
];
