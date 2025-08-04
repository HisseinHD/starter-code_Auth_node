const jwt = require("jsonwebtoken");

const authMiddleware = async (req, res, next) => {
  // 1. Vérification du header Authorization
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      message: "Authorization header manquant",
      solution: "Ajoutez 'Authorization: Bearer <token>' dans les headers",
    });
  }

  // 2. Extraction et vérification du format Bearer
  const [bearer, token] = authHeader.split(" ");

  if (bearer !== "Bearer" || !token) {
    return res.status(401).json({
      success: false,
      message: "Format de token invalide",
      details: "Utilisez le format: 'Bearer <token>'",
    });
  }

  try {
    // 3. Vérification et décodage du token
    const decoded = jwt.verify(token, process.env.SECRET_KEY);

    // 4. Ajout des données utilisateur normalisées
    req.user = {
      // Utilisation de req.user au lieu de req.userData pour la convention
      _id: decoded.userId, // _id pour la compatibilité avec Mongoose
      email: decoded.email,
      role: decoded.role || "user", // Ajout d'un rôle par défaut
    };

    // 5. Vérification des données essentielles
    if (!req.user._id || !req.user.email) {
      throw new Error("Token incomplet");
    }

    next();
  } catch (error) {
    console.error("Erreur d'authentification:", error.message);

    // Gestion des erreurs spécifiques
    let statusCode = 401;
    let message = "Authentification échouée";

    if (error.name === "TokenExpiredError") {
      message = "Session expirée";
    } else if (error.name === "JsonWebTokenError") {
      message = "Token invalide";
    } else {
      statusCode = 400; // Bad Request pour les autres erreurs
    }

    return res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
      solution: "Connectez-vous à nouveau pour obtenir un nouveau token",
    });
  }
};

module.exports = authMiddleware;
