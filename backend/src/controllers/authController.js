const {
  loginUser,
  registerUser
} = require("../services/authService");

async function registerHandler(req, res, next) {
  try {
    const result = await registerUser(req.body || {});
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

async function loginHandler(req, res, next) {
  try {
    const result = await loginUser(req.body || {});
    res.json(result);
  } catch (error) {
    next(error);
  }
}

async function meHandler(req, res, next) {
  try {
    res.json(req.auth.api);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  loginHandler,
  meHandler,
  registerHandler
};
