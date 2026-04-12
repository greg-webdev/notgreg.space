const fs = require("node:fs/promises");
const path = require("node:path");

const ROOT_DIR = path.resolve(__dirname, "..", "mods");

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function encodeSegment(segment) {
  return encodeURIComponent(segment).replace(/%2F/gi, "/");
}

function buildBreadcrumbSegments(relativeParts) {
  const crumbs = [];
  const depth = relativeParts.length;

  crumbs.push({
    label: "mods",
    href: `${"../".repeat(depth) || "./"}index.html`,
  });

  for (let i = 0; i < depth; i += 1) {
    const levelsUp = depth - (i + 1);
    crumbs.push({
      label: relativeParts[i],
      href: `${"../".repeat(levelsUp) || "./"}index.html`,
    });
  }

  return crumbs;
}

function renderPage(currentDir, relativeParts, directories, files) {
  const isRoot = relativeParts.length === 0;
  const parentLink = isRoot ? "" : '<a class="back" href="../index.html">.. (parent)</a>';
  const titlePath = `/mods${relativeParts.length ? `/${relativeParts.join("/")}` : ""}`;
  const zipEntries = files.map((name) => ({
    name,
    href: encodeSegment(name),
  }));
  const zipEntriesJson = JSON.stringify(zipEntries);

  const breadcrumbHtml = buildBreadcrumbSegments(relativeParts)
    .map((crumb, index, list) => {
      const sep = index < list.length - 1 ? " / " : "";
      return `<a href="${crumb.href}">${escapeHtml(crumb.label)}</a>${sep}`;
    })
    .join("");

  const directoryItems = directories
    .map((name) => {
      const encoded = encodeSegment(name);
      return `<li><a class="dir-link" href="${encoded}/index.html">${escapeHtml(name)}/</a></li>`;
    })
    .join("\n");

  const fileItems = files
    .map((name) => {
      const encoded = encodeSegment(name);
      return `<li>
        <a class="file-link" href="${encoded}">${escapeHtml(name)}</a>
        <a class="download-link" href="${encoded}" download>download</a>
      </li>`;
    })
    .join("\n");

  const rootZipControls = isRoot && files.length
    ? `<button id="download-zip-btn" class="zip-download-btn" type="button">download zip</button>
        <p id="download-zip-status" class="zip-status" aria-live="polite"></p>`
    : "";

  const rootZipScript = isRoot && files.length
    ? `<script src="https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"></script>
  <script>
    (() => {
      const button = document.getElementById("download-zip-btn");
      const status = document.getElementById("download-zip-status");
      if (!button || !status || typeof JSZip === "undefined") {
        return;
      }

      const entries = ${zipEntriesJson};

      const setStatus = (message) => {
        status.textContent = message;
      };

      button.addEventListener("click", async () => {
        button.disabled = true;
        setStatus("Preparing zip...");

        try {
          const zip = new JSZip();

          for (let i = 0; i < entries.length; i += 1) {
            const entry = entries[i];
            setStatus("Fetching " + (i + 1) + "/" + entries.length + ": " + entry.name);

            const response = await fetch(entry.href);
            if (!response.ok) {
              throw new Error("Failed to fetch " + entry.name);
            }

            zip.file(entry.name, await response.blob());
          }

          let lastPercent = -1;
          const archiveBlob = await zip.generateAsync(
            { type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } },
            (metadata) => {
              const percent = Math.floor(metadata.percent);
              if (percent !== lastPercent) {
                lastPercent = percent;
                setStatus("Compressing: " + percent + "%");
              }
            }
          );

          const blobUrl = URL.createObjectURL(archiveBlob);
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = "mods-files.zip";
          document.body.appendChild(link);
          link.click();
          link.remove();
          URL.revokeObjectURL(blobUrl);
          setStatus("ZIP downloaded.");
        } catch (error) {
          console.error(error);
          setStatus("Could not build zip. Check browser console for details.");
        } finally {
          button.disabled = false;
        }
      });
    })();
  </script>`
    : "";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titlePath)} index</title>
  <style>
    :root {
      color-scheme: light dark;
      --bg: #f5f7fa;
      --panel: #ffffff;
      --text: #0f172a;
      --muted: #475569;
      --line: #d0d7de;
      --accent: #0b5fff;
      --accent-soft: rgba(11, 95, 255, 0.1);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0d1117;
        --panel: #161b22;
        --text: #e6edf3;
        --muted: #9aa4b2;
        --line: #2f3945;
        --accent: #6ea8fe;
        --accent-soft: rgba(110, 168, 254, 0.18);
      }
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Segoe UI", Tahoma, sans-serif;
      background: linear-gradient(160deg, var(--bg), color-mix(in oklab, var(--bg), #7aa2ff 12%));
      color: var(--text);
      min-height: 100vh;
      padding: 24px;
    }

    .container {
      max-width: 980px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 14px;
      padding: 20px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    h1 {
      margin: 0 0 10px;
      font-size: 1.35rem;
      word-break: break-word;
    }

    nav {
      margin: 0 0 16px;
      font-size: 0.95rem;
      color: var(--muted);
      word-break: break-word;
    }

    nav a {
      color: var(--accent);
      text-decoration: none;
    }

    nav a:hover {
      text-decoration: underline;
    }

    .back {
      display: inline-block;
      margin: 0 0 12px;
      padding: 6px 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      text-decoration: none;
      color: var(--accent);
      background: var(--accent-soft);
      font-size: 0.9rem;
    }

    .grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    }

    section {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      background: color-mix(in oklab, var(--panel), var(--bg) 28%);
    }

    h2 {
      margin: 0 0 10px;
      font-size: 1.05rem;
    }

    ul {
      margin: 0;
      padding-left: 18px;
    }

    li {
      margin: 0 0 8px;
      line-height: 1.35;
      word-break: break-word;
    }

    a {
      color: var(--accent);
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    .download-link {
      margin-left: 8px;
      font-size: 0.82rem;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 2px 6px;
      background: var(--accent-soft);
    }

    .empty {
      color: var(--muted);
      font-style: italic;
    }

    .files-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .files-head h2 {
      margin: 0;
    }

    .zip-download-btn {
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--accent-soft);
      color: var(--accent);
      font: inherit;
      font-size: 0.9rem;
      padding: 6px 10px;
      cursor: pointer;
    }

    .zip-download-btn:disabled {
      opacity: 0.65;
      cursor: progress;
    }

    .zip-status {
      margin: 0;
      width: 100%;
      font-size: 0.84rem;
      color: var(--muted);
    }
  </style>
</head>
<body>
  <main class="container">
    <h1>${escapeHtml(titlePath)}</h1>
    <nav>${breadcrumbHtml}</nav>
    ${parentLink}
    <div class="grid">
      <section>
        <h2>Folders (${directories.length})</h2>
        ${directories.length ? `<ul>${directoryItems}</ul>` : '<p class="empty">No folders.</p>'}
      </section>
      <section>
        <div class="files-head">
          <h2>Files (${files.length})</h2>
          ${rootZipControls}
        </div>
        ${files.length ? `<ul>${fileItems}</ul>` : '<p class="empty">No files.</p>'}
      </section>
    </div>
  </main>
  ${rootZipScript}
</body>
</html>`;
}

async function collectDirectories(startDir) {
  const queue = [startDir];
  const directories = [];

  while (queue.length) {
    const current = queue.shift();
    directories.push(current);

    let entries = [];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        queue.push(path.join(current, entry.name));
      }
    }
  }

  return directories;
}

async function writeIndexes(rootDir) {
  const dirs = await collectDirectories(rootDir);
  let count = 0;

  for (const dirPath of dirs) {
    const relative = path.relative(rootDir, dirPath);
    const relativeParts = relative ? relative.split(path.sep) : [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    const directories = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const files = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase() !== "index.html")
      .map((entry) => entry.name)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));

    const html = renderPage(dirPath, relativeParts, directories, files);
    await fs.writeFile(path.join(dirPath, "index.html"), html, "utf8");
    count += 1;
  }

  return count;
}

(async () => {
  try {
    const rootStat = await fs.stat(ROOT_DIR);
    if (!rootStat.isDirectory()) {
      throw new Error(`Not a directory: ${ROOT_DIR}`);
    }

    const written = await writeIndexes(ROOT_DIR);
    console.log(`Wrote ${written} index.html files under ${ROOT_DIR}`);
  } catch (error) {
    console.error("Failed to generate mods indexes:");
    console.error(error);
    process.exitCode = 1;
  }
})();
