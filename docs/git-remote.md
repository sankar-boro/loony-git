Yes 👍 — **the remote URL is handled with a different Git command**, not directly with `git config` (although internally Git stores it in config).

The command used is **`git remote`**.

---

# 1. Check Remote URL

```bash
git remote -v
```

Example output:

```text
origin  https://github.com/user/repo.git (fetch)
origin  https://github.com/user/repo.git (push)
```

---

# 2. Add Remote URL

```bash
git remote add origin https://github.com/user/repo.git
```

Example workflow:

```bash
git init
git remote add origin https://github.com/user/project.git
```

---

# 3. Change Remote URL

```bash
git remote set-url origin https://github.com/user/newrepo.git
```

Example:

```bash
git remote set-url origin git@github.com:user/project.git
```

---

# 4. Remove Remote

```bash
git remote remove origin
```

---

# 5. Rename Remote

```bash
git remote rename origin upstream
```

---

# 6. Show Detailed Remote Info

```bash
git remote show origin
```

This shows:

- fetch URL
- push URL
- tracked branches

---

# 7. List All Remotes

```bash
git remote
```

Example output:

```text
origin
upstream
```

---

# 8. Where Git Actually Stores It

Git saves the remote URL inside the **repo config file**:

```
.git/config
```

Example inside that file:

```ini
[remote "origin"]
    url = https://github.com/user/repo.git
    fetch = +refs/heads/*:refs/remotes/origin/*
```

So technically you **could also set it using `git config`**:

```bash
git config remote.origin.url https://github.com/user/repo.git
```

But the **recommended command is**:

```bash
git remote set-url
```

---

✅ **Summary**

| Task          | Command                         |
| ------------- | ------------------------------- |
| Add remote    | `git remote add origin URL`     |
| View remote   | `git remote -v`                 |
| Change URL    | `git remote set-url origin URL` |
| Remove remote | `git remote remove origin`      |
| Show details  | `git remote show origin`        |

---

💡 If you'd like, I can also show **the full Git remote workflow (clone → add → push → upstream)** that most developers use daily.
