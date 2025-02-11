// Extend the global Window interface to include apiEndpoint
declare global {
  interface Window {
    apiEndpoint?: string;  // Now TypeScript knows this property exists
  }
}

import { Component, ElementRef, ViewChild, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { EditorContentService } from '../editor-content.service';  // Import the shared service


@Component({
  selector: 'app-editor',
  standalone: true,
  imports: [FormsModule, CommonModule, HttpClientModule, RouterModule],
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent {
  content: string = '';

  // Reference to the editor div
  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDivElement>;

  // Fix: Reference to the hidden file input for image upload
  @ViewChild('imageInput', { static: false }) imageInput!: ElementRef<HTMLInputElement>;

  apiEndpoint: string = '';  // Initialize as empty, will be set in ngOnInit()

  constructor(private http: HttpClient, private router: Router, private contentService: EditorContentService) {}

  ngOnInit() {
    // Check if the API endpoint is provided via the global window object
    if (window && window['apiEndpoint']) {
      this.apiEndpoint = window['apiEndpoint'];
    } else {
      // Fallback to default API endpoint if none provided
      this.apiEndpoint = 'https://default-api-endpoint.com/api/save-content';
      console.warn('API endpoint not specified in CI app. Using default endpoint:', this.apiEndpoint);
    }

    // Load existing content when navigating back to the editor
    this.content = this.contentService.getContent() || '<p>Start writing your article...</p>';
    this.editor.nativeElement.innerHTML = this.content;
  }

  // Formatting functions
  format(command: string, value: string = '') {
    document.execCommand(command, false, value);
    this.updateContent();
  }

  clearFormatting() {
    document.execCommand('removeFormat');
    this.updateContent();
  }

  // Update content in real-time
  updateContent() {
    this.content = this.editor.nativeElement.innerHTML;
    this.contentService.setContent(this.content);  // Save content in service
  }

  // Submit the content to the server
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

  // Navigate to Preview Page with the content
  goToPreview() {
    this.updateContent();
    console.log('Content being sent to preview:', this.content);  // Check if image styles are present
    this.contentService.setContent(this.content);
    this.router.navigate(['/preview']);
  }



  // Trigger the hidden file input to upload an image
  triggerImageUpload() {
    this.imageInput.nativeElement.click();  // Now correctly references the image input
  }

  // Handle image upload and insert into the editor
  uploadImageEncoded(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = (e: ProgressEvent<FileReader>) => {
        const imgSrc = e.target?.result as string;

        // Insert the uploaded image at the cursor position
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

      // Simulate uploading the image by adding an entry to json-server
      this.http.post<{ id: number, imageUrl: string }>('http://localhost:3000/images', {
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

  // Image Styling Logic
  selectedImage: HTMLImageElement | null = null;
  imageStyles = {
    width: '75px',
    height: 'auto',
    borderRadius: '0px',
    float: 'none'
  };

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
