// Playwright resolves its config from the invocation directory, and every
// gate runs from the repository root — so the root hands over the real
// config, which lives with the tests. The .mts extension keeps this file an
// ES module: the root package scope is CommonJS, and a CJS require chain
// cannot load the ESM config in e2e/.
export { default } from "./e2e/playwright.config";
