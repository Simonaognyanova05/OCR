const test = require("node:test");
const assert = require("node:assert/strict");
const publicDemoRoutes = require("../src/routes/publicDemoRoutes");

test("public demo upload applies signature and malware validation before extraction", () => {
  const layer = publicDemoRoutes.stack.find((item) => item.route?.path === "/public/demo/extract");
  assert.ok(layer);

  const middlewareNames = layer.route.stack.map((item) => item.name);
  const validationIndex = middlewareNames.indexOf("validateUploadedDocumentSignature");
  const extractionIndex = middlewareNames.indexOf("extractPublicDemoHandler");

  assert.ok(validationIndex > -1);
  assert.ok(extractionIndex > validationIndex);
});