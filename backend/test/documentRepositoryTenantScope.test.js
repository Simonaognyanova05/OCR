const test = require("node:test");
const assert = require("node:assert/strict");
const Document = require("../src/models/Document");
const {
  findDocumentById,
  markDocumentExported
} = require("../src/services/documentRepository");

test("document repository rejects unscoped tenant document reads before querying", async () => {
  const originalFindOne = Document.findOne;
  let findOneCalled = false;

  Document.findOne = () => {
    findOneCalled = true;
    return null;
  };

  try {
    await assert.rejects(
      () => findDocumentById("507f1f77bcf86cd799439011"),
      /Tenant companyId is required/
    );
    assert.equal(findOneCalled, false);
  } finally {
    Document.findOne = originalFindOne;
  }
});

test("document repository rejects unscoped tenant export updates before querying", async () => {
  const originalFindOneAndUpdate = Document.findOneAndUpdate;
  let findOneAndUpdateCalled = false;

  Document.findOneAndUpdate = () => {
    findOneAndUpdateCalled = true;
    return null;
  };

  try {
    await assert.rejects(
      () => markDocumentExported("507f1f77bcf86cd799439011", "excel"),
      /Tenant companyId is required/
    );
    assert.equal(findOneAndUpdateCalled, false);
  } finally {
    Document.findOneAndUpdate = originalFindOneAndUpdate;
  }
});
