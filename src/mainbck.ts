import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { createCustomElement } from '@angular/elements';
import { Injector, isDevMode } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app/app.routes';

// Function to register the custom element with fallback logic
function registerCustomElement(appRef: any, maxRetries = 10, retryInterval = 300) {
  const injector = appRef.injector;

  // Register the custom element if not already defined
  if (!customElements.get('app-editor')) {
    const editorElement = createCustomElement(AppComponent, { injector });
    customElements.define('app-editor', editorElement);
    console.log('<app-editor> custom element registered.');
  } else {
    console.warn('<app-editor> is already defined.');
  }

  // Fallback: Check for <app-editor> in the DOM and confirm its readiness
  let retries = 0;
  const checkElementInterval = setInterval(() => {
    const editorElementInDOM = document.querySelector('app-editor');

    if (editorElementInDOM) {
      console.log('<app-editor> found in DOM and ready.');
      clearInterval(checkElementInterval); // Stop checking once found
    } else if (retries >= maxRetries) {
      console.error('<app-editor> not found after maximum retries. Please ensure it’s correctly included in your HTML.');
      clearInterval(checkElementInterval); // Stop after max retries
    } else {
      console.warn(`<app-editor> not found yet. Retrying... (${retries + 1}/${maxRetries})`);
      retries++;
    }
  }, retryInterval);  // Check every 300ms
}

// Development Mode: Bootstrap as a normal Angular app
if (isDevMode()) {
  bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [
      provideRouter(routes, withHashLocation())
    ]
  })
    .catch(err => console.error('Development Bootstrap Error:', err));
} else {
  // Production Mode: Register <app-editor> as a custom element
  console.warn(`<app-editor> - som v angualar prvku!!!!!`);
  bootstrapApplication(AppComponent, {
    ...appConfig,
    providers: [
      provideRouter(routes, withHashLocation())
    ]
  })
    .then(appRef => {
      registerCustomElement(appRef);  // Handle registration and fallback
    })
    .catch(err => console.error('Production Bootstrap Error:', err));
}
