# Contributing to Brax Upload Method

Thank you for your interest in contributing to Brax Upload Method! This document provides guidelines for contributing to the project.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please:
- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Report inappropriate behavior

## How to Contribute

### Reporting Bugs

Before creating a bug report, please search existing issues to avoid duplicates.

When creating a bug report, include:
1. **Clear title and description**
2. **Steps to reproduce**
3. **Expected vs actual behavior**
4. **Environment:** OS, Node version, browser type
5. **Screenshots or video** (if applicable)
6. **Error logs or stack traces**

**Bug Report Template:**
```markdown
## Description
Brief description of the bug

## Steps to Reproduce
1. Do this
2. Then this
3. And this

## Expected Behavior
What should happen

## Actual Behavior
What actually happened

## Environment
- OS: [Windows 10, macOS, Linux]
- Node: [version]
- Browser: [Chrome 120, Firefox 121]

## Attachments
- Screenshots
- Error logs
```

### Suggesting Features

1. Search existing issues first
2. Describe the feature and use case
3. Explain why it would be useful
4. Provide mockups or examples (if applicable)

**Feature Request Template:**
```markdown
## Description
What feature should we add?

## Use Case
Why would this be helpful?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches?
```

### Pull Requests

#### Before You Start

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make sure you have the latest main branch
4. Ensure ffmpeg is installed and working

#### Development Setup

```bash
# Install dependencies
npm install

# Start development servers
npm run backend:start
npm run frontend:start

# In another terminal
npm run backend:dev  # with auto-reload
```

#### Coding Standards

- **Language:** TypeScript strict mode
- **Style:** Follow ESLint configuration
- **Formatting:** Prettier (automatic)
- **Testing:** Unit tests for critical functions
- **Comments:** Meaningful comments for complex logic

#### Commit Messages

Use clear, descriptive commit messages:

```bash
git commit -m "feat: add video quality recommendations"
git commit -m "fix: resolve ffmpeg path detection on Windows"
git commit -m "docs: update deployment guide"
git commit -m "refactor: simplify video analyzer function"
```

Prefix types:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build, dependencies, etc.

#### Pull Request Process

1. **Ensure code quality:**
   ```bash
   npm run lint
   npm run build
   npm run test
   ```

2. **Push to your fork:**
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create Pull Request on GitHub:**
   - Clear title and description
   - Link related issues: "Closes #123"
   - Explain changes and why they're needed
   - Include screenshots for UI changes

4. **PR Template:**
   ```markdown
   ## Description
   Brief summary of changes

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Documentation
   - [ ] Performance improvement

   ## Testing
   How was this tested?

   ## Related Issues
   Closes #123

   ## Checklist
   - [ ] My code follows the project's style guidelines
   - [ ] I have updated documentation accordingly
   - [ ] My changes generate no new warnings
   - [ ] I have tested my changes thoroughly
   ```

5. **Code Review:**
   - Maintainers will review your code
   - Address feedback and update PR
   - Once approved, it will be merged

## Project Structure

```
brax-upload-method/
├── backend/              # Express API
│   ├── src/
│   │   ├── server.ts    # Main Express app
│   │   └── videoAnalyzer.ts
│   ├── dist/            # Compiled JavaScript
│   └── package.json
├── frontend/             # React UI
│   ├── src/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── dist/            # Built static files
│   └── vite.config.ts
├── extension/            # Chrome extension
│   ├── src/
│   │   ├── background.js
│   │   └── contentScript.js
│   ├── icons/
│   └── manifest.json
├── .github/workflows/    # CI/CD pipelines
├── README.md
├── DEPLOYMENT.md
└── package.json          # Root workspace
```

## Areas for Contribution

### High Priority
- [ ] Performance optimization for large video files
- [ ] Support for more video formats (HEVC, AV1)
- [ ] Batch video processing
- [ ] HDR to SDR conversion
- [ ] Advanced analytics dashboard

### Medium Priority
- [ ] Better error messages and logging
- [ ] More detailed UI mockups
- [ ] Mobile app version
- [ ] Integration with cloud storage (Google Drive, OneDrive)
- [ ] Multi-language support

### Nice to Have
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Video preview in extension
- [ ] Watermark support
- [ ] Advanced filtering options

## Testing

### Running Tests

```bash
# Backend tests
npm --workspace backend test

# Frontend tests
npm --workspace frontend test

# All tests
npm test
```

### Writing Tests

Create test files alongside your code:
- `videoAnalyzer.ts` → `videoAnalyzer.test.ts`
- Use Jest for unit tests
- Aim for >80% code coverage

## Documentation

### Code Comments
```typescript
/**
 * Analyzes a video file and returns detailed metadata.
 * @param filePath - Absolute path to video file
 * @returns Promise with video analysis results
 */
async function analyzeVideo(filePath: string): Promise<VideoAnalysisResult>
```

### README Updates
- Keep installation instructions current
- Document new features
- Add troubleshooting sections
- Update API documentation

### Deployment Documentation
- Document deployment steps
- Include environment variables needed
- Add troubleshooting section

## Review Process

1. **Automated Checks:**
   - Code builds without errors
   - Linting passes
   - Tests pass

2. **Manual Review:**
   - Code quality and style
   - Functionality testing
   - Security review (if applicable)
   - Documentation completeness

3. **Approval:**
   - Requires at least 1 maintainer approval
   - All CI checks must pass
   - No merge conflicts

## Community

- **Issues:** [GitHub Issues](https://github.com/brax-studio/brax-upload-method/issues)
- **Discussions:** [GitHub Discussions](https://github.com/brax-studio/brax-upload-method/discussions)
- **Email:** dev@brax-upload.com

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Questions?

Feel free to ask questions in:
- GitHub Issues
- GitHub Discussions  
- Email: dev@brax-upload.com

Thank you for contributing to Brax Upload Method! 🚀
