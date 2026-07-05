const mapOrthography = require('./mapper');

console.log('Running tests...');

// Test 1: SENCOTEN multigraph TŦ -> LEK-X "c"
const test1 = mapOrthography("SEN", "LEK-X", "TŦ");
console.log("Test 1:", test1 === "C" ? "PASS" : `FAIL (got: ${test1}, expected: C)`);

// Test 2: Spaces and Unmapped Characters
const phrase = "ŦE SENĆOŦEN!"; // 'The SENCOTEN!'
const translated = mapOrthography("SEN", "XWS", phrase);
console.log(`Test 2 translated to XWS: "${translated}"`);

// Test 3: Maintain case between mixed case orthographies
// XWL to LEK-X:
const test3_1 = mapOrthography("XWL", "LEK-X", "ch");
console.log(`Test 3.1: "ch" -> "${test3_1}" (Expected: "č")`);

const test3_2 = mapOrthography("XWL", "LEK-X", "Ch");
console.log(`Test 3.2: "Ch" -> "${test3_2}" (Expected: "Č")`);

const test3_3 = mapOrthography("XWL", "LEK-X", "CH");
console.log(`Test 3.3: "CH" -> "${test3_3}" (Expected: "Č")`);

// Test 4: When going from LEK-S or SEN to one of the other orthographies, apply sentence case
// LEK-S "p t k" to XWL. Should capitalize first letter of the sentence -> "P t k"
const test4_1 = mapOrthography("LEK-S", "XWL", "p t k.");
console.log(`Test 4.1: "p t k." -> "${test4_1}" (Expected: "P t k.")`);

const test4_2 = mapOrthography("SEN", "LEK-X", "P T C. S.");
console.log(`Test 4.2: "P T C. S." -> "${test4_2}" (Expected: "P t c. S.")`);

// Test 5: Discard case when mapping to LEK-S or SEN
// From XWL "Sh" to LEK-S -> "š" (always lowercase)
const test5_1 = mapOrthography("XWL", "LEK-S", "Sh");
console.log(`Test 5.1: "Sh" -> "${test5_1}" (Expected: "š")`);

// From XWL "Sh" to SEN -> "Ś" (always uppercase)
const test5_2 = mapOrthography("XWL", "SEN", "sh");
console.log(`Test 5.2: "sh" -> "${test5_2}" (Expected: "Ś")`);

console.log('Tests finished.');
