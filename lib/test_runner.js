const fs = require('fs');
const path = require('path');
const OrthographyMapper = require('./mapper');

console.log('Running tests...');

// Load CSV content and initialize the mapper
const csvPath = path.join(__dirname, 'orthography_mapping.csv');
const csvText = fs.readFileSync(csvPath, 'utf8').normalize('NFC');
const mapper = new OrthographyMapper(csvText);

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
console.log(`  Expected: "Oy̓ skwachel"`);
const test8_passed = test8 === "Oy̓ skwachel";
console.log(`  Result: ${test8_passed ? "PASS" : "FAIL"}`);

// Test 9: Issue #4 - Ejective markers handled correctly
const test9 = mapper.translate("SEN", "LEK-X", "Ⱥ¸ EU¸ Í¸ I¸ L¸ M¸ N¸ Ṉ¸ W¸ Y¸");
console.log(`Test 9 (Issue 4): "${test9}"`);
console.log(`  Expected: "ʔey̓ ʔəw̓ ʔəy̓ ʔiy̓ l̕ m̓ n̓ ŋ̓ w̓ y̓"`);
const test9_passed = test9 === "ʔey̓ ʔəw̓ ʔəy̓ ʔiy̓ l̕ m̓ n̓ ŋ̓ w̓ y̓";
console.log(`  Result: ${test9_passed ? "PASS" : "FAIL"}`);

// Test 10: Issue #3 - Different apostrophes
const test10 = mapper.translate("XWS", "LEK-X", "q’ qʼ q'");
console.log(`Test 10 (Issue 3): "${test10}"`);
console.log(`  Expected: "q̓ q̓ q̓"`);
const test10_passed = test10 === "q̓ q̓ q̓";
console.log(`  Result: ${test10_passed ? "PASS" : "FAIL"}`);

// Test 11: Issue #2 - Vowel accents stripped appropriately
const test11 = mapper.translate("XWS", "LEK-X", "áy");
console.log(`Test 11 (Issue 2): "${test11}"`);
console.log(`  Expected: "ʔey"`);
const test11_passed = test11 === "ʔey";
console.log(`  Result: ${test11_passed ? "PASS" : "FAIL"}`);

// Test 12: Issue #5 - Capitalization after glottal stop handled correctly
const test12 = mapper.translate("XWS", "LEK-X", "Sqín éy’ scháy! Ey’óles kwe7");
console.log(`Test 12 (Issue 5): "${test12}"`);
console.log(`  Expected: "Sqin ʔəy̓ sčey! ʔəy̓aləs kʷəʔ"`);
const test12_passed = test12 === "Sqin ʔəy̓ sčey! ʔəy̓aləs kʷəʔ";
console.log(`  Result: ${test12_passed ? "PASS" : "FAIL"}`);

console.log('Tests finished.');
