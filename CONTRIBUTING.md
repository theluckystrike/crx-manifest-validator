# Contributing to crx-manifest-validator

Thanks for your interest in improving this project. This guide covers everything you need to get started.

REPORTING ISSUES

Open an issue at https://github.com/theluckystrike/crx-manifest-validator/issues with a clear title and description. For bugs, include the manifest.json content that triggers the problem, the expected behavior, and the actual behavior. For validation rule requests, explain the Chrome extension scenario and link to relevant Chrome documentation if possible.

DEVELOPMENT WORKFLOW

1. Fork the repository on GitHub
2. Clone your fork locally
3. Create a feature branch from main
4. Make your changes in the src/ directory
5. Add or update tests in tests/
6. Run the test suite to confirm everything passes
7. Push your branch and open a pull request against main

```bash
git clone https://github.com/<your-username>/crx-manifest-validator.git
cd crx-manifest-validator
npm install
git checkout -b my-feature
```

CODE STYLE

TypeScript strict mode is enabled. Follow the existing patterns in the codebase. Keep functions focused and small. Use descriptive variable names. Add JSDoc comments for any new public API surface. Do not introduce runtime dependencies unless absolutely necessary.

TESTING

All changes must include tests. The project uses Vitest.

```bash
npm test
npm run test:watch
```

Tests live in tests/ and import directly from the source files in src/. Each new validation rule should have at least one test for the passing case and one for the failing case.

LICENSE

By contributing to this project, you agree that your contributions will be licensed under the MIT License. See the LICENSE file for details.
