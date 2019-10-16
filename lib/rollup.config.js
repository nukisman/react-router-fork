import typescript from 'rollup-plugin-typescript2';
import { eslint } from 'rollup-plugin-eslint';
import commonjs from 'rollup-plugin-commonjs';
import external from 'rollup-plugin-peer-deps-external';
import postcss from 'rollup-plugin-postcss';
import resolve from 'rollup-plugin-node-resolve';
import url from 'rollup-plugin-url';
import svgr from '@svgr/rollup';

import pkg from './package.json';

const plugins = [
  external(),

  postcss({
    modules: true
  }),
  url(),
  svgr(),
  eslint({}),
  typescript({
    rollupCommonJSResolveHack: true,
    clean: true
  }),
  resolve({ modules: true }),
  commonjs({})
];

export default {
  input: `src/index.tsx`,
  output: [
    {
      file: 'build/index.js',
      format: 'umd',
      name: pkg.name,
      sourcemap: true,
      globals: {
        react: 'React'
      }
    },
    {
      file: 'build/index.ems.js',
      format: 'esm',
      exports: 'named',
      sourcemap: true
    }
  ],
  plugins
};
