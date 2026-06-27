const { config } = require("../config/env");

function getHealth(_req, res) {
  res.json({
    ok: true,
    model: config.model
  });
}

module.exports = {
  getHealth,
};

