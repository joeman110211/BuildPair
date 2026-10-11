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

  it('rejects extra ASN.1 children within the nested signature algorithm sequence', () => {
    // Construct a DigestInfo with the expected outer shape but an illicit
    // additional child in AlgorithmIdentifier. The original 1.4.0 accepts it.
    const asn1 = forge.asn1;
    const uni = asn1.Class.UNIVERSAL;
    const seq = asn1.Type.SEQUENCE;
    const octet = asn1.Type.OCTETSTRING;
    const digest = forge.md.sha256.create();
    digest.update('Backport verification', 'utf8');
    const digestBytes = digest.digest().getBytes();
    const info = asn1.create(uni, seq, true, [
      asn1.create(uni, seq, true, [
        asn1.create(uni, asn1.Type.OID, false, asn1.oidToDer(forge.oids.sha256).getBytes()),
        asn1.create(uni, asn1.Type.NULL, false, ''),
        asn1.create(uni, octet, false, 'unexpected'),
      ]),
      asn1.create(uni, octet, false, digestBytes),
    ]);
    const der = asn1.toDer(info).getBytes();
    const modulusBytes = 128;
    const paddingBytes = modulusBytes - der.length - 3;
    expect(paddingBytes).toBeGreaterThanOrEqual(8);
    // e = 1 makes the crafted decrypted fixture deterministic; no private
    // key is needed because we are testing the strict ASN.1 verification path.
    const fixture = '\x00\x01' + '\xff'.repeat(paddingBytes) + '\x00' + der;
    const BigInteger = require('node-forge/lib/jsbn').BigInteger;
    const key = forge.pki.rsa.setPublicKey(
      new BigInteger('f'.repeat(modulusBytes * 2), 16),
      new BigInteger('1', 10),
    );
    expect(() => key.verify(digestBytes, fixture)).toThrow(/valid RSASSA-PKCS1-v1_5 DigestInfo/);
  });

  it('parses ordinary and encrypted PEM blocks after linear parser backport', () => {
    const ordinary = forge.pem.encode({
      type: 'CERTIFICATE',
      body: 'BuildPair certificate fixture',
    });
    const encrypted = forge.pem.encode({
      type: 'RSA PRIVATE KEY',
      procType: { version: '4', type: 'ENCRYPTED' },
      dekInfo: { algorithm: 'AES-128-CBC', parameters: '00112233445566778899AABBCCDDEEFF' },
      body: 'Encrypted-key-fixture',
    });
    const decoded = forge.pem.decode(ordinary + encrypted);
    expect(decoded).toHaveLength(2);
    expect(decoded[0].type).toBe('CERTIFICATE');
    expect(decoded[0].body).toBe('BuildPair certificate fixture');
    expect(decoded[1].type).toBe('RSA PRIVATE KEY');
    expect(decoded[1].procType?.type).toBe('ENCRYPTED');
    expect(decoded[1].dekInfo?.algorithm).toBe('AES-128-CBC');
    expect(decoded[1].body).toBe('Encrypted-key-fixture');
  });

  it('rejects malformed repeated PEM markers promptly', () => {
    const malformed = '-----BEGIN '.repeat(2000) + '!'.repeat(20000);
    expect(() => forge.pem.decode(malformed)).toThrow(/Invalid PEM formatted message/);
  });

  it('keeps valid SHA256 RSA signatures working', () => {
    const { publicKey, privateKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
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
