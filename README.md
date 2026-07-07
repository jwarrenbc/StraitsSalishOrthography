# North Straits Salish Orthography Translator

A lightweight, modern, and minimal translation utility for converting text between different orthographies of North Straits Salish.

**Live Web Application**: [https://jwarrenbc.github.io/StraitsSalishOrthography/](https://jwarrenbc.github.io/StraitsSalishOrthography/)

This repository is split into two parts:
1. **Core Translation Library (`lib/`)**: A platform-independent JavaScript library.
2. **Web Application (`web/` & `index.html`)**: A responsive web interface built on top of the core library.

---

## Supported Orthographies

The tool supports translations across the following five orthographies defined in `lib/orthography_mapping.csv`:
- **SEN**: SENĆOŦEN
- **LEK-S**: Songhees Lək̓ʷəŋən
- **XWL**: Xwlemi Chosen (Lummi)
- **XWS**: Xws7ameshqen (Samish)
- **LEK-X**: Xʷsepsəm Lək̓ʷəŋən (Esquimalt Lək̓ʷəŋən)

---

## Core Mapping Library (`lib/mapper.js`)

The `OrthographyMapper` is a platform-independent JavaScript class that does not rely on any node or browser-specific features. It can be imported and executed anywhere JavaScript runs.

It performs translation in two stages:
1. **Greedy Character Mapping**: Matches longest substrings first from `lib/orthography_mapping.csv` to map characters between orthographies (handling case rules, multi-graphs, and punctuation).
2. **Word-Boundary Glottal Stop Rules**: Tokenizes the output text to add or remove leading glottal stops for words starting with vowels according to their rules (using configurations defined in `lib/vowels.csv`).

### Vowels & Glottals Configuration (`lib/vowels.csv`)
Configured to handle distinct phonetics per orthography:
- **LEK-S / LEK-X**: Initial glottals are written explicitly (e.g. `ʔiɬən`) except for `ə` as a whole word.
- **SEN / XWL / XWS**: Initial glottals are implicit and not written (e.g. `IȽEN`) except for the word `ʔə` (SEN: `¸E`, XWL: `ʼu`, XWS: `7u`).

---

## Integrating `mapper.js` in Another Project

To use the mapping engine in your own project, copy `lib/mapper.js`, `lib/orthography_mapping.csv`, and `lib/vowels.csv` into your codebase.

### 1. In Node.js

```javascript
const fs = require('fs');
const path = require('path');
const OrthographyMapper = require('./lib/mapper');

// Read the CSV data from disk
const csvText = fs.readFileSync(path.join(__dirname, 'lib/orthography_mapping.csv'), 'utf8');
const vowelsCsvText = fs.readFileSync(path.join(__dirname, 'lib/vowels.csv'), 'utf8');

// Initialize the mapper
const mapper = new OrthographyMapper(csvText, vowelsCsvText);

// Translate text
const input = "IȽEN E SW̱ ¸E TŦE SĆÁÁNEW̱?";
const output = mapper.translate("SEN", "LEK-X", input);

console.log(output);
// Output: "ʔiɬən ə sxʷ ʔə cə sčeenəxʷ?"
```

### 2. In Browser JavaScript

```html
<!-- 1. Emulate CommonJS module export so mapper.js loads cleanly -->
<script>
  var module = { exports: {} };
</script>

<!-- 2. Import the mapper library -->
<script src="lib/mapper.js"></script>

<!-- 3. Load configurations and initialize -->
<script>
  const OrthographyMapper = module.exports;

  Promise.all([
    fetch('lib/orthography_mapping.csv').then(res => res.text()),
    fetch('lib/vowels.csv').then(res => res.text())
  ])
  .then(([csvText, vowelsCsvText]) => {
    const mapper = new OrthographyMapper(csvText, vowelsCsvText);
    
    const input = "IȽEN E SW̱ ¸E TŦE SĆÁÁNEW̱?";
    const output = mapper.translate("SEN", "LEK-X", input);
    console.log(output); // "ʔiɬən ə sxʷ ʔə cə sčeenəxʷ?"
  })
  .catch(err => console.error("Error loading translator:", err));
</script>
```

---

## Copyright and License

- **Copyright**: Copyright owned by the **Esquimalt Nation**.
- **License**: Licensed under the GNU Affero General Public License (AGPL-3.0). See the `LICENSE` file for the full license terms.
