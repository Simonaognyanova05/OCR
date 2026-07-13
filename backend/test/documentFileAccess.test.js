const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const app = require("../src/app");
const { config } = require("../src/config/env");
const Document = require("../src/models/Document");
const { findDocumentFileById } = require("../src/services/documentRepository");

function request(server, pathname, headers = {}) {
  const { port } = server.address();

  return new Promise((resolve, reject) => {
    const req = http.request({ port, path: pathname, headers }, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          body: Buffer.concat(chunks).toString("utf8")
        });
      });
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

test("uploaded files are not served through public /uploads", async () => {
  const uploadRoot = path.resolve(config.uploadDir);
  const filename = "public-access-regression.txt";
  const filePath = path.join(uploadRoot, filename);

  await fs.mkdir(uploadRoot, { recursive: true });
  await fs.writeFile(filePath, "sensitive");

  try {
    await withServer(async (server) => {
      const response = await request(server, `/uploads/${filename}`);
      assert.notEqual(response.statusCode, 200);
    });
  } finally {
    await fs.unlink(filePath).catch(() => {});
  }
});

test("document file endpoint denies anonymous requests before file access", async () => {
  await withServer(async (server) => {
    const response = await request(server, "/api/documents/507f1f77bcf86cd799439011/file");
    assert.equal(response.statusCode, 401);
  });
});

test("document file repository lookup is company scoped", async () => {
  const originalFindOne = Document.findOne;
  const documentId = "507f1f77bcf86cd799439011";
  const companyId = "507f1f77bcf86cd799439012";
  let capturedQuery;

  Document.findOne = (query) => {
    capturedQuery = query;
    return {
      select: async () => ({
        originalName: "invoice.pdf",
        originalFileName: "invoice.pdf",
        storedFile: "stored.pdf",
        mimeType: "application/pdf"
      })
    };
  };

  try {
    const result = await findDocumentFileById(documentId, companyId);

    assert.deepEqual(capturedQuery, { _id: documentId, companyId });
    assert.equal(result.storedFile, "stored.pdf");
  } finally {
    Document.findOne = originalFindOne;
  }
});

test("document file repository denies missing cross-company records", async () => {
  const originalFindOne = Document.findOne;

  Document.findOne = () => ({
    select: async () => null
  });

  try {
    await assert.rejects(
      () => findDocumentFileById("507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"),
      (error) => error.statusCode === 404
    );
  } finally {
    Document.findOne = originalFindOne;
  }
});

