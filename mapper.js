class OrthographyMapper {
  constructor(mapping) {
    this.mapping = mapping;
    this.orthographies = ['SEN', 'XWL', 'XWS', 'LEK-X', 'LEK-S'];
    this.reverseIndexes = {};

    for (const orthography of this.orthographies) {
      this.reverseIndexes[orthography] = this.buildSourceIndex(orthography);
    }
  }

  buildSourceIndex(orthography) {
    const index = [];

    for (const [id, data] of Object.entries(this.mapping)) {
      if (orthography === 'LEK-S') {
        // LEK-S (Songhees) input is assumed to strictly use lowercase characters.
        this.addVariant(index, id, id, 'lower');
        continue;
      }

      if (orthography === 'SEN') {
        // SENCOTEN input is strictly in the SENCOTEN alphabet (no casing variations).
        this.addVariant(index, data.SEN, id, 'upper');
        continue;
      }

      // XWL, XWS, and LEK-X use explicit lower, title, and shouted variants.
      this.addVariant(index, data[orthography].lower, id, 'lower');
      this.addVariant(index, data[orthography].upper, id, 'upper');

      const shoutedVariant = data[orthography].upper.toUpperCase();
      if (shoutedVariant !== data[orthography].upper) {
        this.addVariant(index, shoutedVariant, id, 'upper');
      }
    }

    // Greedy matching: longest grapheme strings win.
    index.sort((a, b) => {
      const aLength = [...a.g].length;
      const bLength = [...b.g].length;
      if (bLength !== aLength) {
        return bLength - aLength;
      }
      return b.g.length - a.g.length;
    });

    return index;
  }

  addVariant(index, grapheme, id, caseType) {
    index.push({ g: grapheme, id, case: caseType });
  }

  tokenize(text, fromOrthography) {
    if (!this.reverseIndexes[fromOrthography]) {
      throw new Error(`Unknown source orthography: ${fromOrthography}`);
    }

    text = text.normalize('NFC');
    const index = this.reverseIndexes[fromOrthography];
    const tokens = [];
    let position = 0;

    while (position < text.length) {
      let matched = false;

      for (const rule of index) {
        if (text.startsWith(rule.g, position)) {
          tokens.push({ type: 'mapped', id: rule.id, case: rule.case });
          position += rule.g.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        const codePoint = text.codePointAt(position);
        const char = String.fromCodePoint(codePoint);
        tokens.push({ type: 'unmapped', value: char });
        position += char.length;
      }
    }

    return tokens;
  }

  render(tokens, toOrthography) {
    if (!this.orthographies.includes(toOrthography)) {
      throw new Error(`Unknown target orthography: ${toOrthography}`);
    }

    let result = '';

    for (const token of tokens) {
      if (token.type === 'unmapped') {
        result += token.value;
        continue;
      }

      const id = token.id;
      const caseType = token.case || 'lower';

      if (toOrthography === 'LEK-S') {
        // LEK-S (Songhees) output stays lowercase-only and uses the internal identifier directly.
        result += id;
        continue;
      }

      if (toOrthography === 'SEN') {
        // SEN output is fixed uppercase output from the config.
        result += this.mapping[id].SEN;
        continue;
      }

      if (caseType === 'upper') {
        // Explicit shouted-text path: use the upper/title variant defined in config.
        result += this.mapping[id][toOrthography].upper;
      } else {
        result += this.mapping[id][toOrthography].lower;
      }
    }

    return result;
  }

  translate(text, fromOrthography, toOrthography) {
    const tokens = this.tokenize(text, fromOrthography);
    return this.render(tokens, toOrthography);
  }
}

module.exports = OrthographyMapper;
