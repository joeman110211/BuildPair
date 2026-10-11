import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);

describe('Expo Router URI decoder compatibility', () => {
  it('uses the patched decoder while retaining a CommonJS callable export', () => {
    const decoder = require('decode-uri-component');
    expect(typeof decoder).toBe('function');
    expect(decoder('%25')).toBe('%');
    expect(decoder('%E2%9C%A8')).toBe('✨');
  });

  it('preserves query-string 7 parsing semantics used by Expo Router', () => {
    const fromRouter = createRequire(require.resolve('expo-router/package.json'));
    const queryString = fromRouter('query-string');
    expect({ ...queryString.parse('state=open&symbol=%E2%9C%A8&tag=one&tag=two&empty=&flag') })
      .toEqual({ state: 'open', symbol: '✨', tag: ['one', 'two'], empty: '', flag: null });
    const encoded = queryString.stringify({ state: 'open', label: 'a + b', tag: ['one', 'two'] }, { sort: false });
    expect(encoded).toBe('state=open&label=a%20%2B%20b&tag=one&tag=two');
    expect({ ...queryString.parse(encoded) })
      .toEqual({ state: 'open', label: 'a + b', tag: ['one', 'two'] });
  });

  it('does not hang on a large malformed query component', () => {
    const script = `
      const { createRequire } = require('node:module');
      const routerRequire = createRequire(require.resolve('expo-router/package.json'));
      const parsed = routerRequire('query-string').parse('state=open&bad=' + '%FE'.repeat(20000) + '%41');
      process.stdout.write(JSON.stringify({ state: parsed.state, end: parsed.bad.slice(-1) }));
    `;
    const output = execFileSync(process.execPath, ['-e', script], { encoding: 'utf8', timeout: 5000 });
    expect(JSON.parse(output)).toEqual({ state: 'open', end: 'A' });
  });
});
