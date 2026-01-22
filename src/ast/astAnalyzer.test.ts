import { generateASTFingerprint, sanitizeFingerprint } from './astAnalyzer';
import { diffAST, classifyRefactor } from './astDiff';

// Test 1: Binary search - typo fix (should NOT be a refactor)
const code1Before = `
function binarySearch(arr, target) {
  let l = 0, r = arr.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}
`;

const code1After = `
function binarySearch(arr, target) {
  let l = 0, r = arr.length - 1;
  while (l <= r) {
    const mid = Math.floor((l + n) / 2);  // typo: n instead of r
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}
`;

const fp1Before = sanitizeFingerprint(generateASTFingerprint(code1Before));
const fp1After = sanitizeFingerprint(generateASTFingerprint(code1After));
const diff1 = diffAST(fp1Before, fp1After);

console.log('Test 1 (Typo fix):');
console.log('  Score:', diff1.structuralChangeScore.toFixed(3));
console.log('  Major change:', diff1.majorChange);
console.log('  Expected: false (typo is not structural)\n');

// Test 2: While → Recursive (should be refactor)
const code2Before = `
function binarySearch(arr, target, l = 0, r = arr.length - 1) {
  while (l <= r) {
    const mid = Math.floor((l + r) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) l = mid + 1;
    else r = mid - 1;
  }
  return -1;
}
`;

const code2After = `
function binarySearch(arr, target, l = 0, r = arr.length - 1) {
  if (l > r) return -1;
  const mid = Math.floor((l + r) / 2);
  if (arr[mid] === target) return mid;
  if (arr[mid] < target) return binarySearch(arr, target, mid + 1, r);
  return binarySearch(arr, target, l, mid - 1);
}
`;

const fp2Before = sanitizeFingerprint(generateASTFingerprint(code2Before));
const fp2After = sanitizeFingerprint(generateASTFingerprint(code2After));
const diff2 = diffAST(fp2Before, fp2After);

console.log('Test 2 (While → Recursive):');
console.log('  Score:', diff2.structuralChangeScore.toFixed(3));
console.log('  Major change:', diff2.majorChange);
console.log('  Type:', classifyRefactor(diff2));
console.log('  Expected: true\n');

// Test 3: Extract function (should be refactor)
const code3Before = `
function process(data) {
  const validated = data.filter(x => x > 0).map(x => x * 2);
  const sorted = validated.sort((a, b) => a - b);
  return sorted;
}
`;

const code3After = `
function validate(data) {
  return data.filter(x => x > 0).map(x => x * 2);
}

function process(data) {
  const validated = validate(data);
  const sorted = validated.sort((a, b) => a - b);
  return sorted;
}
`;

const fp3Before = sanitizeFingerprint(generateASTFingerprint(code3Before));
const fp3After = sanitizeFingerprint(generateASTFingerprint(code3After));
const diff3 = diffAST(fp3Before, fp3After);

console.log('Test 3 (Extract function):');
console.log('  Score:', diff3.structuralChangeScore.toFixed(3));
console.log('  Major change:', diff3.majorChange);
console.log('  Type:', classifyRefactor(diff3));
console.log('  Expected: true, type=extract_function');