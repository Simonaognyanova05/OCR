const test = require("node:test");
const assert = require("node:assert/strict");

const User = require("../src/models/User");

test("User email unique index is declared once", () => {
  const emailIndexes = User.schema.indexes().filter(([fields]) => {
    return fields.email === 1 && Object.keys(fields).length === 1;
  });

  assert.equal(emailIndexes.length, 1);
  assert.equal(emailIndexes[0][1].unique, true);
});
