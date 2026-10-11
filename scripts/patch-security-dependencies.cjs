'use strict';

// Temporary security backports for Expo transitive dependencies.
// Keep npm audit active: advisory versions remain flagged until vendors publish fixes.
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(process.cwd());
const verifyOnly = process.argv.includes('--verify');

function version(name, required) {
  const pkg = JSON.parse(readFileSync(resolve(root, 'node_modules', name, 'package.json'), 'utf8'));
  if (pkg.version !== required) {
    throw new Error('Security patch needs review: ' + name + '@' + pkg.version + ' (expected ' + required + ')');
  }
}

function replace(text, original, replacement, target) {
  if (text.includes(replacement)) return text;
  const at = text.indexOf(original);
  if (at < 0 || text.indexOf(original, at + original.length) >= 0) {
    throw new Error('Unexpected source in ' + target + ': patch anchor missing or ambiguous');
  }
  if (verifyOnly) throw new Error('Unpatched file: ' + target);
  return text.slice(0, at) + replacement + text.slice(at + original.length);
}

function patch(name, file, edits) {
  const target = name + '/' + file;
  const path = resolve(root, 'node_modules', name, file);
  const original = readFileSync(path, 'utf8');
  let updated = original;
  for (const [before, after] of edits) updated = replace(updated, before, after, target);
  if (updated !== original && !verifyOnly) {
    writeFileSync(path, updated);
    process.stdout.write('Patched ' + target + '\n');
  }
}

version('braces', '3.0.3');
version('node-forge', '1.4.0');

// CVE-2026-93687: guard against deeply nested braces/parentheses and AST inputs.
patch('braces', 'lib/parse.js', [
  ['  let depth = 0;\n  let value;',
   '  let depth = 0;\n  let structuralDepth = 0;\n  const maxStructuralDepth = Number.isFinite(opts.maxDepth) ? Math.min(100, opts.maxDepth) : 100;\n  let value;'],
  ['    if (value === CHAR_LEFT_PARENTHESES) {\n      block = push',
   "    if (value === CHAR_LEFT_PARENTHESES) {\n      if (++structuralDepth > maxStructuralDepth) throw new SyntaxError('Brace/parenthesis nesting exceeds safe depth');\n      block = push"],
  ["      block = stack.pop();\n      push({ type: 'text', value });\n      block = stack[stack.length - 1];",
   "      block = stack.pop();\n      push({ type: 'text', value });\n      structuralDepth--;\n      block = stack[stack.length - 1];"],
  ['    if (value === CHAR_LEFT_CURLY_BRACE) {\n      depth++;',
   "    if (value === CHAR_LEFT_CURLY_BRACE) {\n      if (++structuralDepth > maxStructuralDepth) throw new SyntaxError('Brace/parenthesis nesting exceeds safe depth');\n      depth++;"],
  ['      depth--;\n\n      block = stack[stack.length - 1];',
   '      depth--;\n      structuralDepth--;\n\n      block = stack[stack.length - 1];']
]);

patch('braces', 'lib/compile.js', [
  ['  const walk = (node, parent = {}) => {',
   "  const maxAstDepth = Number.isFinite(options.maxDepth) ? Math.min(100, options.maxDepth) : 100;\n  const walk = (node, parent = {}, depth = 0) => {\n    if (node.nodes && depth > maxAstDepth) throw new RangeError('AST depth exceeds safe limit');"],
  ['        output += walk(child, node);',
   '        output += walk(child, node, child.nodes ? depth + 1 : depth);'],
  ['  return walk(ast);', "  return walk(ast, {}, ast.type === 'root' ? 0 : 1);"]
]);

patch('braces', 'lib/stringify.js', [
  ['  const stringify = (node, parent = {}) => {',
   "  const maxAstDepth = Number.isFinite(options.maxDepth) ? Math.min(100, options.maxDepth) : 100;\n  const stringify = (node, parent = {}, depth = 0) => {\n    if (node.nodes && depth > maxAstDepth) throw new RangeError('AST depth exceeds safe limit');"],
  ['        output += stringify(child);',
   '        output += stringify(child, undefined, child.nodes ? depth + 1 : depth);'],
  ['  return stringify(ast);', "  return stringify(ast, {}, ast.type === 'root' ? 0 : 1);"]
]);

patch('braces', 'lib/expand.js', [
  ['  const walk = (node, parent = {}) => {',
   "  const maxAstDepth = Number.isFinite(options.maxDepth) ? Math.min(100, options.maxDepth) : 100;\n  const walk = (node, parent = {}, depth = 0) => {\n    if (node.nodes && depth > maxAstDepth) throw new RangeError('AST depth exceeds safe limit');"],
  ["    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {\n      p = p.parent;",
   "    let parentHops = 0;\n    while (p.type !== 'brace' && p.type !== 'root' && p.parent) {\n      if (++parentHops > maxAstDepth) throw new RangeError('AST parent chain exceeds safe limit');\n      p = p.parent;"],
  ["    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {\n      block = block.parent;",
   "    let blockHops = 0;\n    while (block.type !== 'brace' && block.type !== 'root' && block.parent) {\n      if (++blockHops > maxAstDepth) throw new RangeError('AST parent chain exceeds safe limit');\n      block = block.parent;"],
  ['        walk(child, node);', '        walk(child, node, child.nodes ? depth + 1 : depth);'],
  ['  return utils.flatten(walk(ast));', "  return utils.flatten(walk(ast, {}, ast.type === 'root' ? 0 : 1));"]
]);

// CVE-2026-85393: Forge PR #1152, strict nested DigestAlgorithm ASN.1 count.
patch('node-forge', 'lib/rsa.js', [
  ["          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||\n            obj.value.length !== 2) {",
   "          if(!asn1.validate(obj, digestInfoValidator, capture, errors) ||\n            obj.value.length !== 2 ||\n            obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)) {"]
]);

process.stdout.write('Security fixes ' + (verifyOnly ? 'verified' : 'applied') + '\n');
