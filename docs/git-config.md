`git config` is used to **get, set, edit, and manage Git configuration** (user info, editor, aliases, behavior, etc.). Below is a **complete practical list of commonly used `git config` commands and options**, organized so you can quickly understand them.

---

# 1. Basic `git config` Syntax

```bash
git config [options] <key> [value]
```

Example:

```bash
git config --global user.name "Sankar"
git config --global user.email "sankar@example.com"
```

---

# 2. Configuration Levels

Git stores configuration at three levels.

| Level  | Command    | Location         |
| ------ | ---------- | ---------------- |
| System | `--system` | `/etc/gitconfig` |
| Global | `--global` | `~/.gitconfig`   |
| Local  | `--local`  | `.git/config`    |

Examples

```bash
git config --system core.editor vim
git config --global user.name "Your Name"
git config --local user.email "you@example.com"
```

Priority order:

```
Local > Global > System
```

---

# 3. Show Configuration

### Show all configs

```bash
git config --list
```

### Show origin file

```bash
git config --list --show-origin
```

### Show specific value

```bash
git config user.name
```

### Show global config only

```bash
git config --global --list
```

---

# 4. Set Configuration

### Set a value

```bash
git config user.name "Your Name"
```

### Set globally

```bash
git config --global user.email "email@example.com"
```

### Set system wide

```bash
git config --system core.editor nano
```

---

# 5. Edit Configuration File

Open configuration file in editor.

### Global

```bash
git config --global --edit
```

### Local

```bash
git config --local --edit
```

### System

```bash
git config --system --edit
```

---

# 6. Remove Configuration

### Remove a key

```bash
git config --unset user.name
```

### Remove global key

```bash
git config --global --unset user.email
```

### Remove all values of a key

```bash
git config --unset-all alias.co
```

---

# 7. Rename Configuration

```bash
git config --rename-section old-section new-section
```

Example

```bash
git config --rename-section alias shortcuts
```

---

# 8. Add Multiple Values

```bash
git config --add remote.origin.fetch "+refs/heads/*:refs/remotes/origin/*"
```

---

# 9. Replace All Values

```bash
git config --replace-all core.editor vim
```

---

# 10. Get Specific Type

Git can enforce value types.

### Boolean

```bash
git config --bool core.filemode
```

### Integer

```bash
git config --int http.postBuffer
```

### Path

```bash
git config --path core.editor
```

---

# 11. Common Git Config Settings

### User Identity

```bash
git config --global user.name "Your Name"
git config --global user.email "email@example.com"
```

### Default Editor

```bash
git config --global core.editor "code --wait"
```

### Default Branch Name

```bash
git config --global init.defaultBranch main
```

### Enable Colored Output

```bash
git config --global color.ui auto
```

### Credential Storage

```bash
git config --global credential.helper store
```

or

```bash
git config --global credential.helper cache
```

### Enable Rebase on Pull

```bash
git config --global pull.rebase true
```

---

# 12. Git Alias Commands

Create shortcuts.

Example:

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.cm commit
```

Usage:

```bash
git st
git co main
```

---

# 13. Important `git config` Options

| Option          | Description       |
| --------------- | ----------------- |
| `--global`      | Global config     |
| `--system`      | System config     |
| `--local`       | Repo config       |
| `--list`        | Show configs      |
| `--edit`        | Edit config file  |
| `--unset`       | Remove key        |
| `--unset-all`   | Remove all values |
| `--add`         | Add new value     |
| `--replace-all` | Replace values    |
| `--get`         | Get value         |
| `--get-all`     | Get all values    |
| `--show-origin` | Show config file  |

---

# 14. View Configuration File Paths

```bash
git config --system --list --show-origin
git config --global --list --show-origin
git config --local --list --show-origin
```

---

# 15. Example Complete Setup

A typical Git setup:

```bash
git config --global user.name "Sankar"
git config --global user.email "sankar@email.com"
git config --global core.editor "code --wait"
git config --global init.defaultBranch main
git config --global color.ui auto
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.cm commit
```

---

✅ If you want, I can also show:

- **50+ most useful real-world Git config commands developers actually use**
- **Best Git config setup for developers**
- **Git config interview questions** (very useful for dev jobs).
