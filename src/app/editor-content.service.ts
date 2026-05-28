import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EditorContentService {
  private content: string = '';
  private reset$ = new BehaviorSubject<string | null>(null);

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
