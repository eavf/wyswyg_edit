import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditorPreviewWrapperComponent } from './editor-preview-wrapper.component';

describe('EditorPreviewWrapperComponent', () => {
  let component: EditorPreviewWrapperComponent;
  let fixture: ComponentFixture<EditorPreviewWrapperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditorPreviewWrapperComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditorPreviewWrapperComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
