import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { EditorComponent } from './app/editor/editor.component';
import { createCustomElement } from '@angular/elements';
import { isDevMode, Injector } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';

if (isDevMode()) {
  // Development Mode: Bootstrap full Angular app
  bootstrapApplication(AppComponent, appConfig)
    .catch(err => console.error('Development Bootstrap Error:', err));
} else {
  // Production Mode: Register custom element with hash routing
  bootstrapApplication(EditorComponent, {
    ...appConfig,
    providers: [
      provideRouter(routes, withHashLocation())  // Use hash routing (no leading slash in links)
    ]
  })
  .then(appRef => {
    const injector = appRef.injector;
    const editorElement = createCustomElement(EditorComponent, { injector });
    if (!customElements.get('app-editor')) {
      customElements.define('app-editor', editorElement);
      console.log('<app-editor> custom element registered.');
    }
  })
  .catch(err => console.error('Production Bootstrap Error:', err));
}
