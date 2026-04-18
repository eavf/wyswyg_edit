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
  Output,
  EventEmitter,
  ChangeDetectorRef
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
  content: string = '';
  apiEndpoint: string = '';
  isPreviewMode: boolean = false;

  @ViewChild('editor', { static: false }) editor!: ElementRef<HTMLDivElement>;
  @ViewChild('imageInput', { static: false }) imageInput!: ElementRef<HTMLInputElement>;
  @Output() goToPreview = new EventEmitter<void>();

  selectedImage: HTMLImageElement | null = null;
  imageStyles = {
    width: '75px',
    height: 'auto',
    borderRadius: '0px',
    float: 'none'
  };

  private savedRange: Range | null = null;

  constructor(
    private http: HttpClient,
    private contentService: EditorContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (window.apiEndpoint) {
      this.apiEndpoint = window.apiEndpoint;
    } else {
      console.warn('API endpoint not specified. Set window.apiEndpoint before using the editor.');
    }
  }

  ngAfterViewInit() {
    this.content = this.contentService.getContent() || '<p>Start writing your article...</p>';
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
    const ul = document.createElement('ul');
    const selectedText = range.toString();
    const lines = selectedText ? selectedText.split('\n') : [''];
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line || '';
      ul.appendChild(li);
    });

    range.deleteContents();
    range.insertNode(ul);

    const newRange = document.createRange();
    newRange.setStartAfter(ul);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);
    this.updateContent();
  }

  private removeAllFormatting() {
    this.restoreSelection();
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return;

    const range = selection.getRangeAt(0);
    const text = document.createTextNode(range.toString());
    range.deleteContents();
    range.insertNode(text);

    const newRange = document.createRange();
    newRange.selectNode(text);
    selection.removeAllRanges();
    selection.addRange(newRange);
    this.updateContent();
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
    if (!this.apiEndpoint) {
      alert('API endpoint is not specified!');
      return;
    }

    const payload = { content: this.content };

    this.http.post(this.apiEndpoint, payload).subscribe({
      next: (response) => {
        alert('Content submitted successfully!');
        console.log('Server response:', response);
      },
      error: (error) => {
        alert('Error submitting content.');
        console.error('Submission error:', error);
      }
    });
  }

  triggerPreview() {
    this.updateContent();
    this.goToPreview.emit();
  }

  triggerImageUpload() {
    this.imageInput.nativeElement.click();
  }

  uploadImageEncoded(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const imgSrc = e.target?.result as string;
        const imgTag = `<img src="${imgSrc}" style="width: 75px; height: auto; display: inline-block; margin: 10px 0;" alt="Uploaded Image">`;
        this.insertHtmlAtCaret(imgTag);
      };

      reader.readAsDataURL(file);
    }
  }

  uploadImage(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append('image', file);

      this.http.post<{ imageUrl: string }>('https://vovo.eavf.eu/upload/image', formData).subscribe({
        next: (response) => {
          const imgTag = `<img src="${response.imageUrl}" style="width: 75px; height: auto; display: inline-block; margin: 10px 0;" alt="Uploaded Image">`;
          this.insertHtmlAtCaret(imgTag);
        },
        error: (error) => {
          alert('Error uploading image.');
          console.error('Image upload error:', error);
        }
      });
    }
  }

  onEditorClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'img') {
      this.selectedImage = target as HTMLImageElement;
      this.loadCurrentImageStyles();
    } else {
      this.selectedImage = null;
    }
  }

  loadCurrentImageStyles() {
    if (this.selectedImage) {
      const style = this.selectedImage.style;
      this.imageStyles.width = style.width || '75px';
      this.imageStyles.height = style.height || 'auto';
      this.imageStyles.borderRadius = style.borderRadius || '0px';
      this.imageStyles.float = style.float || 'none';
    }
  }

  applyImageStyles() {
    if (this.selectedImage) {
      this.selectedImage.style.width = this.imageStyles.width;
      this.selectedImage.style.height = this.imageStyles.height;
      this.selectedImage.style.borderRadius = this.imageStyles.borderRadius;

      if (this.imageStyles.float === 'left' || this.imageStyles.float === 'right') {
        this.selectedImage.style.float = this.imageStyles.float;
        this.selectedImage.style.display = 'inline';
        this.selectedImage.style.margin = '10px';
      } else {
        this.selectedImage.style.float = 'none';
        this.selectedImage.style.display = 'block';
        this.selectedImage.style.margin = '10px auto';
      }

      this.updateContent();
    }
  }

  deselectImage() {
    this.selectedImage = null;
  }
}
