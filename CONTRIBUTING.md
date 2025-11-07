# Contributing to BookBag

Thank you for your interest in contributing to BookBag! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing](#testing)
- [Documentation](#documentation)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before contributing.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Git
- SQLite3 (for database)
- Basic understanding of JavaScript/Node.js and React/Next.js

### Setting Up Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/bookbag-ce.git
   cd bookbag-ce
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/bookbaghq/bookbag-ce.git
   ```

4. Install dependencies:
   ```bash
   npm install
   cd nextjs-app && npm install && cd ..
   ```

5. Copy environment configuration:
   ```bash
   cp config/environments/env.development.json.example config/environments/env.development.json
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

See [docs/INSTALL.md](docs/INSTALL.md) for detailed installation instructions.

## How to Contribute

### Reporting Bugs

Before creating a bug report:
- Check the [existing issues](https://github.com/bookbaghq/bookbag-ce/issues) to avoid duplicates
- Collect information about the bug (steps to reproduce, error messages, screenshots)

When creating a bug report, include:
- Clear and descriptive title
- Detailed steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node.js version, browser)
- Error messages and stack traces
- Screenshots if applicable

### Suggesting Enhancements

Feature requests are welcome! When suggesting an enhancement:
- Check if it's already been requested
- Explain the use case and benefits
- Provide examples or mockups if possible
- Consider if it fits BookBag's scope and vision

### Your First Code Contribution

Look for issues labeled:
- `good first issue` - Good for newcomers
- `help wanted` - We'd especially appreciate help
- `bug` - Bug fixes are always welcome

## Development Workflow

### Branch Naming

Use descriptive branch names:
- `feature/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring
- `test/description` - Test additions/improvements

Examples:
```bash
git checkout -b feature/add-user-avatars
git checkout -b fix/chat-scroll-issue
git checkout -b docs/update-api-reference
```

### Commit Messages

Follow conventional commit format:

```
type(scope): short description

Longer description if needed.

Fixes #123
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style changes (formatting, etc.)
- `refactor` - Code refactoring
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```
feat(chat): add message export functionality
fix(rag): resolve document upload timeout issue
docs(api): update REST API documentation
```

### Staying Up to Date

Keep your fork synchronized:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git push origin main
```

## Code Standards

### JavaScript/Node.js

- Use ES6+ features
- Follow existing code style
- Use meaningful variable and function names
- Add comments for complex logic
- Avoid deeply nested code

### React/Next.js

- Use functional components with hooks
- Keep components focused and small
- Use proper prop validation
- Follow Next.js App Router conventions
- Prefer server components when possible

### Backend (MasterController)

- Follow MVC pattern
- Keep controllers thin, services fat
- Use dependency injection where appropriate
- Handle errors gracefully
- Validate input data

### File Organization

```
components/           # Backend components (plugins, services)
  ├── admin/
  ├── chats/
  ├── models/
  └── ...
nextjs-app/          # Frontend Next.js application
  ├── app/           # App router pages
  ├── components/    # React components
  └── lib/           # Utility functions
docs/                # Documentation
config/              # Configuration files
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test path/to/test.js
```

### Writing Tests

- Write tests for new features
- Update tests when modifying existing code
- Aim for >70% code coverage
- Test edge cases and error conditions

Example test structure:

```javascript
describe('UserController', () => {
  describe('create', () => {
    it('should create a new user with valid data', async () => {
      // Test implementation
    });

    it('should return error when email is invalid', async () => {
      // Test implementation
    });
  });
});
```

## Documentation

Good documentation is crucial:

### Code Comments

- Add JSDoc comments for functions and classes
- Explain complex algorithms
- Document API endpoints
- Add examples where helpful

### Documentation Files

When adding features, update:
- README.md if it affects setup or key features
- docs/USER_GUIDE.md for user-facing features
- docs/DEVELOPER_GUIDE.md for technical changes
- docs/api/API_DOCUMENTATION.md for API changes
- CHANGELOG.md with your changes

## Pull Request Process

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Self-review of changes completed
- [ ] Comments added for complex code
- [ ] Documentation updated
- [ ] Tests added/updated and passing
- [ ] No new warnings or errors
- [ ] Branch is up to date with main

### Submitting a Pull Request

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

2. Go to the BookBag repository on GitHub
3. Click "New Pull Request"
4. Select your fork and branch
5. Fill out the PR template:
   - Clear title describing the change
   - Detailed description of what and why
   - Link to related issues
   - Screenshots/videos if UI changes
   - Testing performed
   - Breaking changes noted

6. Submit the PR

### PR Review Process

- Maintainers will review your PR
- Address review comments promptly
- Make requested changes in new commits
- Once approved, maintainers will merge

### After Your PR is Merged

- Delete your feature branch:
  ```bash
  git branch -d feature/your-feature-name
  git push origin --delete feature/your-feature-name
  ```

- Sync your fork:
  ```bash
  git checkout main
  git pull upstream main
  git push origin main
  ```

## Community

- **GitHub Discussions**: Ask questions and share ideas
- **Issues**: Report bugs and request features
- **Discord**: Join our community chat [link to be added]

## Questions?

If you have questions:
- Check the documentation in `docs/`
- Search existing issues
- Ask in GitHub Discussions
- Reach out in our Discord community

## License

By contributing to BookBag, you agree that your contributions will be licensed under the same license as the project.

Thank you for contributing to BookBag! 🎒
