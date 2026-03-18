Yes 👍 — **the remote URL is handled with a different loonyGit command**, not directly with `loonygit config` (although internally loonyGit stores it in config).

The command used is **`loonygit remote`**.

---

# 1. Check Remote URL

```bash
loonygit remote -v
```

Example output:

```text
origin  https://github.com/user/repo.loonygit (fetch)
origin  https://github.com/user/repo.loonygit (push)
```

---

# 2. Add Remote URL

```bash
loonygit remote add origin https://github.com/user/repo.git
```

Example workflow:

```bash
loonygit init
loonygit remote add origin https://github.com/user/project.git
```

---

# 3. Change Remote URL

```bash
loonygit remote set-url origin https://github.com/user/newrepo.git
```

Example:

```bash
loonygit remote set-url origin git@github.com:user/project.git
```

---

# 4. Remove Remote

```bash
loonygit remote remove origin
```

---

# 5. Rename Remote

```bash
loonygit remote rename origin upstream
```

---

# 6. Show Detailed Remote Info

```bash
loonygit remote show origin
```

This shows:

- fetch URL
- push URL
- tracked branches

---

# 7. List All Remotes

```bash
loonygit remote
```

Example output:

```text
origin
upstream
```

---

# 8. Where loonyGit Actually Stores It

loonyGit saves the remote URL inside the **repo config file**:

```
.git/config
```

Example inside that file:

```ini
[remote "origin"]
    url = https://github.com/user/repo.git
    fetch = +refs/heads/*:refs/remotes/origin/*
```

So technically you **could also set it using `loonygit config`**:

```bash
loonygit config remote.origin.url https://github.com/user/repo.git
```

But the **recommended command is**:

```bash
loonygit remote set-url
```

---

✅ **Summary**

| Task          | Command                              |
| ------------- | ------------------------------------ |
| Add remote    | `loonygit remote add origin URL`     |
| View remote   | `loonygit remote -v`                 |
| Change URL    | `loonygit remote set-url origin URL` |
| Remove remote | `loonygit remote remove origin`      |
| Show details  | `loonygit remote show origin`        |

---

```sh
loonygit remote add origin URL
loonygit remote -v
loonygit remote set-url origin URL
loonygit remote remove origin
loonygit remote show origin
```
