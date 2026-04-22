import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { createCustomElement } from '@angular/elements';
import { isDevMode, Component } from '@angular/core';
import { AppComponent } from './app/app.component';
import { EditorPreviewWrapperComponent } from './app/editor-preview-wrapper/editor-preview-wrapper.component';
import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

const commonProviders = [
  provideZoneChangeDetection(),
  provideHttpClient(withInterceptorsFromDi()),
  ...appConfig.providers
];

// Minimálny prázdny komponent pre production bootstrap —
// zabraňuje konfliktu s <vovo-editor> elementmi na stránke
@Component({ selector: 'vovo-bootstrap-root', template: '', standalone: true })
class VovoBootstrapRoot {}

if (isDevMode()) {
  console.log('Development Mode: Bootstrapping full Angular app with AppComponent...');

  bootstrapApplication(AppComponent, {
    providers: commonProviders
  }).catch(err => console.error('Development Bootstrap Error:', err));
} else {
  console.log('Production Mode: Registering <vovo-editor> as a web component...');

  const host = document.createElement('vovo-bootstrap-root');
  host.style.cssText = 'display:none';
  document.body.appendChild(host);

  bootstrapApplication(VovoBootstrapRoot, {
    providers: commonProviders
  })
    .then(appRef => {
      const injector = appRef.injector;
      const editorElement = createCustomElement(EditorPreviewWrapperComponent, { injector });

      if (!customElements.get('vovo-editor')) {
        customElements.define('vovo-editor', editorElement);
        console.log('<vovo-editor> custom element registered successfully.');
      }
    })
    .catch(err => console.error('Production Bootstrap Error:', err));
}
