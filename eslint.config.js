const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'src/db/migrations/*', '.expo/*'],
  },
  {
    files: [
      'src/features/exercises/media.tsx',
      'src/features/widgets/sync.ios.ts',
    ],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
]);
