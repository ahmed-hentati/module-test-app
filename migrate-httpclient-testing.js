transform: {
  '^.+\\.(ts|mjs|js|html)$': [
    'jest-preset-angular',
    {
      tsconfig: '<rootDir>/tsconfig.spec.json',
      stringifyContentPathRegex: '\\.html$',
    },
  ],
},



{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/out-tsc/spec",
    "module": "commonjs",
    "target": "es2019",
    "types": ["jest", "node"]
  },
  "include": [
    "src/**/*.spec.ts",
    "src/**/*.d.ts"
  ]
}
