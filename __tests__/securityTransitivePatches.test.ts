import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { generateKeyPairSync } from 'node:crypto';

const require = createRequire(import.meta.url);
const braces = require('braces');
const micromatch = require('micromatch');
const forge = require('node-forge');

describe('Security patches for vulnerable transitive dependencies', () => {
  it('preserves normal Metro glob patterns and braces expansion', () => {
    expect(braces('{a,b}', { expand: true })).toEqual(['a', 'b']);
    expect(braces('src/{app,lib}/*.ts')).toEqual(['src/(app|lib)/*.ts']);
    expect(micromatch(['src/app/a.ts', 'other/test.ts'], ['src/**/*.ts']))
      .toEqual(['src/app/a.ts']);
  });

  it('rejects deeply nested patterns before the AST walkers recurse', () => {
    expect(() => braces.parse('{'.repeat(150) + 'a,b' + '}'.repeat(150))).toThrow(/safe depth/);
    expect(() => braces.parse('('.repeat(150) + ')'.repeat(150))).toThrow(/safe depth/);
    expect(() => braces.parse('{{a,b},c}', { maxDepth: 1 })).toThrow(/safe depth/);
  });

  it('rejects excessive caller-supplied AST nesting in all public walkers', () => {
    let ast: Record<string, unknown> = { type: 'text', value: 'x' };
    for (let i = 0; i < 150; i++) ast = { type: 'brace', nodes: [ast] };
    ast = { type: 'root', nodes: [ast] };
    for (const visit of [braces.compile, braces.stringify, braces.expand]) {
      expect(() => visit(ast)).toThrow(/safe limit/);
    }
  });

  it('has the strict nested ASN.1 DigestAlgorithm validation installed', () => {
    const rsa = readFileSync('node_modules/node-forge/lib/rsa.js', 'utf8');
    expect(rsa).toContain("obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)");
  });

  it('keeps valid SHA256 RSA signatures working', () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 1024,
      publicKeyEncoding: { format: 'pem', type: 'spki' },
      privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    });
    const pri = forge.pki.privateKeyFromPem(privateKey);
    const pub = forge.pki.publicKeyFromPem(publicKey);
    const digest = forge.md.sha256.create();
    digest.update('BuildPair security patch regression', 'utf8');
    const signature = pri.sign(digest);
    const fresh = forge.md.sha256.create();
    fresh.update('BuildPair security patch regression', 'utf8');
    expect(pub.verify(fresh.digest().bytes(), signature)).toBe(true);
  });
});
