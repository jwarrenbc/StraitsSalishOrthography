const fs = require('fs');
const path = require('path');

// Read and parse CSV relative to this file
const csvPath = path.join(__dirname, 'orthography_mapping.csv');
const csvText = fs.readFileSync(csvPath, 'utf8').normalize('NFC');

const lines = csvText.trim().split(/\r?\n/).map(line => line.trim()).filter(Boolean);
const headers = lines[0].split(',').map(h => h.trim());

const mappings = [];
for (let i = 1; i < lines.length; i++) {
  const cols = lines[i].split(',').map(c => c.trim());
  if (cols.length < headers.length) continue;
  const row = {};
  for (let j = 0; j < headers.length; j++) {
    row[headers[j]] = cols[j];
  }
  mappings.push(row);
}

// Precompile greedy pattern lists for each orthography
const patternsByOrtho = {};
for (const ortho of headers) {
  const patterns = [];
  const seen = new Set();
  for (const row of mappings) {
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
  patternsByOrtho[ortho] = patterns;
}

// Helpers for casing
function getCasing(str) {
  if (str === str.toLowerCase()) return 'lower';
  if (str === str.toUpperCase()) return 'upper';
  const first = str.charAt(0);
  if (first === first.toUpperCase() && first !== first.toLowerCase()) {
    return 'capitalized';
  }
  return 'lower';
}

function applyCasing(str, casing) {
  if (casing === 'lower') return str.toLowerCase();
  if (casing === 'upper') return str.toUpperCase();
  if (casing === 'capitalized') {
    if (str.length === 0) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
  return str.toLowerCase();
}

function applySentenceCase(text) {
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
function mapOrthography(sourceOrtho, targetOrtho, text) {
  if (!headers.includes(sourceOrtho) || !headers.includes(targetOrtho)) {
    throw new Error(`Invalid orthography name: source='${sourceOrtho}', target='${targetOrtho}'`);
  }

  if (text === null || text === undefined) {
    return '';
  }

  // Normalize input Unicode NFC
  const normalizedText = String(text).normalize('NFC');
  const patterns = patternsByOrtho[sourceOrtho] || [];

  let result = '';
  let i = 0;

  while (i < normalizedText.length) {
    let matched = false;

    for (const pat of patterns) {
      const len = pat.original.length;
      if (i + len <= normalizedText.length) {
        const candidate = normalizedText.substr(i, len);
        if (candidate.toLowerCase() === pat.lower) {
          const rawTarget = pat.row[targetOrtho];
          let mappedVal = rawTarget;

          // Casing logic
          if (targetOrtho === 'LEK-S') {
            mappedVal = rawTarget.toLowerCase();
          } else if (targetOrtho === 'SEN') {
            mappedVal = rawTarget.toUpperCase();
          } else {
            // Target is mixed-case: XWL, XWS, or LEK-X
            if (sourceOrtho === 'LEK-S' || sourceOrtho === 'SEN') {
              // Casing is handled via sentence casing post-process
              mappedVal = rawTarget.toLowerCase();
            } else {
              // Maintain case from mixed-case source
              const casing = getCasing(candidate);
              mappedVal = applyCasing(rawTarget, casing);
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
  if ((sourceOrtho === 'LEK-S' || sourceOrtho === 'SEN') && (targetOrtho === 'XWL' || targetOrtho === 'XWS' || targetOrtho === 'LEK-X')) {
    result = applySentenceCase(result);
  }

  return result;
}

module.exports = mapOrthography;
