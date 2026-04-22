# WYSIWYG Editor — Angular Web Component

WYSIWYG HTML editor postavený v Angular 19, distribuovaný ako **Web Component** (`<app-editor-preview-wrapper>`). Vkladá sa do ľubovoľnej stránky vrátane non-Angular projektov.

---

## Architektúra

```
AppComponent (iba dev mode)
└── EditorPreviewWrapperComponent  ← Web Component v produkcii
    ├── EditorComponent            ← editor + toolbar + image upload
    └── PreviewComponent           ← náhľad HTML obsahu
         EditorContentService      ← zdieľaný stav (singleton v scope wrappera)
```

**Dev mode** (`isDevMode() === true`): bootuje `AppComponent`, plná Angular app na `localhost:4200`.  
**Prod mode**: bootuje `EditorPreviewWrapperComponent` a registruje ho ako `customElements.define('app-editor-preview-wrapper', ...)`.

### Komponenty

| Komponent | Súbor | Popis |
|---|---|---|
| `EditorPreviewWrapperComponent` | `editor-preview-wrapper/` | Prepína medzi editor a preview režimom |
| `EditorComponent` | `editor/` | contenteditable editor, toolbar, image upload, image styling |
| `PreviewComponent` | `preview/` | Zobrazuje HTML obsah s Angular sanitizáciou |
| `EditorContentService` | `editor-content.service.ts` | In-memory zdieľanie obsahu medzi komponentmi |

### Formátovanie (Selection/Range API)

Editor nepoužíva deprecated `document.execCommand`. Implementované metódy:

| Metóda | Popis |
|---|---|
| `toggleInlineStyle(tag)` | Wrap/unwrap `<b>`, `<i>`, `<u>` okolo výberu |
| `setBlockFormat(tag)` | Zmení blokový element (p, h1, h2) pod kurzorom |
| `insertUnorderedList()` | Vytvorí `<ul><li>` zo selektovaného textu |
| `removeAllFormatting()` | Nahradí výber čistým textom |
| `insertLink()` | Vloží `<a href>` okolo výberu; ak je kurzor v odkaze, ponúkne úpravu alebo zmazanie |
| `saveSelection()` / `restoreSelection()` | Zachová výber keď toolbar ukradne focus |
| `insertImgAtRange(img, range)` | Vloží obrázok na pozíciu kurzora — rozdelí paragraph |

### Image Upload

Obrázky sa vkladajú ako base64 data URI (bez servera):

1. Súbor sa načíta cez `URL.createObjectURL`
2. Canvas zmenší obrázok na max **800px** šírky, JPEG kvalita 80 %
3. Výsledný `data:image/jpeg;base64,...` sa vloží do DOM na pozíciu kurzora
4. Paragraph sa rozdelí — obrázok je **súrodenec** `<p>` elementov, nie vnorený

**Počiatočná veľkosť:** `width:auto; max-width:150px` — malé obrázky sa nenaťahujú, veľké sa obmedzia.

### Image Toolbar

Po kliknutí na obrázok v editore sa zobrazí floating panel:

| Ovládač | Popis |
|---|---|
| Obtekanie | Blok (centrovane) / Vľavo (float left) / Vpravo (float right) |
| Veľkosť | S=150px, M=300px, L=500px, Full=100% šírky editora |
| Zaoblenie | Slider 0–50px pre `border-radius` |

### CSS architektúra — dôležité

- **`styles.css` (globálny)** obsahuje `.editor img` a `.img-*` triedy — component CSS nefunguje na dynamicky vložený obsah cez contenteditable (Angular `_ngcontent` scoping)
- **`:host { display: block }`** na oboch komponentoch — Web Components majú defaultne `display: inline`, čo spôsobuje nafúknutie šírky v modálnych oknách
- **`.editor`** má `white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word` — zabraňuje horizontálnemu roztiahnutiu na dlhých riadkoch
- **`pre`** má `max-width: 100%; white-space: pre-wrap` — rovnaká ochrana pre code bloky
- **Preview** používa CSS triedy (inline štýly sú stripované Angular sanitizerom), preto musia byť hodnoty v `styles.css` synchronizované s hodnotami v `applyImageStyles()`

### Submit — integrácia s backendom

Pri stlačení **Submit** editor:
1. Nájde všetky `<img src="data:...">` v obsahu
2. Nahradí ich placeholdermi `__img_0__`, `__img_1__`...
3. Odošle `multipart/form-data` s poľom `content` a súbormi `image_0.jpg`, `image_1.jpg`...
4. Vždy dispatchne `editor-submit` event na `window`

Backend dostane:
```
content   →  "<p>text</p><img src="__img_0__"><p>ďalší text</p>"
image_0   →  [binary JPEG]
image_1   →  [binary JPEG]
```

#### Možnosť A — HTML atribút (editor pošle sám)

```html
<app-editor-preview-wrapper api-url="/api/save-post"></app-editor-preview-wrapper>
```

Editor pošle `multipart/form-data` POST priamo na zadanú URL.

#### Možnosť B — Custom DOM event (blog spracuje sám)

```html
<app-editor-preview-wrapper></app-editor-preview-wrapper>
<script>
window.addEventListener('editor-submit', (e) => {
  fetch('/api/save-post', { method: 'POST', body: e.detail.formData });
});
</script>
```

> Obe možnosti je možné kombinovať. `editor-submit` event sa dispatchne vždy, aj keď je nastavený `api-url`.

#### Fallback — window.apiEndpoint (spätná kompatibilita)

```javascript
window.apiEndpoint = 'https://your-api.com/api/save-post';
```

Ak nie je nastavený `api-url` atribút, editor použije `window.apiEndpoint`.

#### Príklad Python (Flask)

```python
@app.route('/api/save-post', methods=['POST'])
def save_post():
    content = request.form['content']       # HTML s __img_N__ placeholdermi
    image_urls = {}

    for key in request.files:               # image_0, image_1, ...
        img_file = request.files[key]
        index = key.split('_')[1]
        path = f'/var/www/blog/images/{img_file.filename}'
        img_file.save(path)
        image_urls[f'__img_{index}__'] = f'/images/{img_file.filename}'

    for placeholder, url in image_urls.items():
        content = content.replace(placeholder, url)

    # content teraz obsahuje reálne URL namiesto placeholderov
    db.save_post(content)
    return jsonify({'status': 'ok'})
```

---

## Lokálny vývoj

### Prerekvizity

- Node.js 18+
- Angular CLI 19: `npm install -g @angular/cli`
- json-server (pre testovanie image upload): `npm install -g json-server`

### Inštalácia

```bash
npm install
```

### Spustenie

```bash
# V jednom termináli — Angular dev server
ng serve
# → http://localhost:4200

# V druhom termináli — json-server pre image upload
json-server --watch db.json --port 3000
# → http://localhost:3000
```

> Image upload v dev mode posiela POST na `http://localhost:3000/images` a ukladá URL do `db.json`.

---

## Build a Deploy

### Build produkčného bundle

```bash
ng build --configuration production
```

Výstup: `dist/editor/`

```
dist/editor/
├── main.js          # hlavný bundle (editor + Angular runtime)
├── polyfills.js
└── styles.css
```

> `outputHashing` je vypnutý — názvy súborov sú stabilné pre jednoduchú integráciu.

### Vloženie do externej stránky

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="path/to/dist/editor/styles.css">
</head>
<body>

  <!-- Nastav API endpoint PRED načítaním skriptu -->
  <script>
    window.apiEndpoint = 'https://your-api.com/api/save-content';
  </script>

  <!-- Web Component tag -->
  <app-editor-preview-wrapper></app-editor-preview-wrapper>

  <!-- Bundle -->
  <script src="path/to/dist/editor/main.js"></script>

</body>
</html>
```

### Webpack namespace

`extra-webpack.config.js` nastavuje `chunkLoadingGlobal: 'webpackJsonpEditor'` — zabraňuje konfliktu s inými webpack bundlami na tej istej stránke.

### Produkčný checklist

- [ ] `window.apiEndpoint` nastavený pred načítaním skriptu
- [ ] API endpoint prijíma `POST` s telom `{ content: string }`
- [ ] CORS povolený na API pre doménu, kde je editor vložený
- [ ] `styles.css` načítaný (toolbar a editor štýly)
- [ ] json-server **nie** je nasadený v produkcii

---

## Bezpečnosť

- Preview renderuje HTML cez štandardný Angular `[innerHTML]` binding — Angular automaticky sanitizuje nebezpečné tagy (`<script>`, event handlery, `javascript:` URL)
- Povolené tagy: `<b>`, `<i>`, `<u>`, `<h1>`, `<h2>`, `<p>`, `<ul>`, `<li>`, `<img>`, `<a>` a ďalšie bezpečné HTML elementy

---

## Testovanie

```bash
ng test
```

Unit testy bežia v Karma + Jasmine. Aktuálne sú vygenerované základné spec súbory.
