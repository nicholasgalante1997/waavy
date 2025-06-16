import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';

/** @type {import('eslint').Linter.Config[]} */
export default [
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  { ignores: ['lib/__tests__/**', 'lib/extensions/*', 'examples/*', 'lib/server/models/Server.ts'] },
  { rules: { '@typescript-eslint/no-explicit-any': 'off' }}
];
