const fs = require('fs');
const path = require('path');
const OrthographyMapper = require('./mapper');

console.log('Running tests...');

// Load CSV content and initialize the mapper
const csvPath = path.join(__dirname, 'orthography_mapping.csv');
const csvText = fs.readFileSync(csvPath, 'utf8').normalize('NFC');
const vowelsPath = path.join(__dirname, 'vowels.csv');
const vowelsCsvText = fs.readFileSync(vowelsPath, 'utf8').normalize('NFC');
const mapper = new OrthographyMapper(csvText, vowelsCsvText);

// Test 1: SENCOTEN multigraph TŦ -> LEK-X "c"
const test1 = mapper.translate("SEN", "LEK-X", "TŦ");
console.log("Test 1:", test1 === "C" ? "PASS" : `FAIL (got: ${test1}, expected: C)`);

// Test 2: Spaces and Unmapped Characters
const phrase = "ŦE SENĆOŦEN!"; // 'The SENCOTEN!'
const translated = mapper.translate("SEN", "XWS", phrase);
console.log(`Test 2 translated to XWS: "${translated}"`);

// Test 3: Maintain case between mixed case orthographies
// XWL to LEK-X:
const test3_1 = mapper.translate("XWL", "LEK-X", "ch");
console.log(`Test 3.1: "ch" -> "${test3_1}" (Expected: "č")`);

const test3_2 = mapper.translate("XWL", "LEK-X", "Ch");
console.log(`Test 3.2: "Ch" -> "${test3_2}" (Expected: "Č")`);

const test3_3 = mapper.translate("XWL", "LEK-X", "CH");
console.log(`Test 3.3: "CH" -> "${test3_3}" (Expected: "Č")`);

// Test 4: When going from LEK-S or SEN to one of the other orthographies, apply sentence case
// LEK-S "p t k" to XWL. Should capitalize first letter of the sentence -> "P t k"
const test4_1 = mapper.translate("LEK-S", "XWL", "p t k.");
console.log(`Test 4.1: "p t k." -> "${test4_1}" (Expected: "P t k.")`);

const test4_2 = mapper.translate("SEN", "LEK-X", "P T C. S.");
console.log(`Test 4.2: "P T C. S." -> "${test4_2}" (Expected: "P t c. S.")`);

// Test 5: Discard case when mapping to LEK-S or SEN
// From XWL "Sh" to LEK-S -> "š" (always lowercase)
const test5_1 = mapper.translate("XWL", "LEK-S", "Sh");
console.log(`Test 5.1: "Sh" -> "${test5_1}" (Expected: "š")`);

// From XWL "Sh" to SEN -> "Ś" (always uppercase)
const test5_2 = mapper.translate("XWL", "SEN", "sh");
console.log(`Test 5.2: "sh" -> "${test5_2}" (Expected: "Ś")`);

// Test 6: Word-boundary glottal stop rule (SEN -> LEK-X)
const test6 = mapper.translate("SEN", "LEK-X", "IȽEN E SW̱ ¸E TŦE SĆÁÁNEW̱?");
console.log(`Test 6 (SEN -> LEK-X): "${test6}"`);
console.log(`  Expected: "ʔiɬən ə sxʷ ʔə cə sčeenəxʷ?"`);
const test6_passed = test6 === "ʔiɬən ə sxʷ ʔə cə sčeenəxʷ?";
console.log(`  Result: ${test6_passed ? "PASS" : "FAIL"}`);

// Test 7: Word-boundary glottal stop rule inverse (LEK-X -> SEN)
const test7 = mapper.translate("LEK-X", "SEN", "ʔiɬən ə sxʷ ʔə cə sčeenəxʷ?");
console.log(`Test 7 (LEK-X -> SEN): "${test7}"`);
console.log(`  Expected: "IȽEN E SW̱ ¸E TŦE SĆÁÁNEW̱?"`);
const test7_passed = test7 === "IȽEN E SW̱ ¸E TŦE SĆÁÁNEW̱?";
console.log(`  Result: ${test7_passed ? "PASS" : "FAIL"}`);

// Test 8: Glottal stop removal at sentence start capitalization (LEK-X -> XWS)
const test8 = mapper.translate("LEK-X", "XWS", "ʔay̓ skʷečəl");
console.log(`Test 8 (LEK-X -> XWS): "${test8}"`);
console.log(`  Expected: "Ay̓ skwechul"`);
const test8_passed = test8 === "Ay̓ skwechul";
console.log(`  Result: ${test8_passed ? "PASS" : "FAIL"}`);

console.log('Tests finished.');
