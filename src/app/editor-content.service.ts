import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EditorContentService {
  private content: string = '';
  private reset$ = new Subject<string>();

  setContent(newContent: string) {
    this.content = newContent;
  }

  getContent(): string {
    return this.content;
  }

  reset(newContent: string) {
    this.content = newContent;
    this.reset$.next(newContent);
  }

  get onReset() {
    return this.reset$.asObservable();
  }
}
