# Návrhy na optimalizáciu

Zoradené podľa priority (vysoká → nízka).

---

## Vysoká priorita

### 1. Debug výstup v šablóne editora

**Súbor:** `src/app/editor/editor.component.html` — posledné 2 riadky

```html
<h3>Generated HTML:</h3>
<pre>{{ content }}</pre>
```

Zobrazuje surové HTML priamo v UI. V produkcii treba odstrániť alebo skryť za `*ngIf="isDevMode()"`.

---

### 2. Skutočný upload súboru obrázka

**Súbor:** `src/app/editor/editor.component.ts` → `uploadImage()`

Aktuálne správanie: odošle iba URL do json-servera, súbor sa fyzicky nikam nekopíruje. V produkcii treba použiť `FormData` a odoslať binárny súbor:

```typescript
const formData = new FormData();
formData.append('image', file);
this.http.post<{ imageUrl: string }>(this.apiEndpoint + '/upload', formData).subscribe(...)
```

API musí vrátiť `{ imageUrl: string }` s finálnou URL.

---

### ~~3. `HttpClientModule` → `provideHttpClient()`~~ ✅ Hotové

`provideHttpClient()` pridaný do `app.config.ts`.

---

### 4. Nepoužitá metóda `uploadImageEncoded`

**Súbor:** `src/app/editor/editor.component.ts` — riadok ~108

Metóda je definovaná ale šablóna volá `uploadImage()`. `uploadImageEncoded` (base64 approach) nie je nikde napojená. Buď pripojiť, alebo odstrániť.

---

## Stredná priorita

### 5. Obsah sa stráca pri obnovení stránky

**Súbor:** `src/app/editor-content.service.ts`

`EditorContentService` ukladá obsah iba v pamäti. Obnovenie stránky = strata obsahu. Riešenie — pridať `localStorage` persistenciu:

```typescript
setContent(newContent: string) {
  this.content = newContent;
  localStorage.setItem('editor-content', newContent);
}

getContent(): string {
  return this.content || localStorage.getItem('editor-content') || '';
}
```

---

### 6. OnPush change detection

**Súbory:** všetky komponenty

Pridanie `changeDetection: ChangeDetectionStrategy.OnPush` do všetkých komponentov znižuje počet zbytočných re-renderov, čo je dôležité najmä pri integrácii ako web component.

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  ...
})
```

`EditorComponent` už injektuje `ChangeDetectorRef`, takže zmena je priamočiara.

---

### 7. Debounce na `updateContent()`

**Súbor:** `src/app/editor/editor.component.ts`

`updateContent()` sa volá pri každom keystroke (udalosť `input`). Pri dlhom texte to môže byť pomalé. Riešenie s RxJS:

```typescript
private contentChange$ = new Subject<void>();

ngOnInit() {
  this.contentChange$.pipe(debounceTime(300)).subscribe(() => {
    this.content = this.editor.nativeElement.innerHTML;
    this.contentService.setContent(this.content);
  });
}

updateContent() {
  this.contentChange$.next();
}
```

---

### 8. Deprecated `::ng-deep`

**Súbory:** `editor.component.css`, `editor-preview-wrapper.component.css`

`::ng-deep` je deprecated. Použité `background-color: red` vyzerá ako testovací kód — pravdepodobne treba odstrániť celé bloky.

---

## Nízka priorita

### 9. Nepoužitá vlastnosť `isPreviewMode`

**Súbor:** `src/app/editor/editor.component.ts` — riadok ~33

`isPreviewMode: boolean` je deklarovaná v `EditorComponent` ale nikdy sa nenastavuje ani nepoužíva v šablóne. Prepínanie preview rieši `EditorPreviewWrapperComponent`. Odstrániť.

---

### 10. Unit testy

Spec súbory sú vygenerované ale prázdne. Minimálne testy ktoré by mali existovať:

- `EditorContentService` — `setContent` / `getContent`
- `PreviewComponent` — overenie že `content` input sa zobrazí
- `EditorComponent` — overenie `triggerPreview()` emituje event

---

### 11. Webpack bundle size

Aktuálny production budget je 500 kB warning / 1 MB error. Angular 19 s minimálnymi závislosťami by mal byť výrazne pod 500 kB. Spustiť `ng build --configuration production --stats-json` a skontrolovať `webpack-bundle-analyzer` pre prípadné nadbytočné závislosti.
