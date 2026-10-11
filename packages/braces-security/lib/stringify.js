'use strict';

const utils = require('./utils');

module.exports = (ast, options = {}) => {
  const maxAstDepth = Number.isFinite(options.maxDepth) ? Math.min(100, options.maxDepth) : 100;
  const stringify = (node, parent = {}, depth = 0) => {
    if (node.nodes && depth > maxAstDepth) throw new RangeError('AST depth exceeds safe limit');
    const invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent);
    const invalidNode = node.invalid === true && options.escapeInvalid === true;
    let output = '';

    if (node.value) {
      if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
        return '\\' + node.value;
      }
      return node.value;
    }

    if (node.value) {
      return node.value;
    }

    if (node.nodes) {
      for (const child of node.nodes) {
        output += stringify(child, undefined, child.nodes ? depth + 1 : depth);
      }
    }
    return output;
  };

  return stringify(ast, {}, ast.type === 'root' ? 0 : 1);
};

