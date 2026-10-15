import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { expect, it } from 'vitest';

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const filename = path.join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(filename) : filename.endsWith('.tsx') ? [filename] : [];
  });
}

it('keeps style arrays out of Link asChild slots to prevent fatal browser CSS properties', () => {
  const violations: string[] = [];
  for (const filename of [...sourceFiles('app'), ...sourceFiles('components')]) {
    const source = ts.createSourceFile(filename, readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function visit(node: ts.Node) {
      if (ts.isJsxElement(node) && node.openingElement.tagName.getText(source) === 'Link') {
        const asChild = node.openingElement.attributes.properties.some((attribute) =>
          ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'asChild'
          && (!attribute.initializer || !ts.isJsxExpression(attribute.initializer)
            || attribute.initializer.expression?.kind !== ts.SyntaxKind.FalseKeyword));
        if (asChild) {
          for (const child of node.children) {
            const opening = ts.isJsxElement(child) ? child.openingElement : ts.isJsxSelfClosingElement(child) ? child : null;
            for (const attribute of opening?.attributes.properties ?? []) {
              if (ts.isJsxAttribute(attribute) && attribute.name.getText(source) === 'style'
                && attribute.initializer && ts.isJsxExpression(attribute.initializer)
                && attribute.initializer.expression && ts.isArrayLiteralExpression(attribute.initializer.expression)) {
                const { line } = source.getLineAndCharacterOfPosition(attribute.getStart(source));
                violations.push(`${filename}:${line + 1}: flatten the Link child's style before Slot merges it`);
              }
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  expect(violations).toEqual([]);
});
