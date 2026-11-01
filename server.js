// Tiny local server so you can open the app at http://localhost:5500
// Run: node server.js   (no install needed)
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 5500;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".pdf": "application/pdf" };

http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split("?")[0]);
  const file = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);
  if (!file.startsWith(__dirname)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log("Saathi Health running at http://localhost:" + PORT));
