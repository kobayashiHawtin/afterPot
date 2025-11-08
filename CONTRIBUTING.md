# Contributing to AfterPot

Thanks for your interest in contributing! We welcome pull requests and issue reports.

## How to Contribute

1. Fork the repository and create your feature branch from `main`.
2. Keep changes focused and incremental. Write clear commit messages.
3. Run the project locally and ensure it builds before opening a PR.
4. Open a pull request with a clear description of the change and why it’s needed.

## Development Setup

- Node.js LTS and Rust toolchain are required (for Tauri).
- Install dependencies: `npm install`
- Start dev app: `npm run tauri dev`
- Build Windows installer: `npm run build:win`

## Coding Guidelines

- TypeScript/React on the frontend, Rust on the backend.
- Prefer small, composable functions and clear naming.
- Avoid logging sensitive data. Use the `VERBOSE_LOG` flag only during local development.
- Update docs and tests when behavior changes.

## Issues

- Use GitHub Issues to report bugs and request features.
- Please include reproduction steps, screenshots, and logs (if available).

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
