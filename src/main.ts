import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { createCustomElement } from '@angular/elements';
import { isDevMode, Injector } from '@angular/core';
import { AppComponent } from './app/app.component';
import { EditorPreviewWrapperComponent } from './app/editor-preview-wrapper/editor-preview-wrapper.component';
import { provideZoneChangeDetection } from '@angular/core';

if (isDevMode()) {
  console.log('Development Mode: Bootstrapping full Angular app with AppComponent...');
  // ✅ Bootstrapping AppComponent in development mode (so the full Angular app loads properly)
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error('Development Bootstrap Error:', err));
} else {
  console.log('Production Mode: Registering <app-editor> as a web component...');

  bootstrapApplication(EditorPreviewWrapperComponent, {
    providers: [
      provideZoneChangeDetection(),
      ...appConfig.providers,
    ],
  })
    .then(appRef => {
      const injector = appRef.injector;
      const editorElement = createCustomElement(EditorPreviewWrapperComponent, { injector });

      if (!customElements.get('app-editor-preview-wrapper')) {
        customElements.define('app-editor-preview-wrapper', editorElement);
        console.log('<app-editor-preview-wrapper> custom element registered successfully.');
      }
    })
    .catch(err => console.error('Production Bootstrap Error:', err));
}
