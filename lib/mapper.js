class OrthographyMapper {
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

  // Map user-facing dropdown keys to CSV headers (e.g. LEK-K -> LEK-X)
  getCsvHeader(ortho) {
    if (ortho === 'LEK-K') return 'LEK-X';
    return ortho;
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

  // Main Translation Function
  translate(sourceOrtho, targetOrtho, text) {
    const srcHeader = this.getCsvHeader(sourceOrtho);
    const tgtHeader = this.getCsvHeader(targetOrtho);

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

    // Post-process sentence casing if mapping from LEK-S or SEN to mixed-case
    if ((srcHeader === 'LEK-S' || srcHeader === 'SEN') && (tgtHeader === 'XWL' || tgtHeader === 'XWS' || tgtHeader === 'LEK-X')) {
      result = this.applySentenceCase(result);
    }

    return result;
  }
}

module.exports = OrthographyMapper;
