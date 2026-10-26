#!/usr/bin/env node

/**
 * Masaar Clinic System — Test Plan & Rules Consistency Checker
 * 
 * Verifies that docs/design/test-plan.md contains an individual row for every rule
 * defined in docs/design/rules-index.md, and that the summary text matches verbatim.
 * 
 * Exits with 0 on complete compliance; exits with 1 on any discrepancy.
 * Intended to run locally and in CI workflows.
 */

const fs = require('fs');
const path = require('path');

const rulesIndexPath = path.resolve(__dirname, '../docs/design/rules-index.md');
const testPlanPath = path.resolve(__dirname, '../docs/design/test-plan.md');

if (!fs.existsSync(rulesIndexPath)) {
  console.error(`❌ ERROR: Could not find ${rulesIndexPath}`);
  process.exit(1);
}

if (!fs.existsSync(testPlanPath)) {
  console.error(`❌ ERROR: Could not find ${testPlanPath}`);
  process.exit(1);
}

// 1. Parse rules from rules-index.md
const rulesIndexContent = fs.readFileSync(rulesIndexPath, 'utf8');
const expectedRules = new Map();

rulesIndexContent.split('\n').forEach((line, lineNum) => {
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (match && match[1].startsWith('R-')) {
    const id = match[1].trim();
    const summary = match[2].trim();
    const module = match[3].trim();
    expectedRules.set(id, { id, summary, module, lineNum: lineNum + 1 });
  }
});

console.log(`Found ${expectedRules.size} rules defined in rules-index.md.`);

// 2. Parse Section 2 of test-plan.md
const testPlanContent = fs.readFileSync(testPlanPath, 'utf8');
const section2Header = '## 2. Master Rule ID Traceability Matrix';
const section3Header = '## 3. Generated Test Suites';

const startIdx = testPlanContent.indexOf(section2Header);
const endIdx = testPlanContent.indexOf(section3Header);

if (startIdx === -1 || endIdx === -1) {
  console.error(`❌ ERROR: Section 2 delimiters not found in ${testPlanPath}`);
  process.exit(1);
}

const section2Content = testPlanContent.substring(startIdx, endIdx);
const testPlanRows = new Map();
const rangeRules = [];

section2Content.split('\n').forEach((line, lineNum) => {
  // Check for forbidden range rules (e.g. R-5.5-3 – R-5.5-13)
  if (line.includes('–') || line.includes('..')) {
    const rangeMatch = line.match(/`?(R-[0-9][^`|]+)`?/);
    if (rangeMatch && rangeMatch[1].includes('–')) {
      rangeRules.push({ raw: line.trim(), lineNum });
    }
  }

  // Parse standard rule rows: | `R-x.y-z` | Module | Summary | Test Level | Automated Test Suite | Reference |
  const match = line.match(/^\|\s*`([^`]+)`\s*\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/);
  if (match && match[1].startsWith('R-')) {
    const id = match[1].trim();
    const module = match[2].trim();
    const summary = match[3].trim();
    const level = match[4].trim();
    const test = match[5].trim();
    const ref = match[6].trim();
    testPlanRows.set(id, { id, module, summary, level, test, ref, lineNum });
  }
});

console.log(`Found ${testPlanRows.size} individual rule rows in test-plan.md Section 2.`);

// 3. Perform Validations
const errors = [];

// A. Range detection check
if (rangeRules.length > 0) {
  rangeRules.forEach(r => {
    errors.push(`Grouped range row detected (must be split into individual 1-to-1 rows): ${r.raw}`);
  });
}

// B. Missing rules check
for (const [id, expected] of expectedRules.entries()) {
  if (!testPlanRows.has(id)) {
    errors.push(`Missing rule ID in test-plan.md: \`${id}\` (${expected.summary})`);
  }
}

// C. Extra / unexpected rules check
for (const [id, actual] of testPlanRows.entries()) {
  if (!expectedRules.has(id)) {
    errors.push(`Unexpected rule ID found in test-plan.md not present in rules-index.md: \`${id}\``);
  }
}

// D. Exact summary text matching check
for (const [id, expected] of expectedRules.entries()) {
  const actual = testPlanRows.get(id);
  if (actual) {
    if (actual.summary !== expected.summary) {
      errors.push(`Summary text mismatch for rule \`${id}\`:\n  Expected: "${expected.summary}"\n  Actual:   "${actual.summary}"`);
    }
  }
}

// 4. Report Results
if (errors.length > 0) {
  console.error(`\n❌ VERIFICATION FAILED (${errors.length} issue(s) detected):\n`);
  errors.forEach((err, idx) => console.error(`${idx + 1}. ${err}`));
  process.exit(1);
} else {
  console.log(`\n✅ ALL CHECKS PASSED:`);
  console.log(`- Total rules verified: ${expectedRules.size}`);
  console.log(`- Individual test-plan rows: ${testPlanRows.size}`);
  console.log(`- Traceability coverage: 100.0%`);
  console.log(`- Exact text summary alignment: 100.0% match with rules-index.md`);
  console.log(`- Grouped ranges: 0`);
  process.exit(0);
}
