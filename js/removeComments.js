const fs = require("fs");

/**
 * Remove single-line and multi-line comments from JS code
 */
function removeComments(code) {
  // Remove multiline comments /* ... */
  code = code.replace(/\/\*[\s\S]*?\*\//g, "");

  // Remove single line comments //...
  code = code.replace(/\/\/.*$/gm, "");

  return code;
}

// Usage example
const inputFile = "./src/commands/commit.ts";
const outputFile = "output.js";

fs.readFile(inputFile, "utf8", (err, data) => {
  if (err) {
    console.error("Error reading file:", err);
    return;
  }

  const cleaned = removeComments(data);

  fs.writeFile(outputFile, cleaned, (err) => {
    if (err) {
      console.error("Error writing file:", err);
      return;
    }
    console.log("Comments removed successfully!");
  });
});
