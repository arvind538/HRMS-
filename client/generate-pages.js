// generate-pages.js
// Ye script menuConfig.js padh kar saari missing route pages automatically bana deti hai.
// Jo page.jsx pehle se exist karti hai (jaise /employees, /dashboard) usse chhuta hi nahi jayega — sirf missing wale banenge.

const fs = require("fs");
const path = require("path");

const menuConfigPath = path.join(__dirname, "src", "data", "menuConfig.js");
const dashboardGroupPath = path.join(__dirname, "src", "app", "(dashboard)");

// menuConfig.js ko text ke roop mein padho (JSX icons ki wajah se seedha require nahi kar sakte)
const rawContent = fs.readFileSync(menuConfigPath, "utf-8");

// label aur href pairs nikaalo regex se
// pattern: label: "XYZ" ... href: "/abc/def"
const regex = /label:\s*"([^"]+)"[\s\S]*?href:\s*"([^"]+)"/g;

let match;
let created = 0;
let skipped = 0;

while ((match = regex.exec(rawContent)) !== null) {
  const label = match[1];
  const href = match[2]; // e.g. "/organization/company"

  // href se leading slash hatao aur folder path banao
  const relativePath = href.replace(/^\//, ""); // "organization/company"
  const folderPath = path.join(dashboardGroupPath, relativePath);
  const pageFilePath = path.join(folderPath, "page.jsx");

  // agar page.jsx pehle se hai, chhod do — kuch overwrite nahi karna
  if (fs.existsSync(pageFilePath)) {
    skipped++;
    continue;
  }

  // folder banao (recursive: true taaki nested paths bhi ek baar mein ban jayen)
  fs.mkdirSync(folderPath, { recursive: true });

  // component ka function name banao label se — spaces/slashes hatao
  const componentName =
    label.replace(/[^a-zA-Z0-9]/g, "") + "Page";

  const fileContent = `import EmptyModulePage from "@/components/ui/EmptyModulePage";

export default function ${componentName}() {
  return (
    <EmptyModulePage
      title="${label}"
      description="${label} se judi details yaha manage/dikhengi. Backend model + API ready hote hi ye page live data ke saath connect ho jayega."
    />
  );
}
`;

  fs.writeFileSync(pageFilePath, fileContent, "utf-8");
  created++;
  console.log(`✅ Created: ${href}`);
}

console.log("\n--- Summary ---");
console.log(`Total created: ${created}`);
console.log(`Total skipped (already existed): ${skipped}`);