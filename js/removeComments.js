const fs = require("fs");

const [, , inputFile, outputFile] = process.argv;

/**
 * Remove comments + compress whitespace
 */
function cleanCode(code, removeAllNewlines = false) {
  // Remove multiline comments /* ... */
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove single-line comments //...
  code = code.replace(/\/\/.*$/gm, "");

  // Remove trailing spaces
  code = code.replace(/[ \t]+$/gm, "");

  if (removeAllNewlines) {
    // Remove ALL newlines (full minify-style)
    code = code.replace(/\n+/g, "");
  } else {
    // Collapse multiple newlines into one
    code = code.replace(/\n{2,}/g, "\n");
  }

  return code.trim();
}

fs.readFile(inputFile, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  // Set true if you want fully single-line output
  const cleaned = cleanCode(data, false);

  fs.writeFile(outputFile, cleaned, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      return;
    }
    console.log("Comments removed & code compressed!");
  });
});
