const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const app = require("../src/app");
const { config } = require("../src/config/env");
const { securityHeadersMiddleware } = require("../src/middleware/securityHeadersMiddleware");

function request(server, pathname) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request({ port, path: pathname }, (res) => {
      res.resume();
      res.on("end", () => resolve(res));
    });

    req.on("error", reject);
    req.end();
  });
}

async function withServer(callback) {
  const server = app.listen(0);

  try {
    await new Promise((resolve) => server.once("listening", resolve));
    return await callback(server);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("Express app sends general browser security headers", async () => {
  await withServer(async (server) => {
    const response = await request(server, "/health");

    assert.equal(response.headers["x-content-type-options"], "nosniff");
    assert.equal(response.headers["x-frame-options"], "DENY");
    assert.equal(response.headers["referrer-policy"], "no-referrer");
    assert.equal(response.headers["x-dns-prefetch-control"], "off");
    assert.equal(response.headers["x-permitted-cross-domain-policies"], "none");
    assert.equal(response.headers["cross-origin-resource-policy"], "same-origin");
    assert.equal(
      response.headers["permissions-policy"],
      "camera=(), microphone=(), geolocation=(), payment=()"
    );
    assert.equal(
      response.headers["content-security-policy"],
      "default-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    );
  });
});

test("security headers middleware sends HSTS only in production", () => {
  const originalNodeEnv = config.nodeEnv;
  const headers = {};
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };

  try {
    config.nodeEnv = "production";
    securityHeadersMiddleware({}, res, () => {});

    assert.equal(headers["Strict-Transport-Security"], "max-age=15552000; includeSubDomains");
  } finally {
    config.nodeEnv = originalNodeEnv;
  }
});
