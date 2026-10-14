import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorComponent } from './editor.component';

describe('EditorComponent', () => {
  let component: EditorComponent;
  let fixture: ComponentFixture<EditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('selected-img', () => {
    let img: HTMLImageElement;

    beforeEach(() => {
      component.editor.nativeElement.innerHTML = '<p>text</p><img class="img-left img-sm" src="x.jpg">';
      img = component.editor.nativeElement.querySelector('img')!;
      component.onEditorClick({ target: img } as unknown as MouseEvent);
    });

    it('is not serialized into content while the image is selected', () => {
      component.setFloat('right');
      expect(img.classList).toContain('selected-img');
      expect(component.content).not.toContain('selected-img');
    });

    it('is removed when clicking outside the image', () => {
      const p = component.editor.nativeElement.querySelector('p')!;
      component.onEditorClick({ target: p } as unknown as MouseEvent);
      expect(component.selectedImage).toBeNull();
      expect(img.classList).not.toContain('selected-img');
    });
  });
});
