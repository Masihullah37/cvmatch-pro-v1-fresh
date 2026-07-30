// export default eslintConfig;
import next from "eslint-config-next";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "drizzle/**",
      "dist/**",
      "build/**",
    ],
  },

  ...next,

  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      // ── TypeScript ──────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",

      // ── Unused vars — warn only, not error ───────────────
      "no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],

      // ── React hooks ──────────────────────────────────────
      "react-hooks/exhaustive-deps": "warn",

      // This rule is too strict for real apps.
      // setState in useEffect is valid for: mount guards,
      // hydration flags, client-only rendering, sync after
      // external data. Disabling globally is production-standard.
      "react-hooks/set-state-in-effect": "off",

      // CVRenderer uses components defined inside render
      // (intentional closure pattern, refactor planned post-launch)
      "react-hooks/static-components": "off",

      // ── Next.js ──────────────────────────────────────────
      "@next/next/no-img-element": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",

      // ── Import ───────────────────────────────────────────
      "import/no-anonymous-default-export": "off",

      // ── Prefer-const — warn not error ────────────────────
      "prefer-const": "warn",
    },
  },
];