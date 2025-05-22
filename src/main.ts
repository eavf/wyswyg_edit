import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { createCustomElement } from '@angular/elements';
import { isDevMode } from '@angular/core';
import { AppComponent } from './app/app.component';
import { EditorPreviewWrapperComponent } from './app/editor-preview-wrapper/editor-preview-wrapper.component';
import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const commonProviders = [
  provideZoneChangeDetection(),
  provideHttpClient(withInterceptorsFromDi()),
  ...appConfig.providers
];

if (isDevMode()) {
  console.log('Development Mode: Bootstrapping full Angular app with AppComponent...');

  bootstrapApplication(AppComponent, {
    providers: commonProviders
  }).catch(err => console.error('Development Bootstrap Error:', err));
} else {
  console.log('Production Mode: Registering <app-editor> as a web component...');

  bootstrapApplication(EditorPreviewWrapperComponent, {
    providers: commonProviders
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
