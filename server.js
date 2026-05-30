import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import authHandler from "./api/auth.js";
import compileHandler from "./api/compile.js";
import { loadLocalEnv } from "./src/env.js";

const root = process.cwd();
const port = Number(process.env.PORT || 5173);

loadLocalEnv();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.url?.startsWith("/api/compile") || req.url?.startsWith("/api/generate")) {
      const bodyText = await readRequestBody(req);
      req.body = bodyText ? JSON.parse(bodyText) : {};
      
      // Attempt to proxy to Python FastAPI backend running on port 8000
      try {
        const response = await fetch("http://127.0.0.1:8000/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ prompt: req.body.prompt })
        });
        if (response.ok) {
          const payload = await response.json();
          return createApiResponse(res).status(200).json(payload);
        }
      } catch (proxyError) {
        // Fallback to Express handler if Python FastAPI server is offline
      }
      
      return compileHandler(req, createApiResponse(res));
    }

    if (req.url?.startsWith("/api/auth")) {
      const bodyText = await readRequestBody(req);
      req.body = bodyText ? JSON.parse(bodyText) : {};
      return authHandler(req, createApiResponse(res));
    }

    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const safePath = normalize(requested).replace(/^(\.\.[/\\])+/, "");
    const filePath = join(root, safePath);
    const body = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream"
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
});

server.listen(port, () => {
  console.log(`AI Software Compiler running at http://localhost:${port}`);
});

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function createApiResponse(res) {
  return {
    setHeader(name, value) {
      res.setHeader(name, value);
      return this;
    },
    status(code) {
      res.statusCode = code;
      return this;
    },
    json(payload) {
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
    }
  };
}
