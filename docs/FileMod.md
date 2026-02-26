Totally fair—file permissions feel like wizard runes at first 😅 Let’s decode them using TypeScript-friendly examples and plain English.

---

## 1️⃣ What are these weird numbers like `0o100644`?

In TypeScript/JS:

```ts
0o100644;
```

- `0o` = this number is **octal** (base 8)
- Octal is used by Unix/Linux for file modes
- Each digit encodes permissions

Example:

```ts
export const MODE_FILE = 0o100644;
```

This number is actually two things smashed together:

```
[file type bits] [permission bits]
     100000          644
```

---

## 2️⃣ File type bits (what kind of thing is this?)

These big prefixes tell the OS _what the thing is_:

```ts
export const MODE_DIR = 0o40000; // directory
export const MODE_FILE = 0o100000; // regular file
export const MODE_SYMLINK = 0o120000; // symbolic link
export const MODE_SUBMODULE = 0o160000; // git submodule (special case)
```

So:

```ts
export const MODE_FILE = 0o100644;
```

means:

> "This is a **file**, and its permissions are **644**"

And:

```ts
export const MODE_EXECUTABLE = 0o100755;
```

means:

> "This is a **file**, and it is **executable** (755)"

---

## 3️⃣ The permission bits (the famous 644 / 755 stuff)

Permissions come in **three groups**:

```
owner | group | others
```

Each group has 3 bits:

```
read (4) | write (2) | execute (1)
```

So:

| Number | Meaning     |
| ------ | ----------- |
| 4      | read (r)    |
| 2      | write (w)   |
| 1      | execute (x) |
| 0      | nothing     |

### Example: `644`

```txt
6 = 4 + 2 = rw-
4 = 4     = r--
4 = 4     = r--
```

So:

```txt
owner:  rw-
group:  r--
others: r--
```

In human form:

```txt
-rw-r--r--
```

---

### Example: `755` (executable)

```txt
7 = 4 + 2 + 1 = rwx
5 = 4 + 1     = r-x
5 = 4 + 1     = r-x
```

So:

```txt
owner:  rwx
group:  r-x
others: r-x
```

In human form:

```txt
-rwxr-xr-x
```

This is why `755` is commonly used for scripts and binaries.

---

## 4️⃣ Putting it together (your constants explained)

```ts
export const MODE_DIR = 0o40000;
```

👉 Directory
(no permissions included yet)

```ts
export const MODE_FILE = 0o100644;
```

👉 Regular file
👉 Owner can read/write
👉 Others can only read

```ts
export const MODE_EXECUTABLE = 0o100755;
```

👉 Regular file
👉 Executable by everyone

```ts
export const MODE_SYMLINK = 0o120000;
```

👉 Symbolic link
👉 Permissions usually ignored for symlinks

```ts
export const MODE_SUBMODULE = 0o160000;
```

👉 Git-specific object
👉 Treated like a special directory reference

---

## 5️⃣ How this shows up in Node / TypeScript

Let’s inspect permissions:

```ts
import fs from "fs";

const stat = fs.statSync("script.sh");

console.log(stat.mode.toString(8));
```

Output might be:

```txt
100755
```

Meaning:

```ts
const isFile = (stat.mode & 0o170000) === 0o100000;
const isExecutable = (stat.mode & 0o111) !== 0;

console.log({ isFile, isExecutable });
```

---

## 6️⃣ Making your own modes

```ts
const readOnlyFile = 0o100444; // r--r--r--
const privateFile = 0o100600; // rw-------
const script = 0o100755; // rwxr-xr-x
const dir = 0o040755; // directory with 755 permissions
```

---

## 7️⃣ Mental shortcut (so you don’t go insane)

Just remember:

| Number | Typical use                               |
| ------ | ----------------------------------------- |
| 644    | normal file                               |
| 600    | private file                              |
| 755    | executable / scripts                      |
| 700    | private executable                        |
| 777    | everyone can do anything (danger zone ☠️) |

And:

```
first part = what it is (file/dir/link)
last 3 digits = who can do what
```

---

## 8️⃣ Quick visual cheat sheet

```
0o100755
  │  └── permissions
  └──── file type

Permissions:
7 = rwx
5 = r-x
5 = r-x
```

---

## 9️⃣ Want a tiny helper function?

```ts
function explainMode(mode: number) {
  const type =
    (mode & 0o170000) === 0o040000
      ? "directory"
      : (mode & 0o170000) === 0o100000
        ? "file"
        : (mode & 0o170000) === 0o120000
          ? "symlink"
          : "unknown";

  const perms = mode & 0o777;

  return { type, perms: perms.toString(8) };
}

console.log(explainMode(0o100755));
// { type: 'file', perms: '755' }
```

---

If you want, I can:

- walk through `ls -l` output next
- show how chmod works
- or explain how Git stores modes internally (since your constants look very Git-core-ish 👀)
