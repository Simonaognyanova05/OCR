const test = require("node:test");
const assert = require("node:assert/strict");
const { buildReminderEmail } = require("../src/services/contractService");

test("contract reminder email escapes OCR-controlled HTML", () => {
  const email = buildReminderEmail(
    {
      original_name: "contract.docx",
      data: {
        title: "<img src=x onerror=alert(1)>",
        partyA: "A & B",
        summary: "</pre><a href=https://example.invalid>click</a>",
        importantClauses: []
      }
    },
    { company: { name: "Example <Company>" } }
  );

  assert.doesNotMatch(email.html, /<img|<a href|<Company>/);
  assert.match(email.html, /&lt;img/);
  assert.match(email.html, /A &amp; B/);
  assert.match(email.html, /&lt;\/pre&gt;/);
});