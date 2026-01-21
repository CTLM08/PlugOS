# 🤝 Contributing Guide

Thank you for your interest in contributing to PlugOS! This guide will help you get started.

## Ways to Contribute

### 🧩 Create New Plugs

The most impactful way to contribute is by creating new plugs. Ideas include:

| Plug Idea | Description |
|-----------|-------------|
| 📊 Analytics Dashboard | Organization insights and reports |
| 💬 Team Chat | Internal messaging system |
| 📋 Task Manager | Project and task tracking |
| 🎓 Training Portal | Employee onboarding and courses |
| 📝 Performance Reviews | Employee evaluation system |
| 🎫 Helpdesk | Internal ticket system |
| 📅 Meeting Scheduler | Room and meeting management |

See [Plugin Development Guide](./plugin-development.md) for detailed instructions.

### 🔧 Core Improvements

- Bug fixes and security patches
- Performance optimizations
- UI/UX enhancements
- Documentation improvements
- Test coverage

## Getting Started

### 1. Fork & Clone

```bash
git clone https://github.com/YOUR_USERNAME/PlugOS.git
cd PlugOS
```

### 2. Set Up Development Environment

Follow the [Getting Started Guide](./getting-started.md) to set up your local environment.

### 3. Create a Feature Branch

```bash
git checkout -b feature/my-awesome-plug
```

### 4. Make Your Changes

- Write clean, readable code
- Follow existing code patterns
- Add comments for complex logic
- Test your changes thoroughly

### 5. Commit & Push

```bash
git add .
git commit -m "Add: My Awesome Plug"
git push origin feature/my-awesome-plug
```

### 6. Open a Pull Request

Go to the original repository and open a Pull Request with:
- Clear title describing the change
- Description of what was added/changed
- Screenshots for UI changes
- Any testing notes

## Code Style

### JavaScript/React
- Use ES6+ features
- Prefer functional components with hooks
- Use meaningful variable names
- Handle errors gracefully

### CSS
- Use TailwindCSS utilities
- Follow existing color schemes
- Support dark mode (use CSS variables)

### Database
- Use UUID for primary keys
- Always include `org_id` for multi-tenant data
- Add appropriate indexes
- Use `ON DELETE CASCADE` for foreign keys

## Commit Messages

Use clear, descriptive commit messages:

```
Add: New feature description
Fix: Bug description
Update: What was updated
Remove: What was removed
Docs: Documentation changes
```

## Questions?

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Be respectful and constructive

---

**Thank you for contributing to PlugOS!** 🎉
