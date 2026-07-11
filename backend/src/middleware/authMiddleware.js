const { getAuthContext } = require("../services/authService");
const { isSystemAdmin } = require("../services/authService");
const { HttpError } = require("../utils/httpError");
const { verifyToken } = require("../utils/auth");

async function requireAuth(req, _res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      throw new HttpError(401, "Липсва Authorization Bearer token.");
    }

    const tokenPayload = verifyToken(token);
    if (!tokenPayload) {
      throw new HttpError(401, "Невалиден token.");
    }

    req.auth = await getAuthContext(tokenPayload);
    next();
  } catch (error) {
    next(error);
  }
}

function requireRole(allowedRoles) {
  return (req, _res, next) => {
    if (!req.auth || !allowedRoles.includes(req.auth.membership.role)) {
      next(new HttpError(403, "Нямаш права за това действие."));
      return;
    }

    next();
  };
}

function requireAdmin(req, _res, next) {
  if (!req.auth || !isSystemAdmin(req.auth.user)) {
    next(new HttpError(403, "Нямаш админ права за това действие."));
    return;
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  requireRole
};
