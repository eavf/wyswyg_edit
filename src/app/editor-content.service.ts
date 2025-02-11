import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'  // Makes the service available app-wide
})
export class EditorContentService {
  private content: string = '';

  setContent(newContent: string) {
    this.content = newContent;
  }

  getContent(): string {
    return this.content;
  }
}
