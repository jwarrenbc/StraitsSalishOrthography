const OrthographyMapper = require('./mapper');
const mappingData = require('./orthography_mapping.json');

const mapper = new OrthographyMapper(mappingData);

// Test 1: SENCOTEN multigraph TŦ -> LEK-X "c"
console.log("Test 1:", mapper.translate("TŦ", "SEN", "LEK-X") === "C" ? "PASS" : "FAIL");

// Test 2: Spaces and Unmapped Characters
const phrase = "ŦE SENĆOŦEN!"; // 'The SENCOTEN!'
const translated = mapper.translate(phrase, "SEN", "XWS");
console.log(`Test 2 translated to XWS: ${translated}`);

// Test 3: XWL title casing to SENCOTEN
const kwStr = "Kw'eylh"; 
const xwlTokens = mapper.tokenize(kwStr, "XWL");
console.dir(xwlTokens);
console.log(`Test 3 XWL -> SEN: ${mapper.render(xwlTokens, "SEN")}`);
console.log(`Test 3 XWL -> Songhees: ${mapper.render(xwlTokens, "Songhees")}`);

// Test 4: LEK-X mixed case -> XWL
const lekxPhrase = "K̓ʷs";
const toXwl = mapper.translate(lekxPhrase, "LEK-X", "XWL");
console.log(`Test 4 LEK-X (${lekxPhrase}) -> XWL: ${toXwl}`);
