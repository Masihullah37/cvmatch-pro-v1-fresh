// import { defineConfig, globalIgnores } from "eslint/config";
// import nextVitals from "eslint-config-next/core-web-vitals";
// import nextTs from "eslint-config-next/typescript";

// const eslintConfig = defineConfig([
//   ...nextVitals,
//   ...nextTs,
//   // Override default ignores of eslint-config-next.
//   globalIgnores([
//     // Default ignores of eslint-config-next:
//     ".next/**",
//     "out/**",
//     "build/**",
//     "next-env.d.ts",
//   ]),
// ]);

// export default eslintConfig;
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/** @type {import('eslint').Linter.Config[]} */
const eslintConfig = [
  // CRITICAL: This global ignore block MUST be the very first element in the array
  {
    ignores: [
      "app/**",
      "components/**",
      "lib/**",
      "pages/**",
      "hooks/**",
      "utils/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "*.js",
      "*.mjs",
      "scripts/**"
    ]
  },

  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;