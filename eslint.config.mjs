import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTypeScript from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    rules: {
      // These effects hydrate forms from authenticated remote data or begin
      // route transitions; they are synchronization points, not derived state.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'coverage/**',
    'next-env.d.ts',
    'public/**',
  ]),
]);
