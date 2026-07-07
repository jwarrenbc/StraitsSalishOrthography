/**
 * OrthographyMapper is a platform-independent library to translate text between
 * different orthographies of North Straits Salish.
 * 
 * Copyright (c) 2026 Esquimalt Nation. Licensed under the GNU Affero General Public License (AGPL-3.0).
 */
class OrthographyMapper {
  /**
   * Initializes the mapper with CSV mapping table and vowel configuration table.
   * 
   * @param {string} csvText - The text content of the orthography mappings CSV.
   * @param {string} vowelsCsvText - The text content of the vowels configuration CSV.
   * @throws {Error} If either input CSV text is empty or invalid.
   */
  constructor(csvText, vowelsCsvText) {
    if (!csvText) {
      throw new Error('CSV text is required to initialize OrthographyMapper');
    }
    if (!vowelsCsvText) {
      throw new Error('Vowels CSV text is required to initialize OrthographyMapper');
    }
    this.parseCSV(csvText.normalize('NFC'));
    this.parseVowelsCSV(vowelsCsvText.normalize('NFC'));
    this.precompilePatterns();
  }

  parseCSV(text) {
    const lines = text.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error('CSV text is empty');
    }
    
    this.headers = lines[0].split(',').map(h => h.trim());
    this.mappings = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < this.headers.length) continue;
      const row = {};
      for (let j = 0; j < this.headers.length; j++) {
        row[this.headers[j]] = cols[j];
      }
      this.mappings.push(row);
    }
  }

  parseVowelsCSV(text) {
    const lines = text.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (lines.length === 0) {
      throw new Error('Vowels CSV is empty');
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const orthoIndex = headers.indexOf('orthography');
    const vowelsIndex = headers.indexOf('vowels');
    const glottalIndex = headers.indexOf('glottal_stop');

    if (orthoIndex === -1 || vowelsIndex === -1 || glottalIndex === -1) {
      throw new Error('Vowels CSV is missing required headers (orthography, vowels, glottal_stop)');
    }

    this.vowelsConfig = {};

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      const cols = [];
      let current = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          cols.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      cols.push(current.trim());

      if (cols.length < headers.length) continue;

      const orthoName = cols[orthoIndex];
      const vowelsList = cols[vowelsIndex].split(',').map(v => v.trim()).filter(Boolean);
      const glottalStop = cols[glottalIndex];

      this.vowelsConfig[orthoName] = {
        vowels: vowelsList,
        glottalStop: glottalStop
      };
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

    const processed = tokens.map(token => {
      // If it's a spacer/punctuation token, leave it as is
      if (/^[ \t\n\r.,!?;:"()[\]{}]+$/.test(token) || token === '') {
        return token;
      }

      // Check if target is LEK-S or LEK-X
      if (tgtHeader === 'LEK-S' || tgtHeader === 'LEK-X') {
        // If it starts with a vowel and is not exactly "ə", prepend glottal
        const firstChar = token[0];
        if (this.isVowel(tgtHeader, firstChar) && token.toLowerCase() !== targetSchwa.toLowerCase()) {
          return glottal + token;
        }
      } else {
        // Target is SEN, XWL, or XWS
        // If it starts with glottal followed by a vowel, and is not exactly "ʔə", remove leading glottal
        if (token.startsWith(glottal) && token.length > 1) {
          const secondChar = token[1];
          if (this.isVowel(tgtHeader, secondChar) && token.toLowerCase() !== targetʔə) {
            return token.slice(1);
          }
        }
      }

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
    const normalizedText = String(text).normalize('NFC');
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
            } else {
              // Target is mixed-case: XWL, XWS, or LEK-X
              if (srcHeader === 'LEK-S' || srcHeader === 'SEN') {
                // Casing is handled via sentence casing post-process
                mappedVal = rawTarget.toLowerCase();
              } else {
                // Maintain case from mixed-case source
                const casing = this.getCasing(candidate);
                mappedVal = this.applyCasing(rawTarget, casing);
              }
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
