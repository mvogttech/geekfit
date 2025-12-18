# Contributing to GeekFit

Thank you for your interest in contributing to GeekFit! This document provides guidelines and instructions for contributing.

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- [Rust](https://rustup.rs/) (latest stable)
- Platform-specific dependencies:
  - **Windows**: No additional dependencies
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: See [Tauri prerequisites](https://tauri.app/start/prerequisites/)

### Getting Started

```bash
# Clone the repository
git clone https://github.com/mvogttech/geekfit.git
cd geekfit

# Install frontend dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Project Structure

```
geekfit/
├── src/                    # React frontend (TypeScript)
│   ├── components/         # UI components
│   ├── contexts/           # React contexts
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Page components
│   ├── themes/             # Theme definitions
│   ├── i18n/               # Translations
│   └── utils/              # Utilities
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── lib.rs          # Main library with commands
│   │   ├── main.rs         # Entry point
│   │   └── bin/cli.rs      # CLI tool
│   └── Cargo.toml
└── .github/workflows/      # CI/CD workflows
```

## Pull Request Process

### Before Submitting

1. **Create an issue first** - Discuss your proposed changes
2. **Fork the repository** - Work on your own fork
3. **Create a feature branch** - `git checkout -b feature/my-feature`
4. **Make your changes** - Follow the coding guidelines below
5. **Run tests** - Ensure all tests pass
6. **Update documentation** - If needed

### Running Tests

```bash
# Run Rust tests
cd src-tauri
cargo test

# Check TypeScript
npx tsc --noEmit

# Check Rust formatting
cargo fmt -- --check

# Run Clippy (Rust linter)
cargo clippy -- -D warnings
```

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add hydration tracking feature
fix: correct XP calculation for level 99
docs: update README with new shortcuts
refactor: simplify theme context
test: add tests for achievement system
```

### Code Review

- All PRs require at least one review
- CI must pass before merging
- Keep PRs focused and reasonably sized

## Coding Guidelines

### TypeScript/React

- Use TypeScript strict mode
- Prefer functional components with hooks
- Use MUI components consistently
- Keep components focused and reusable

### Rust

- Follow Rust idioms and best practices
- Use `cargo fmt` for formatting
- Address all Clippy warnings
- Add tests for new functionality
- Document public functions

### General

- No hardcoded strings for user-facing text (use i18n)
- Keep accessibility in mind
- Test on multiple platforms when possible

## Areas for Contribution

### Good First Issues

- Adding translations to `src/i18n/index.ts`
- Creating new themes in `src/themes/index.ts`
- Improving documentation
- Writing additional tests

### Feature Contributions

- New wellness features
- Additional exercise types
- Accessibility improvements
- Platform-specific enhancements

### Bug Fixes

- Check the Issues tab for reported bugs
- Include reproduction steps in your PR

## Adding Translations

1. Open `src/i18n/index.ts`
2. Add your locale to `SUPPORTED_LOCALES`
3. Copy the `en` translations object
4. Translate all strings
5. Test thoroughly
6. Submit a PR

Example:

```typescript
const fr: Translations = {
  common: {
    save: "Enregistrer",
    cancel: "Annuler",
    // ... translate all strings
  },
  // ... all sections
};
```

## Adding Themes

1. Open `src/themes/index.ts`
2. Add a new `ThemeConfig` to `THEME_CONFIGS`
3. Define colors for background, primary, secondary, text
4. Test in both light and dark conditions
5. Submit a PR

## Questions?

- Open an issue for questions
- Join discussions in existing issues
- Be respectful and constructive

Thank you for contributing to GeekFit!
