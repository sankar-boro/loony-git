export const log = {
  section: (title: string) => {
    console.log(`\n==================== ${title} ====================`);
  },
  info: (msg: string) => {
    console.log(`ℹ️  ${msg}`);
  },
  success: (msg: string) => {
    console.log(`✅ ${msg}`);
  },
  warn: (msg: string) => {
    console.warn(`⚠️  ${msg}`);
  },
  error: (msg: string) => {
    console.error(`❌ ${msg}`);
  },
  tree: (depth: number, msg: string) => {
    const indent = "  ".repeat(depth);
    console.log(`${indent}📁 ${msg}`);
  },
  file: (depth: number, msg: string) => {
    const indent = "  ".repeat(depth);
    console.log(`${indent}📄 ${msg}`);
  },
};
