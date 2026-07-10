/**
 * OrthographyMapper is a platform-independent library to translate text between
 * different orthographies of North Straits Salish.
 * 
 * Copyright (c) 2026 Esquimalt Nation. Licensed under the GNU Affero General Public License (AGPL-3.0).
 */
class OrthographyMapper {
  /**
   * Initializes the mapper with CSV mapping table.
   * 
   * @param {string} csvText - The text content of the orthography mappings CSV.
   * @throws {Error} If CSV text is empty or invalid.
   */
  constructor(csvText) {
    if (!csvText) {
      throw new Error('CSV text is required to initialize OrthographyMapper');
    }
    this.parseCSV(csvText.normalize('NFC'));
    this.precompilePatterns();
  }

  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error('CSV text is empty');
    }
    
    const allHeaders = lines[0].split(',').map(h => h.trim());
    // The target orthographies are the ones excluding the metadata columns
    this.headers = allHeaders.filter(h => h !== 'IPA' && h !== 'NAPA' && h !== 'Type');
    
    this.mappings = [];
    this.vowelsConfig = {};
    
    for (const ortho of this.headers) {
      this.vowelsConfig[ortho] = { vowels: [], glottalStop: null };
    }

    const typeIndex = allHeaders.indexOf('Type');

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < allHeaders.length) continue;
      
      const row = {};
      for (let j = 0; j < allHeaders.length; j++) {
        row[allHeaders[j]] = cols[j];
      }
      this.mappings.push(row);

      // Build vowels and glottal stop config dynamically using the Type column
      if (typeIndex !== -1) {
        const type = cols[typeIndex].toLowerCase();
        if (type === 'vowel') {
          for (const ortho of this.headers) {
            if (row[ortho]) {
              this.vowelsConfig[ortho].vowels.push(row[ortho]);
            }
          }
        } else if (type === 'glottal') {
          for (const ortho of this.headers) {
            if (row[ortho] && !this.vowelsConfig[ortho].glottalStop) {
              this.vowelsConfig[ortho].glottalStop = row[ortho];
            }
          }
        }
      }
    }
  }

  isVowel(orthoName, char) {
    if (!char) return false;
    const config = this.vowelsConfig[orthoName];
    if (!config) return false;
    const lowerChar = char.toLowerCase();
    return config.vowels.some(v => v.toLowerCase() === lowerChar);
  }

  getGlottalStop(orthoName) {
    const config = this.vowelsConfig[orthoName];
    return config ? config.glottalStop : null;
  }

  postProcessGlottalStops(tgtHeader, text) {
    const glottal = this.getGlottalStop(tgtHeader);
    if (!glottal) return text;

    // Find the representation of schwa "ə" in target orthography from mappings
    const schwaRow = this.mappings.find(row => row['LEK-X'] === 'ə');
    const targetSchwa = schwaRow ? schwaRow[tgtHeader] : 'ə';
    const targetʔə = (glottal + targetSchwa).toLowerCase();

    // Tokenize text into words and non-words
    const tokens = text.split(/([ \t\n\r.,!?;:"()[\]{}]+)/);

    let capitalizeNext = true;

    const processed = tokens.map(token => {
      // If it's a spacer/punctuation token, leave it as is
      if (/^[ \t\n\r.,!?;:"()[\]{}]+$/.test(token) || token === '') {
        if (/[.!?\n]/.test(token)) {
          capitalizeNext = true;
        }
        return token;
      }

      // Check if target is LEK-S or LEK-X
      if (tgtHeader === 'LEK-S' || tgtHeader === 'LEK-X') {
        // If it starts with a vowel and is not exactly "ə", prepend glottal
        const firstChar = token[0];
        if (this.isVowel(tgtHeader, firstChar) && token.toLowerCase() !== targetSchwa.toLowerCase()) {
          capitalizeNext = false;
          return glottal + token;
        }
      } else {
        // Target is SEN, XWL, or XWS
        // If it starts with glottal followed by a vowel, and is not exactly "ʔə", remove leading glottal
        if (token.startsWith(glottal) && token.length > 1) {
          const secondChar = token[1];
          if (this.isVowel(tgtHeader, secondChar) && token.toLowerCase() !== targetʔə) {
            let stripped = token.slice(1);
            if (capitalizeNext && stripped.length > 0) {
              stripped = stripped[0].toUpperCase() + stripped.slice(1);
            }
            capitalizeNext = false;
            return stripped;
          }
        }
      }

      capitalizeNext = false;
      return token;
    });

    return processed.join('');
  }

  precompilePatterns() {
    this.patternsByOrtho = {};
    for (const ortho of this.headers) {
      const patterns = [];
      const seen = new Set();
      for (const row of this.mappings) {
        const pat = row[ortho];
        if (!pat) continue;
        const lowerPat = pat.toLowerCase();
        if (!seen.has(lowerPat)) {
          seen.add(lowerPat);
          patterns.push({
            original: pat,
            lower: lowerPat,
            row: row
          });
        }
      }
      // Sort by length of original pattern descending to ensure greedy matching
      patterns.sort((a, b) => b.original.length - a.original.length);
      this.patternsByOrtho[ortho] = patterns;
    }
  }


  // Helpers for casing
  getCasing(str) {
    if (str === str.toLowerCase()) return 'lower';
    if (str === str.toUpperCase()) return 'upper';
    const first = str.charAt(0);
    if (first === first.toUpperCase() && first !== first.toLowerCase()) {
      return 'capitalized';
    }
    return 'lower';
  }

  applyCasing(str, casing) {
    if (casing === 'lower') return str.toLowerCase();
    if (casing === 'upper') return str.toUpperCase();
    if (casing === 'capitalized') {
      if (str.length === 0) return '';
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    return str.toLowerCase();
  }

  applySentenceCase(text) {
    let result = '';
    let capitalizeNext = true;
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (capitalizeNext && /\p{L}/u.test(char)) {
        result += char.toUpperCase();
        capitalizeNext = false;
      } else {
        result += char;
        if (/[.!?\n]/.test(char)) {
          capitalizeNext = true;
        }
      }
    }
    return result;
  }

  /**
   * Translates text from a source orthography to a target orthography.
   * 
   * @param {string} sourceOrtho - The source orthography code (e.g. 'SEN', 'LEK-S', 'XWL', 'XWS', 'LEK-X').
   * @param {string} targetOrtho - The target orthography code (e.g. 'SEN', 'LEK-S', 'XWL', 'XWS', 'LEK-X').
   * @param {string} text - The input text to translate.
   * @returns {string} The translated text.
   * @throws {Error} If source or target orthography code is invalid or not found in the initialized CSV.
   */
  translate(sourceOrtho, targetOrtho, text) {
    const srcHeader = sourceOrtho;
    const tgtHeader = targetOrtho;

    if (!this.headers.includes(srcHeader) || !this.headers.includes(tgtHeader)) {
      throw new Error(`Invalid orthography name: source='${sourceOrtho}', target='${targetOrtho}'`);
    }

    if (text === null || text === undefined || text === '') {
      return '';
    }

    // Normalize input Unicode NFC
    let normalizedText = String(text).normalize('NFC');

    // Issue #3: Treat different apostrophe symbols the same by converting them to straight quote
    normalizedText = normalizedText.replace(/[’ʼ‘]/g, "'");

    // Issue #2: Strip acute accents from vowels if source orthography uses them only for emphasis
    if (srcHeader === 'LEK-S' || srcHeader === 'LEK-X' || srcHeader === 'XWS') {
      normalizedText = normalizedText.normalize('NFD')
        .replace(/([aeiouəAEIOUƏ])\u0301/g, '$1')
        .normalize('NFC');
    }

    const patterns = this.patternsByOrtho[srcHeader] || [];

    let result = '';
    let i = 0;

    while (i < normalizedText.length) {
      let matched = false;

      for (const pat of patterns) {
        const len = pat.original.length;
        if (i + len <= normalizedText.length) {
          const candidate = normalizedText.substr(i, len);
          if (candidate.toLowerCase() === pat.lower) {
            const rawTarget = pat.row[tgtHeader];
            let mappedVal = rawTarget;

            // Casing logic
            if (tgtHeader === 'LEK-S') {
              mappedVal = rawTarget.toLowerCase();
            } else if (tgtHeader === 'SEN') {
              mappedVal = rawTarget.toUpperCase();
            } else if (srcHeader === 'LEK-S' || srcHeader === 'SEN') {
              mappedVal = rawTarget.toLowerCase();
            } else {
              mappedVal = this.applyCasing(rawTarget, this.getCasing(candidate));
            }

            result += mappedVal;
            i += len;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        result += normalizedText[i];
        i++;
      }
    }

    // Apply word-boundary glottal stop rules
    result = this.postProcessGlottalStops(tgtHeader, result);

    // Post-process sentence casing if mapping from LEK-S or SEN to mixed-case
    if ((srcHeader === 'LEK-S' || srcHeader === 'SEN') && (tgtHeader === 'XWL' || tgtHeader === 'XWS' || tgtHeader === 'LEK-X')) {
      result = this.applySentenceCase(result);
    }

    return result;
  }
}

module.exports = OrthographyMapper;
