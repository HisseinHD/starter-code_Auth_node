const Produit = require("../models/produitModel");

exports.createProduit = async (req, res) => {
  try {
    const { titre, prix, quantite, description, status } = req.body;

    // Validation de base
    if (!titre || !prix) {
      return res.status(400).json({
        success: false,
        message: "Le titre et le prix sont obligatoires",
      });
    }

    // Vérification si le produit existe déjà pour cet utilisateur
    const produitExist = await Produit.findOne({
      titre: titre.trim(),
      user: req.user._id,
    });

    if (produitExist) {
      return res.status(409).json({
        success: false,
        message: "Un produit avec ce nom existe déjà",
        existingProduct: {
          id: produitExist._id,
          titre: produitExist.titre,
          createdAt: produitExist.createdAt,
        },
      });
    }

    // Création du produit
    const newProduit = await Produit.create({
      titre: titre.trim(),
      prix: parseFloat(prix),
      quantite: parseInt(quantite) || 1,
      description: description?.trim() || "",
      status: status || false,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: newProduit,
    });
  } catch (error) {
    console.error("Erreur création produit:", error);

    // Gestion des erreurs de validation Mongoose
    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        success: false,
        message: "Erreur de validation",
        errors,
      });
    }

    // Gestion des erreurs de duplication (au cas où l'index unique échoue)
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Ce produit existe déjà (violation d'index unique)",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Récupérer tous les produits avec pagination
exports.getAllProduits = async (req, res) => {
  try {
    // Pagination avec valeurs par défaut
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construction de la requête de base
    let query = Produit.find().populate("user", "name email");

    // Filtrage optionnel
    if (req.query.search) {
      query = query.find({
        titre: { $regex: req.query.search, $options: "i" },
      });
    }

    // Exécution parallèle des requêtes
    const [produits, total] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      Produit.countDocuments(query.getFilter()),
    ]);

    res.json({
      success: true,
      count: produits.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: produits,
    });
  } catch (error) {
    console.error("Erreur de récupération:", {
      error: error.message,
      stack: error.stack,
      query: req.query,
    });

    res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des produits",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Récupérer un produit par ID
exports.getProduitById = async (req, res) => {
  try {
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Format d'ID invalide",
      });
    }

    // Récupération du produit avec population sécurisée
    const produit = await Produit.findById(req.params.id)
      .populate({
        path: "user",
        select: "name email createdAt", // Champs autorisés
        options: { lean: true }, // Optimisation des performances
      })
      .lean(); // Conversion en objet JS simple

    if (!produit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
        suggestion: "Vérifiez l'ID du produit",
      });
    }

    // Vérification des droits d'accès améliorée
    const isOwner =
      produit.user && produit.user._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin"; // Supposant un champ 'role'

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé",
        details:
          "Vous n'avez pas les droits nécessaires pour accéder à ce produit",
        requiredRights: ["owner", "admin"],
      });
    }

    // Nettoyage des données sensibles avant envoi
    const produitData = {
      ...produit,
      user: {
        name: produit.user.name,
        email: produit.user.email,
      },
    };

    return res.json({
      success: true,
      data: produitData,
    });
  } catch (error) {
    console.error("Erreur détaillée:", {
      error: error.message,
      params: req.params,
      user: req.user._id,
    });

    // Gestion spécifique des erreurs CastError (ID invalide)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "ID de produit invalide",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Mettre à jour un produit
exports.updateProduit = async (req, res) => {
  try {
    const validationErrors = validateProduitData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    // Vérifier l'existence et les droits
    const existingProduit = await Produit.findById(req.params.id);
    if (!existingProduit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    if (
      existingProduit.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Modification non autorisée",
      });
    }

    const updatedProduit = await Produit.findByIdAndUpdate(
      req.params.id,
      {
        titre: req.body.titre,
        prix: req.body.prix,
        quantite: req.body.quantite,
        description: req.body.description,
        status: req.body.status,
        updatedAt: Date.now(),
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("user", "-password");

    return res.json({
      success: true,
      data: updatedProduit,
    });
  } catch (error) {
    console.error("Erreur mise à jour produit:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du produit",
    });
  }
};

// Supprimer un produit
exports.deleteProduit = async (req, res) => {
  try {
    // Vérifier l'existence et les droits
    const produit = await Produit.findById(req.params.id);
    if (!produit) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    if (
      produit.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Suppression non autorisée",
      });
    }

    await Produit.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Produit supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du produit",
    });
  }
};

// Récupérer les produits d'un utilisateur
exports.getProduitsByUser = async (req, res) => {
  try {
    // Vérifier les droits d'accès
    if (req.params.userId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à ces produits",
      });
    }

    const produits = await Produit.find({ user: req.params.userId }).populate(
      "user",
      "-password"
    );

    return res.json({
      success: true,
      count: produits.length,
      data: produits,
    });
  } catch (error) {
    console.error("Erreur récupération produits utilisateur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des produits",
    });
  }
};
