import tsParser from "@typescript-eslint/parser";

/** Gatekeeper's hard bans, enforced mechanically. The agent only judges what lint cannot. */
const bans = [
  { selector: "CallExpression[callee.property.name='waitForTimeout']",
    message: "Hard waits are banned - use web-first assertions (expect(locator).toBeVisible())." },
  { selector: "CallExpression[callee.property.name='locator'][arguments.0.value=/^#/]",
    message: "ID selectors are banned - use getByRole / getByLabel." },
  { selector: "CallExpression[callee.property.name='nth']",
    message: "Positional selectors are banned - use an accessible name." },
];

export default [
  { files: ["tests/**/*.ts"], languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: "module" },
    rules: { "no-restricted-syntax": ["error", ...bans] } },
  // UI SPEC files hold no locators: all editor knowledge lives in tests/l3-ui/_tle.ts (release fixes land there only)
  { files: ["tests/l3-ui/**/*.spec.ts"], languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: "module" },
    rules: { "no-restricted-syntax": ["error", ...bans,
      { selector: "CallExpression[callee.object.name='page'][callee.property.name=/^(getBy|locator|frameLocator)/]",
        message: "No locators in UI spec files - add a verb to tests/l3-ui/_tle.ts instead." }] } },
];
