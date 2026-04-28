// Extend the global Window interface to include apiEndpoint
declare global {
  interface Window {
    apiEndpoint?: string;
  }
}

import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  ChangeDetectorRef,
  NgZone
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { EditorContentService } from '../editor-content.service';

@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent {
  @Input() apiUrl: string = '';
  content: string = '';
  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput', { static: false }) imageInput!: ElementRef<HTMLInputElement>;
  @ViewChild('htmlArea', { static: false }) htmlArea?: ElementRef<HTMLTextAreaElement>;
  @Output() goToPreview = new EventEmitter<void>();

  selectedImage: HTMLImageElement | null = null;
  imageStyles = {
    width: '75px',
    height: 'auto',
    borderRadius: '0px',
    float: 'none'
  };
  imageSize: string = 'img-md';
  imageRadiusPx: number = 0;
  imageToolbarPos: { [key: string]: string } = {};

  showLinkDialog = false;
  linkUrl = '';
  linkTarget = '_blank';
  private editingLink: HTMLAnchorElement | null = null;

  showValidation = false;
  validationIssues: string[] = [];
  validationHighlightHtml = '';
  validationItems: { label: string; search: string; occurrence: number }[] = [];
  validationMessages: string[] = [];

  private savedRange: Range | null = null;

  constructor(
    private http: HttpClient,
    private contentService: EditorContentService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit() {
    if (!this.apiUrl && window.apiEndpoint) {
      this.apiUrl = window.apiEndpoint;
    }
  }

  ngAfterViewInit() {
    if (!document.getElementById('vovo-editor-styles')) {
      const style = document.createElement('style');
      style.id = 'vovo-editor-styles';
      style.textContent = [
        '.editor ul,.preview-content ul{list-style:disc outside !important;list-style-type:disc !important;padding-left:1.5em !important;margin:.5em 0 !important}',
        '.editor ol,.preview-content ol{list-style:decimal outside !important;list-style-type:decimal !important;padding-left:1.5em !important;margin:.5em 0 !important}',
        '.editor li,.preview-content li{display:list-item !important;list-style-type:inherit !important}',
        '.editor ul li::marker,.preview-content ul li::marker{content:"• " !important}',
        '.editor ol li::marker,.preview-content ol li::marker{content:counter(list-item)". " !important}',
      ].join('');
      document.head.appendChild(style);
    }

    this.contentService.onReset.subscribe(content => {
      if (content === null) return;
      this.content = content;
      this.selectedImage = null;
      this.ngZone.runOutsideAngular(() => {
        Promise.resolve().then(() => {
          if (this.editor?.nativeElement) {
            this.editor.nativeElement.innerHTML = content;
          }
        });
      });
      this.cdr.detectChanges();
    });

    const initial = this.contentService.getContent();
    this.content = initial || '<p>Začnite písať článok...</p>';
    this.editor.nativeElement.innerHTML = this.content;
    this.cdr.detectChanges();
  }

  saveSelection() {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      this.savedRange = selection.getRangeAt(0).cloneRange();
    }
  }

  private restoreSelection() {
    if (!this.savedRange) return;
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(this.savedRange);
    }
    this.editor.nativeElement.focus();
  }

  private toggleInlineStyle(tag: string) {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentEl = (container.nodeType === Node.TEXT_NODE
      ? container.parentElement
      : container) as HTMLElement;

    const existing = parentEl.closest(tag);
    if (existing && this.editor.nativeElement.contains(existing)) {
      const parent = existing.parentNode!;
      const frag = document.createDocumentFragment();
      while (existing.firstChild) frag.appendChild(existing.firstChild);
      parent.replaceChild(frag, existing);
    } else {
      const wrapper = document.createElement(tag);
      try {
        range.surroundContents(wrapper);
      } catch {
        wrapper.appendChild(range.extractContents());
        range.insertNode(wrapper);
      }
      const newRange = document.createRange();
      newRange.selectNodeContents(wrapper);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    this.updateContent();
  }

  private setBlockFormat(tag: string) {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    let node: Node | null = range.startContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;

    const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'DIV'];
    let block: HTMLElement | null = node as HTMLElement;
    while (block && block !== this.editor.nativeElement && !blockTags.includes(block.tagName?.toUpperCase())) {
      block = block.parentElement;
    }

    if (block && block !== this.editor.nativeElement) {
      const newBlock = document.createElement(tag);
      newBlock.innerHTML = block.innerHTML;
      block.parentNode?.replaceChild(newBlock, block);
    }
    this.updateContent();
  }

  private insertUnorderedList() {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const block = this.findParentBlock(range.startContainer);
    const ul = document.createElement('ul');

    // Vždy konvertuj aktuálny blok — so selekciou aj bez
    const li = document.createElement('li');
    li.innerHTML = block ? (block.innerHTML || '<br>') : '<br>';
    ul.appendChild(li);
    if (block) {
      block.parentNode!.replaceChild(ul, block);
    } else {
      range.deleteContents();
      range.insertNode(ul);
    }

    const newRange = document.createRange();
    newRange.selectNodeContents(li);
    newRange.collapse(false);
    selection.removeAllRanges();
    selection.addRange(newRange);
    this.updateContent();
  }

  private removeAllFormatting() {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    if (!selection.isCollapsed) {
      // So selekciou: nahraď čistým textom
      const range = selection.getRangeAt(0);
      const text = document.createTextNode(range.toString());
      range.deleteContents();
      range.insertNode(text);
      const newRange = document.createRange();
      newRange.selectNode(text);
      selection.removeAllRanges();
      selection.addRange(newRange);
    } else {
      // Bez selekcie: konvertuj aktuálny blok na čistý <p>
      const range = selection.getRangeAt(0);
      const block = this.findParentBlock(range.startContainer, true);
      if (!block) return;
      const p = document.createElement('p');
      p.textContent = block.textContent || '';
      if (block.tagName === 'LI') {
        const list = block.parentElement!;
        list.parentNode?.replaceChild(p, list);
      } else {
        block.parentNode?.replaceChild(p, block);
      }
      const newRange = document.createRange();
      newRange.selectNodeContents(p);
      newRange.collapse(false);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    this.updateContent();
  }

  private findParentBlock(node: Node | null, includeLi = false): HTMLElement | null {
    const tags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', ...(includeLi ? ['LI'] : [])];
    let el: HTMLElement | null = node?.nodeType === Node.TEXT_NODE
      ? (node as Text).parentElement
      : node as HTMLElement;
    while (el && el !== this.editor.nativeElement && !tags.includes(el.tagName?.toUpperCase() ?? '')) {
      el = el.parentElement;
    }
    return el && el !== this.editor.nativeElement ? el : null;
  }

  private insertHtmlAtCaret(html: string) {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const template = document.createElement('template');
    template.innerHTML = html;
    const frag = template.content;
    const lastNode = frag.lastChild;
    range.insertNode(frag);

    if (lastNode) {
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
    this.updateContent();
  }

  insertLink() {
    this.saveSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const existing = (range.commonAncestorContainer.nodeType === Node.TEXT_NODE
      ? range.commonAncestorContainer.parentElement
      : range.commonAncestorContainer as HTMLElement)?.closest('a');

    if (existing && this.editor.nativeElement.contains(existing)) {
      this.editingLink = existing as HTMLAnchorElement;
      this.linkUrl = existing.getAttribute('href') || '';
      this.linkTarget = existing.getAttribute('target') || '_blank';
    } else {
      this.editingLink = null;
      this.linkUrl = '';
      this.linkTarget = '_blank';
    }
    this.showLinkDialog = true;
    this.cdr.detectChanges();
  }

  confirmLink() {
    const url = this.linkUrl.trim();
    this.showLinkDialog = false;

    if (this.editingLink) {
      if (url === '') {
        const parent = this.editingLink.parentNode!;
        const frag = document.createDocumentFragment();
        while (this.editingLink.firstChild) frag.appendChild(this.editingLink.firstChild);
        parent.replaceChild(frag, this.editingLink);
      } else {
        this.editingLink.setAttribute('href', url);
        this.editingLink.setAttribute('target', this.linkTarget);
        this.editingLink.setAttribute('rel', this.linkTarget === '_blank' ? 'noopener noreferrer' : '');
      }
      this.editingLink = null;
      this.updateContent();
      return;
    }

    if (!url) return;
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = this.linkTarget;
    anchor.rel = this.linkTarget === '_blank' ? 'noopener noreferrer' : '';
    if (range.collapsed) {
      anchor.textContent = url;
      range.insertNode(anchor);
    } else {
      try {
        range.surroundContents(anchor);
      } catch {
        anchor.appendChild(range.extractContents());
        range.insertNode(anchor);
      }
    }
    this.updateContent();
  }

  cancelLink() {
    this.showLinkDialog = false;
    this.editingLink = null;
  }

  format(command: string, value: string = '') {
    switch (command) {
      case 'bold':                this.toggleInlineStyle('b'); break;
      case 'italic':              this.toggleInlineStyle('i'); break;
      case 'underline':           this.toggleInlineStyle('u'); break;
      case 'insertUnorderedList': this.insertUnorderedList(); break;
      case 'formatBlock':         this.setBlockFormat(value); break;
    }
  }

  clearFormatting() {
    this.removeAllFormatting();
  }

  updateContent() {
    this.content = this.editor.nativeElement.innerHTML;
    this.contentService.setContent(this.content);
  }

  submitContent() {
    const { formData, imageCount } = this.buildSubmitPayload();
    const fullContent = this.content;

    window.dispatchEvent(new CustomEvent('editor-submit', {
      detail: { formData, imageCount, fullContent }
    }));

    if (this.apiUrl) {
      this.http.post(this.apiUrl, formData).subscribe({
        next: () => alert('Obsah odoslaný.'),
        error: (err) => { alert('Chyba pri odosielaní.'); console.error(err); }
      });
    }
  }

  private buildSubmitPayload(): { formData: FormData, imageCount: number } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(this.content, 'text/html');
    const imgs = Array.from(doc.querySelectorAll('img[src^="data:"]'));
    const formData = new FormData();
    let imageCount = 0;

    imgs.forEach((img, i) => {
      const src = img.getAttribute('src')!;
      const m = src.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        const [, mime, b64] = m;
        const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
        const ext = mime.split('/')[1] || 'jpg';
        formData.append(`image_${i}`, new Blob([bytes], { type: mime }), `image_${i}.${ext}`);
        img.setAttribute('src', `__img_${i}__`);
        imageCount++;
      }
    });

    formData.append('content', doc.body.innerHTML);
    return { formData, imageCount };
  }

  triggerPreview() {
    this.updateContent();
    this.goToPreview.emit();
  }

  triggerImageUpload() {
    this.saveSelection();
    this.imageInput.nativeElement.click();
  }

  uploadImageEncoded(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (!fileInput.files || !fileInput.files[0]) return;
    const file = fileInput.files[0];
    const rangeAtUpload = this.savedRange ? this.savedRange.cloneRange() : null;
    const objectUrl = URL.createObjectURL(file);
    const tempImg = new Image();
    tempImg.onload = () => {
      const maxW = 800;
      const w = tempImg.naturalWidth || maxW;
      const h = tempImg.naturalHeight || 600;
      const scale = Math.min(1, maxW / w);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      const ctx = canvas.getContext('2d');
      if (!ctx) { URL.revokeObjectURL(objectUrl); return; }
      ctx.drawImage(tempImg, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const dataUri = canvas.toDataURL('image/jpeg', 0.8);
      const img = document.createElement('img');
      img.src = dataUri;
      img.className = 'img-left img-sm';
      img.style.cssText = 'float:left; display:block; width:150px; height:auto; margin:8px 16px 8px 0;';
      this.insertImgAtRange(img, rangeAtUpload);
    };
    tempImg.onerror = () => URL.revokeObjectURL(objectUrl);
    tempImg.src = objectUrl;
  }

  private insertImgAtRange(img: HTMLImageElement, range: Range | null) {
    if (range && this.editor.nativeElement.contains(range.startContainer)) {
      let node: Node | null = range.startContainer;
      if (node.nodeType === Node.TEXT_NODE) node = node.parentElement;
      const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
      let block: HTMLElement | null = node as HTMLElement;
      while (block && block !== this.editor.nativeElement && !blockTags.includes(block.tagName?.toUpperCase() ?? '')) {
        block = block.parentElement;
      }
      if (block && block !== this.editor.nativeElement) {
        const splitRange = document.createRange();
        splitRange.setStart(range.startContainer, range.startOffset);
        splitRange.setEnd(block, block.childNodes.length);
        const afterFrag = splitRange.extractContents();
        const afterBlock = document.createElement(block.tagName.toLowerCase());
        afterBlock.appendChild(afterFrag);
        if (!afterBlock.textContent?.trim()) afterBlock.innerHTML = '<br>';
        if (!block.textContent?.trim()) block.innerHTML = '<br>';
        block.parentNode!.insertBefore(img, block.nextSibling);
        block.parentNode!.insertBefore(afterBlock, img.nextSibling);
        this.updateContent();
        return;
      }

      // kurzor je na top-leveli (nie v bloku) — vlož na miesto kurzora
      const r = range.cloneRange();
      r.collapse(true);
      r.insertNode(img);
      const p = document.createElement('p');
      p.innerHTML = '<br>';
      img.parentNode?.insertBefore(p, img.nextSibling);
      this.updateContent();
      return;
    }
    // fallback — keď range je null
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    this.editor.nativeElement.appendChild(img);
    this.editor.nativeElement.appendChild(p);
    this.updateContent();
  }

  validateHtml() {
    const issues: string[] = [];
    const highlights: string[] = [];
    const el = this.editor.nativeElement;

    // Prázdne elementy
    el.querySelectorAll('p,div,h1,h2,h3,h4,h5,h6,span,b,i,u,li,a').forEach(node => {
      if (!node.textContent?.trim() && node.children.length === 0) {
        issues.push(`Prázdny element <${node.tagName.toLowerCase()}>`);
        highlights.push((node as HTMLElement).outerHTML);
      }
    });

    // Osamotené <li> mimo zoznamu
    el.querySelectorAll('li').forEach(li => {
      if (!['UL','OL'].includes(li.parentElement?.tagName ?? '')) {
        issues.push('Osamotený <li> mimo <ul>/<ol>');
        highlights.push(li.outerHTML);
      }
    });


    // Každý výskyt ako samostatná položka (aj opakujúce sa)
    const occurrenceCount: Record<string, number> = {};
    this.validationItems = highlights.map((h, i) => {
      occurrenceCount[h] = (occurrenceCount[h] ?? 0) + 1;
      return { label: issues[i], search: h, occurrence: occurrenceCount[h] };
    });

    // Nezatvorené tagy — iba informácia, nedá sa spoľahlivo lokalizovať
    this.validationMessages = [];
    const unclosed = this.findUnclosedTags(this.content);
    const unclosedGroups: Record<string, number> = {};
    unclosed.forEach(u => unclosedGroups[u.tag] = (unclosedGroups[u.tag] ?? 0) + 1);
    Object.entries(unclosedGroups).forEach(([tag, count]) => {
      this.validationMessages.push(`Tag <${tag}> nemá pár${count > 1 ? ` (${count}×)` : ''}`);
    });

    this.validationIssues = this.validationItems.map(i => i.label);
    this.showValidation = true;
    this.cdr.detectChanges();
  }

  private findUnclosedTags(html: string): { tag: string; exactHtml: string }[] {
    const voidTags = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
    const stack: { tag: string; exactHtml: string }[] = [];
    const regex = /<\/?([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      const full = match[0];
      const tag = match[1].toLowerCase();
      if (voidTags.has(tag) || full.endsWith('/>')) continue;
      if (full.startsWith('</')) {
        for (let i = stack.length - 1; i >= 0; i--) {
          if (stack[i].tag === tag) { stack.splice(i, 1); break; }
        }
      } else {
        stack.push({ tag, exactHtml: full });
      }
    }
    return stack;
  }

  selectIssueInTextarea(search: string, occurrence: number) {
    const ta = this.htmlArea?.nativeElement;
    if (!ta) return;
    let idx = -1;
    let searchFrom = 0;
    for (let i = 0; i < occurrence; i++) {
      idx = ta.value.indexOf(search, searchFrom);
      if (idx < 0) return;
      searchFrom = idx + 1;
    }
    ta.focus();
    ta.setSelectionRange(idx, idx + search.length);
    ta.scrollTop = (idx / Math.max(1, ta.value.length)) * ta.scrollHeight;
  }



  onHtmlEdit(event: Event) {
    const html = (event.target as HTMLTextAreaElement).value;
    this.content = html;
    this.editor.nativeElement.innerHTML = html;
    this.contentService.setContent(html);
    if (this.showValidation) this.validateHtml();
  }

  onPaste(event: ClipboardEvent) {
    const html = event.clipboardData?.getData('text/html');
    if (!html) return;

    event.preventDefault();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const keepAttrs: Record<string, string[]> = {
      A:   ['href', 'target', 'rel'],
      IMG: ['src', 'alt', 'class', 'style'],
    };

    // Odstráň všetky atribúty (triedy, štýly, data-*...), zachovaj len nevyhnutné
    doc.body.querySelectorAll('*').forEach(el => {
      const allowed = keepAttrs[el.tagName] ?? [];
      Array.from(el.attributes).forEach(attr => {
        if (!allowed.includes(attr.name)) el.removeAttribute(attr.name);
      });
    });

    // Vytiahni <ul>/<ol> von z <p>
    doc.body.querySelectorAll('p > ul, p > ol').forEach(list => {
      const parent = list.parentElement!;
      parent.insertAdjacentElement('afterend', list);
      if (!parent.textContent?.trim()) parent.remove();
    });

    // Odstráň <script> a <style> elementy
    doc.body.querySelectorAll('script, style').forEach(el => el.remove());

    // Odstráň prázdne párové elementy (napr. <p></p>, <div></div>)
    doc.body.querySelectorAll('*:not(br):not(img):not(input):not(hr)').forEach(el => {
      if (!el.textContent?.trim() && el.children.length === 0) el.remove();
    });

    this.insertHtmlAtCaret(doc.body.innerHTML);
  }


  onEditorClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      if (this.selectedImage) this.selectedImage.classList.remove('selected-img');
      this.selectedImage = target as HTMLImageElement;
      this.selectedImage.classList.add('selected-img');
      this.loadCurrentImageStyles();
      this.cdr.detectChanges();
      this.updateToolbarPosition();
      this.cdr.detectChanges();
    } else {
      this.selectedImage = null;
      this.cdr.detectChanges();
    }
  }

  private updateToolbarPosition() {
    if (!this.selectedImage) return;
    const rect = this.selectedImage.getBoundingClientRect();
    const toolbarH = 160;
    const toolbarW = 310;
    let top: number;
    let left: number;
    if (rect.width === 0 || rect.height === 0) {
      top = Math.max(60, window.innerHeight / 2 - toolbarH / 2);
      left = Math.max(8, window.innerWidth / 2 - toolbarW / 2);
    } else {
      top = rect.top > toolbarH + 16 ? rect.top - toolbarH - 8 : rect.bottom + 8;
      left = Math.max(8, Math.min(rect.left, window.innerWidth - toolbarW - 8));
    }
    this.imageToolbarPos = { top: `${top}px`, left: `${left}px` };
  }

  loadCurrentImageStyles() {
    if (this.selectedImage) {
      const style = this.selectedImage.style;
      this.imageRadiusPx = parseInt(style.borderRadius) || 0;
      const cl = this.selectedImage.classList;
      this.imageStyles.float = cl.contains('img-left') ? 'left'
        : cl.contains('img-right') ? 'right' : 'none';
      this.imageSize = cl.contains('img-sm') ? 'img-sm'
        : cl.contains('img-lg') ? 'img-lg'
        : cl.contains('img-full') ? 'img-full' : 'img-md';
    }
  }

  setSize(size: string) {
    this.imageSize = size;
    this.applyImageStyles();
  }

  onRadiusSlider() {
    this.imageStyles.borderRadius = `${this.imageRadiusPx}px`;
    this.applyImageStyles();
  }

  setFloat(value: string) {
    this.imageStyles.float = value;
    this.applyImageStyles();
  }

  applyImageStyles() {
    if (!this.selectedImage) return;

    const sizeMap: { [k: string]: string } = {
      'img-sm': '150px', 'img-md': '300px', 'img-lg': '500px', 'img-full': '100%'
    };

    this.selectedImage.classList.remove('img-sm', 'img-md', 'img-lg', 'img-full');
    this.selectedImage.classList.add(this.imageSize);
    this.selectedImage.style.width = sizeMap[this.imageSize] ?? '150px';
    this.selectedImage.style.maxWidth = '100%';
    this.selectedImage.style.height = 'auto';
    this.selectedImage.style.borderRadius = `${this.imageRadiusPx}px`;

    this.selectedImage.classList.remove('img-left', 'img-right', 'img-block');
    if (this.imageStyles.float === 'left') {
      this.selectedImage.classList.add('img-left');
      this.selectedImage.style.float = 'left';
      this.selectedImage.style.display = 'block';
      this.selectedImage.style.margin = '8px 16px 8px 0';
    } else if (this.imageStyles.float === 'right') {
      this.selectedImage.classList.add('img-right');
      this.selectedImage.style.float = 'right';
      this.selectedImage.style.display = 'block';
      this.selectedImage.style.margin = '8px 0 8px 16px';
    } else {
      this.selectedImage.classList.add('img-block');
      this.selectedImage.style.float = '';
      this.selectedImage.style.display = 'block';
      this.selectedImage.style.margin = '10px auto';
    }

    this.updateContent();
    requestAnimationFrame(() => this.updateToolbarPosition());
  }

  deselectImage() {
    if (this.selectedImage) this.selectedImage.classList.remove('selected-img');
    this.selectedImage = null;
  }
}
