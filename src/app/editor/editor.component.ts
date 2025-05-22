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

  constructor(
    private http: HttpClient,
    private contentService: EditorContentService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    if (window.apiEndpoint) {
      this.apiEndpoint = window.apiEndpoint;
    } else {
      this.apiEndpoint = 'https://default-api-endpoint.com/api/save-content';
      console.warn('API endpoint not specified in CI app. Using default endpoint:', this.apiEndpoint);
    }
  }

  ngAfterViewInit() {
    this.content = this.contentService.getContent() || '<p>Start writing your article...</p>';
    this.editor.nativeElement.innerHTML = this.content;
    this.cdr.detectChanges();
  }

  format(command: string, value: string = '') {
    document.execCommand(command, false, value);
    this.updateContent();
  }

  clearFormatting() {
    document.execCommand('removeFormat');
    this.updateContent();
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
    console.log('Component triggered function triggerPreview');
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
        document.execCommand('insertHTML', false, imgTag);
        this.updateContent();
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

      this.http.post<{ id: number; imageUrl: string }>('http://localhost:3000/images', {
        imageUrl: `http://localhost:3000/uploads/images/${file.name}`
      }).subscribe({
        next: (response) => {
          const imgTag = `<img src="${response.imageUrl}" style="width: 75px; height: auto; display: inline-block; margin: 10px 0;" alt="Uploaded Image">`;
          document.execCommand('insertHTML', false, imgTag);
          this.updateContent();
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
