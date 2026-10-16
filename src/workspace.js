const safeText = (value) => String(value ?? "").replace(/[<>]/g, "");

function componentSource(output) {
  const pages = (output?.schemas?.ui_schema?.pages || []).slice(0, 30).map((page) => ({
    title: safeText(page.title || page.name || "Page"),
    route: safeText(page.route || "/"),
    components: Array.isArray(page.components) ? page.components.slice(0, 12) : []
  }));
  const appName = safeText(output?.intent?.app_name || "Generated application");
  return `import { useState } from "react";\nimport "./styles.css";\n\nconst appName = ${JSON.stringify(appName)};\nconst pages = ${JSON.stringify(pages, null, 2)};\n\nexport default function App() {\n  const [activePage, setActivePage] = useState(pages[0]?.route || "/");\n  const page = pages.find((item) => item.route === activePage) || pages[0];\n\n  return (\n    <main className="app-shell">\n      <header className="app-header"><strong>{appName}</strong><span>Generated from your approved blueprint</span></header>\n      <nav aria-label="Application pages">\n        {pages.map((item) => <button key={item.route} type="button" aria-current={activePage === item.route ? "page" : undefined} onClick={() => setActivePage(item.route)}>{item.title}</button>)}\n      </nav>\n      <section className="app-page">\n        <p className="eyebrow">{page?.route}</p>\n        <h1>{page?.title || appName}</h1>\n        <p>This starter view is based on your generated UI schema. Connect the listed components to application data before production use.</p>\n        <div className="component-list">{(page?.components || []).map((component, index) => <article key={index}><strong>{typeof component === "string" ? component : component.name || "UI component"}</strong><span>Blueprint component</span></article>)}</div>\n      </section>\n    </main>\n  );\n}\n`;
}

const starterStyles = `:root { font-family: Inter, ui-sans-serif, system-ui, sans-serif; color: #f4f6fc; background: #0b1020; }\n* { box-sizing: border-box; }\nbody { margin: 0; min-height: 100vh; }\n.app-shell { max-width: 1080px; margin: 0 auto; padding: 28px; }\n.app-header { display: flex; justify-content: space-between; gap: 16px; padding: 18px 0; border-bottom: 1px solid #252d40; }\n.app-header span, .app-page > p { color: #9ca8c0; }\nnav { display: flex; flex-wrap: wrap; gap: 8px; padding: 18px 0; }\nbutton { padding: 9px 13px; border: 1px solid #303a52; border-radius: 10px; color: inherit; background: #151c2e; cursor: pointer; }\nbutton[aria-current="page"] { border-color: #8e83ff; background: #272447; }\n.app-page { margin-top: 18px; padding: clamp(22px, 5vw, 48px); border: 1px solid #252d40; border-radius: 20px; background: #101729; }\n.eyebrow { color: #a69cff !important; font-size: 12px; font-weight: 700; }\n.component-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 30px; }\n.component-list article { display: grid; gap: 6px; padding: 16px; border: 1px solid #2a3347; border-radius: 12px; background: #141d31; }\n.component-list span { color: #929eb5; font-size: 12px; }\n@media (max-width: 600px) { .app-shell { padding: 16px; } .app-header { flex-direction: column; } }\n`;

export function createWorkspaceFiles(output) {
  if (!output?.schemas) return [];
  const schemas = output.schemas;
  const appName = safeText(output.intent?.app_name || "Generated application");
  const files = [
    { path: "README.md", language: "markdown", content: `# ${appName}\n\nStarter project generated from the AI Compiler Studio blueprint.\n\n## Included\n- React starter interface based on the generated UI pages\n- Blueprint and schema JSON\n- API, database, access, and business logic specifications\n\n## Run locally\n1. Install Node.js 20 or newer.\n2. Run \`npm install\`.\n3. Run \`npm run dev\` to start the preview.\n4. Run \`npm run build\` to create a production bundle.\n\nThis is a starter scaffold. Review and connect real services before production use.\n` },
    { path: "package.json", language: "json", content: JSON.stringify({ name: String(output.intent?.app_name || "generated-app").toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "generated-app", private: true, version: "0.1.0", type: "module", scripts: { dev: "vite", build: "vite build" }, dependencies: { react: "^19.2.0", "react-dom": "^19.2.0", vite: "^8.0.0" } }, null, 2) + "\n" },
    { path: "index.html", language: "html", content: `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta name="theme-color" content="#0b1020" />\n    <title>${appName}</title>\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.jsx"></script>\n  </body>\n</html>\n` },
    { path: "src/main.jsx", language: "jsx", content: `import React from "react";\nimport { createRoot } from "react-dom/client";\nimport App from "./App.jsx";\nimport "./styles.css";\n\ncreateRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);\n` },
    { path: "src/App.jsx", language: "jsx", content: componentSource(output) },
    { path: "src/styles.css", language: "css", content: starterStyles },
    { path: "blueprint.json", language: "json", content: JSON.stringify({ intent: output.intent, design: output.design, schemas }, null, 2) + "\n" },
    ...Object.entries(schemas).map(([name, value]) => ({ path: `schemas/${name}.json`, language: "json", content: JSON.stringify(value, null, 2) + "\n" }))
  ];
  return files;
}

export function diffText(before = "", after = "") {
  const left = String(before).split("\n");
  const right = String(after).split("\n");
  const rows = [];
  if (left.length > 1_200 || right.length > 1_200) return positionalDiff(left, right);
  const columns = right.length + 1;
  const lengths = new Uint16Array((left.length + 1) * columns);
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      lengths[i * columns + j] = left[i] === right[j]
        ? lengths[(i + 1) * columns + j + 1] + 1
        : Math.max(lengths[(i + 1) * columns + j], lengths[i * columns + j + 1]);
    }
  }
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      rows.push({ type: "same", line: left[i], oldLine: i + 1, newLine: j + 1 });
      i += 1;
      j += 1;
    } else if (i < left.length && (j >= right.length || lengths[(i + 1) * columns + j] >= lengths[i * columns + j + 1])) {
      rows.push({ type: "removed", line: left[i], oldLine: i + 1 });
      i += 1;
    } else {
      rows.push({ type: "added", line: right[j], newLine: j + 1 });
      j += 1;
    }
  }
  return rows;
}

function positionalDiff(left, right) {
  const rows = [];
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i += 1) {
    if (left[i] === right[i]) rows.push({ type: "same", line: left[i] ?? "", oldLine: i + 1, newLine: i + 1 });
    else {
      if (left[i] !== undefined) rows.push({ type: "removed", line: left[i], oldLine: i + 1 });
      if (right[i] !== undefined) rows.push({ type: "added", line: right[i], newLine: i + 1 });
    }
  }
  return rows;
}

export function containsLikelySecret(value) {
  const text = String(value || "");
  return /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{16,}|nvapi-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AIza[A-Za-z0-9_-]{25,}|GOCSPX-[A-Za-z0-9_-]{16,})\b|(?:mongodb(?:\+srv)?:\/\/)[^\s"']+|\b(?:API_KEY|CLIENT_SECRET|ACCESS_TOKEN|PASSWORD)\s*[:=]\s*["']?[^"'\s]{12,}/i.test(text);
}
