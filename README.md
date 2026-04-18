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
| `insertHtmlAtCaret(html)` | Vloží HTML (napr. `<img>`) na pozíciu kurzora |
| `saveSelection()` / `restoreSelection()` | Zachová výber keď toolbar ukradne focus |

### Konfigurácia API endpointu

Editor číta API endpoint z globálnej premennej pred bootstrapom:

```javascript
window.apiEndpoint = 'https://your-api.com/api/save-content';
```

Ak nie je nastavená, `Submit` tlačidlo zobrazí alert a nič neodošle.

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
- Povolené tagy: `<b>`, `<i>`, `<u>`, `<h1>`, `<h2>`, `<p>`, `<ul>`, `<li>`, `<img>` a ďalšie bezpečné HTML elementy

---

## Testovanie

```bash
ng test
```

Unit testy bežia v Karma + Jasmine. Aktuálne sú vygenerované základné spec súbory.
