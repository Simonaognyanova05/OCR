const test = require("node:test");
const assert = require("node:assert/strict");
const { errorMiddleware, genericServerErrorMessage } = require("../src/middleware/errorMiddleware");
const { HttpError } = require("../src/utils/httpError");

function createResponse() {
  return {
    statusCode: null,
    body: null,
    status(statusCode) {
      this.statusCode = statusCode;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };
}

test("expected HttpError messages are returned to clients", () => {
  const res = createResponse();

  errorMiddleware(new HttpError(403, "Access denied"), {}, res, () => {});

  assert.equal(res.statusCode, 403);
  assert.deepEqual(res.body, {
    error: {
      message: "Access denied"
    }
  });
});

test("unexpected server errors return a generic message", () => {
  const res = createResponse();

  errorMiddleware(new Error("database path C:\\secret\\details failed"), {}, res, () => {});

  assert.equal(res.statusCode, 500);
  assert.deepEqual(res.body, {
    error: {
      message: genericServerErrorMessage
    }
  });
});
