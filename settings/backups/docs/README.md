# Quester Platform Documentation

> **Navigation Guide:** All documentation for developers and AI agents working on the Quester Platform.

## 📚 Core Documentation

### 1. [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
**For:** Understanding the technical architecture.
**Contains:**
- High-level system architecture
- Backend design patterns (Go/Fiber)
- Frontend architecture (React Native/Expo)
- Database schema and optimization strategies
- Multi-tenancy implementation

### 2. [PRODUCT_MANUAL.md](./PRODUCT_MANUAL.md)
**For:** Understanding features and requirements.
**Contains:**
- Product vision and roadmap
- Core features and user stories
- Feature specifications
- Epic breakdown

### 3. [OPERATIONS.md](./OPERATIONS.md)
**For:** Deploying and managing the platform.
**Contains:**
- Deployment guides (Docker/K8s)
- Environment configuration
- Performance tuning
- Security & compliance
- Troubleshooting

### 4. [TESTING.md](./TESTING.md)
**For:** Quality assurance and testing strategies.
**Contains:**
- Testing pyramid (Unit/Integration/E2E)
- Manual testing workflows
- Accessibility standards (WCAG 2.1 AA)
- Quality gates

## 🤖 Agent Framework Helpers

### 5. [AGENT_SERVER_HELPER.md](./AGENT_SERVER_HELPER.md)
**For:** AI agents or developers modifying the **backend**.
**Contains:**
- Controller-Service-Repository pattern
- Authentication & authorization
- Multi-tenancy enforcement
- Code snippets for new endpoints

### 6. [AGENT_CLIENT_HELPER.md](./AGENT_CLIENT_HELPER.md)
**For:** AI agents or developers modifying the **frontend**.
**Contains:**
- Screen component patterns
- API integration workflow
- NativeWind styling conventions
- Performance optimization rules

## 📂 Archive
Historical documentation (phase summaries, session reports) is stored in [`archive/`](./archive/).

## 🚀 Quick Start for Developers

**New to the project?**
1. Read [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) for architecture overview
2. Read [PRODUCT_MANUAL.md](./PRODUCT_MANUAL.md) for feature context
3. Skim [AGENT_SERVER_HELPER.md](./AGENT_SERVER_HELPER.md) or [AGENT_CLIENT_HELPER.md](./AGENT_CLIENT_HELPER.md) based on your work area

**Deploying?**
→ See [OPERATIONS.md](./OPERATIONS.md)

**Implementing a new feature?**
1. Check [PRODUCT_MANUAL.md](./PRODUCT_MANUAL.md) for requirements
2. Use [AGENT_SERVER_HELPER.md](./AGENT_SERVER_HELPER.md) or [AGENT_CLIENT_HELPER.md](./AGENT_CLIENT_HELPER.md) for code patterns
3. Follow [TESTING.md](./TESTING.md) for test coverage

## 🧠 AI Agent Usage
If you're an AI agent tasked with modifying this codebase:
1. **Context:** Start with [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md)
2. **Patterns:** Use [AGENT_SERVER_HELPER.md](./AGENT_SERVER_HELPER.md) (backend) or [AGENT_CLIENT_HELPER.md](./AGENT_CLIENT_HELPER.md) (frontend)
3. **Validation:** Cross-reference with [TESTING.md](./TESTING.md) for test requirements
