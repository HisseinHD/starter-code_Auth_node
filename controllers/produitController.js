const Product = require("../models/productModel");

exports.createProduct = async (req, res) => {
  try {
    const { titre, prix, quantite, description, status } = req.body;

    // Validation de base
    if (!titre || !prix) {
      return res.status(400).json({
        success: false,
        message: "Le titre et le prix sont obligatoires",
      });
    }

    // Vérification si le product existe déjà pour cet utilisateur
    const productExist = await Product.findOne({
      titre: titre.trim(),
      user: req.user._id,
    });

    if (productExist) {
      return res.status(409).json({
        success: false,
        message: "Un produit avec ce nom existe déjà",
        existingProduct: {
          id: productExist._id,
          titre: productExist.titre,
          createdAt: productExist.createdAt,
        },
      });
    }

    // Création du product
    const newProduct = await Product.create({
      titre: titre.trim(),
      prix: parseFloat(prix),
      quantite: parseInt(quantite) || 1,
      description: description?.trim() || "",
      status: status || false,
      user: req.user._id,
    });

    return res.status(201).json({
      success: true,
      data: newProduct,
    });
  } catch (error) {
    console.error("Erreur création product:", error);

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
        message: "Ce product existe déjà (violation d'index unique)",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erreur serveur",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
// Récupérer tous les products avec pagination
exports.getAllProducts = async (req, res) => {
  try {
    // Pagination avec valeurs par défaut
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Construction de la requête de base
    let query = Product.find().populate("user", "name email");

    // Filtrage optionnel
    if (req.query.search) {
      query = query.find({
        titre: { $regex: req.query.search, $options: "i" },
      });
    }

    // Exécution parallèle des requêtes
    const [products, total] = await Promise.all([
      query.skip(skip).limit(limit).lean(),
      Product.countDocuments(query.getFilter()),
    ]);

    res.json({
      success: true,
      count: products.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: products,
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
// Récupérer un product par ID
exports.getProductById = async (req, res) => {
  try {
    // Validation de l'ID
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Format d'ID invalide",
      });
    }

    // Récupération du product avec population sécurisée
    const product = await Product.findById(req.params.id)
      .populate({
        path: "user",
        select: "name email createdAt", // Champs autorisés
        options: { lean: true }, // Optimisation des performances
      })
      .lean(); // Conversion en objet JS simple

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product non trouvé",
        suggestion: "Vérifiez l'ID du produit",
      });
    }

    // Vérification des droits d'accès améliorée
    const isOwner =
      product.user && product.user._id.toString() === req.user._id.toString();
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
    const productData = {
      ...product,
      user: {
        name: product.user.name,
        email: product.user.email,
      },
    };

    return res.json({
      success: true,
      data: productData,
    });
  } catch (error) {
    console.error("Erreur détaillée:", {
      error: error.message,
      params: req.params,
      user: req.user._id,
    });

    // Gestion spécifique des erreurs  (ID invalide)
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

// Mettre à jour un product
exports.updateProduct = async (req, res) => {
  try {
    const validationErrors = validateProductData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        errors: validationErrors,
      });
    }

    // Vérifier l'existence et les droits
    const existingProduct = await Product.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Produit non trouvé",
      });
    }

    if (
      existingProduct.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Modification non autorisée",
      });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
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
      data: updatedProduct,
    });
  } catch (error) {
    console.error("Erreur mise à jour produit:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la mise à jour du produit",
    });
  }
};

// Supprimer un product
exports.deleteProduct = async (req, res) => {
  try {
    // Vérifier l'existence et les droits
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product non trouvé",
      });
    }

    if (
      product.user.toString() !== req.user._id.toString() &&
      !req.user.isAdmin
    ) {
      return res.status(403).json({
        success: false,
        message: "Suppression non autorisée",
      });
    }

    await Product.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: "Product supprimé avec succès",
    });
  } catch (error) {
    console.error("Erreur suppression produit:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la suppression du produit",
    });
  }
};

// Récupérer les products d'un utilisateur
exports.getProductsByUser = async (req, res) => {
  try {
    // Vérifier les droits d'accès
    if (req.params.userId !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Accès non autorisé à ces produits",
      });
    }

    const products = await Product.find({ user: req.params.userId }).populate(
      "user",
      "-password"
    );

    return res.json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("Erreur récupération produits utilisateur:", error);
    return res.status(500).json({
      success: false,
      message: "Erreur lors de la récupération des produits",
    });
  }
};
