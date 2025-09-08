# Lumos Project Structure

## Overview

This document outlines the complete project structure after the reorganization
completed on September 23, 2025.

## Reorganization Summary ✅

### 1. Memory Bank Documentation → `docs/memory-bank/`

**Previous location:** `memory-bank/` **New location:** `docs/memory-bank/`

Files moved:

- `lumos-comprehensive-development-plan.md`
- `lumos-comprehensive-error-testing-framework.md`
- `lumos-development-log.md`
- `lumos-implementation-complete.md`
- `lumos-phase2-ai-integration.md`

### 2. CLI Commands → `cli-commands/`

**Previous location:** `src/cli/commands/` **New location:** `cli-commands/`

Files moved:

- `analyze.ts`
- `benchmark.ts`
- `cache.ts`
- `config.ts`
- `debug.ts`
- `init.ts`
- `learn.ts`
- `research.ts`
- `status.ts`
- `validate.ts`
- `watch.ts`

### 3. Demo Outputs → `demo-results/`

**Previous location:** `tests/demo/demo-outputs/` **New location:**
`demo-results/`

Files moved:

- `dom-error-analysis.json`
- `dom-error-screenshot.png`
- `lumos-demo-report.json`
- `network-error-analysis.json`
- `network-error-screenshot.png`
- `playwright-report.json`
- `reference-error-analysis.json`
- `reference-error-screenshot.png`
- `success-screenshot.png`
- `type-error-analysis.json`
- `type-error-screenshot.png`

## Complete Project Structure

```
lumos/
├── 📁 cli-commands/                    # CLI command implementations
│   ├── analyze.ts
│   ├── benchmark.ts
│   ├── cache.ts
│   ├── config.ts
│   ├── debug.ts
│   ├── init.ts
│   ├── learn.ts
│   ├── research.ts
│   ├── status.ts
│   ├── validate.ts
│   └── watch.ts
│
├── 📁 demo-results/                    # Test demo outputs and results
│   ├── dom-error-analysis.json
│   ├── dom-error-screenshot.png
│   ├── lumos-demo-report.json
│   ├── network-error-analysis.json
│   ├── network-error-screenshot.png
│   ├── playwright-report.json
│   ├── reference-error-analysis.json
│   ├── reference-error-screenshot.png
│   ├── success-screenshot.png
│   ├── type-error-analysis.json
│   └── type-error-screenshot.png
│
├── 📁 docs/                           # Documentation
│   └── 📁 memory-bank/                # Development logs and plans
│       ├── lumos-comprehensive-development-plan.md
│       ├── lumos-comprehensive-error-testing-framework.md
│       ├── lumos-development-log.md
│       ├── lumos-implementation-complete.md
│       └── lumos-phase2-ai-integration.md
│
├── 📁 src/                            # Source code
│   ├── 📁 ai/                         # AI integration layer
│   │   ├── coordinator.ts
│   │   └── 📁 providers/
│   │       ├── anthropic.ts
│   │       ├── base.ts
│   │       ├── factory.ts
│   │       ├── google.ts
│   │       └── openai.ts
│   ├── 📁 cli/                        # CLI core
│   │   └── index.ts
│   ├── 📁 types/                      # TypeScript definitions
│   │   ├── analysis.ts
│   │   ├── config.ts
│   │   └── research.ts
│   └── 📁 utils/                      # Utilities
│       └── config.ts
│
├── 📁 tests/                          # Test suites
│   ├── 📁 api-network/                # API and network tests
│   │   ├── 📁 authentication/
│   │   ├── 📁 http-errors/
│   │   │   └── status-codes.spec.ts
│   │   └── 📁 rate-limiting/
│   ├── 📁 database/                   # Database tests
│   │   ├── 📁 connection/
│   │   ├── 📁 queries/
│   │   └── 📁 transactions/
│   ├── 📁 demo/                       # Demo and showcase tests
│   │   ├── demo-page.html
│   │   └── lumos-showcase.spec.ts
│   ├── 📁 integration/                # Integration tests
│   │   ├── 📁 message-queues/
│   │   ├── 📁 microservices/
│   │   └── 📁 third-party/
│   ├── 📁 mobile-cross-platform/      # Mobile testing
│   │   ├── 📁 device-specific/
│   │   ├── 📁 native-bridge/
│   │   └── 📁 platform-differences/
│   ├── 📁 mocking-testing/            # Mocking and test utilities
│   │   ├── 📁 data-generation/
│   │   ├── 📁 mock-setup/
│   │   └── 📁 test-isolation/
│   ├── 📁 performance/                # Performance tests
│   │   ├── 📁 core-web-vitals/
│   │   ├── 📁 load-testing/
│   │   └── 📁 resource-loading/
│   ├── 📁 security/                   # Security tests
│   │   ├── 📁 authentication/
│   │   ├── 📁 authorization/
│   │   └── 📁 vulnerabilities/
│   ├── 📁 shared/                     # Shared test utilities
│   │   ├── 📁 configs/
│   │   ├── 📁 fixtures/
│   │   ├── 📁 outputs/
│   │   │   ├── 📁 analysis/
│   │   │   ├── 📁 metrics/
│   │   │   ├── 📁 reports/
│   │   │   └── 📁 screenshots/
│   │   └── 📁 utils/
│   │       └── lumos-analyzer.ts
│   ├── 📁 ui-interaction/             # UI interaction tests
│   │   ├── 📁 accessibility/
│   │   ├── 📁 dom-manipulation/
│   │   ├── 📁 modal-overlay/
│   │   │   ├── modal-timeout.spec.ts
│   │   │   └── test-page.html
│   │   └── 📁 responsive-design/
│   └── README.md
│
├── 📁 playwright-report/              # Playwright test reports
├── 📁 test-results/                   # Test execution results
│
├── .env.example                       # Environment configuration template
├── .gitignore                         # Git ignore rules
├── lumos.config.yaml                  # Lumos configuration
├── package.json                       # Node.js dependencies
├── package-lock.json                  # Dependency lock file
├── playwright.config.ts               # Playwright configuration
├── PROJECT-STRUCTURE.md               # This file
├── README.md                          # Project documentation
├── tsconfig.json                      # TypeScript configuration
├── tsconfig.test.json                 # TypeScript test configuration
└── vitest.config.ts                   # Vitest configuration
```

## Key Features Implemented

### 🤖 AI-Powered Testing Intelligence

- Multi-provider AI integration (OpenAI, Anthropic, Google)
- Intelligent error analysis and pattern recognition
- Automated test result interpretation

### 🎯 Comprehensive Error Testing Framework

- **UI Interaction Tests**: Modal overlays, DOM manipulation, responsive design
- **API/Network Tests**: HTTP errors, authentication, rate limiting
- **Database Tests**: Connection handling, query optimization, transactions
- **Security Tests**: Authentication, authorization, vulnerability scanning
- **Performance Tests**: Core Web Vitals, load testing, resource optimization
- **Integration Tests**: Microservices, message queues, third-party APIs
- **Mobile Tests**: Cross-platform compatibility, device-specific scenarios

### 🔧 Advanced CLI Tools

- `analyze`: Intelligent error analysis
- `benchmark`: Performance benchmarking
- `cache`: Cache management
- `config`: Configuration management
- `debug`: Advanced debugging tools
- `init`: Project initialization
- `learn`: ML-powered learning from test patterns
- `research`: Research mode for complex scenarios
- `status`: Real-time status monitoring
- `validate`: Validation and verification
- `watch`: Continuous monitoring

### 📊 Real-World Problem Solving

- **Modal Overlay Timeout Error**: Comprehensive solution for "subtree
  intercepts pointer events" issues
- **Playwright Integration**: Advanced browser automation with error capture
- **Smart Test Analysis**: AI-powered categorization and solution suggestions

## VSCode Display Issue

If you're seeing files listed separately instead of in folders, this is a VSCode
display/refresh issue. The reorganization was successful - all files are
properly organized in their new folder structure as shown above.

To refresh VSCode display:

1. Close and reopen VSCode
2. Or use `Cmd+Shift+P` → "Developer: Reload Window"
3. Check the Explorer panel - folders should be visible now

## Next Steps

The project is now fully organized and ready for:

1. Further development of specific test scenarios
2. AI model integration enhancements
3. CLI command implementations
4. Performance optimizations
5. Additional error pattern recognition

---

_Generated on September 23, 2025 - Lumos AI Testing Intelligence Platform_
