const express = require("express");
const router = express.Router();
const ProduitController = require("../controllers/produitController");
const authMiddleware = require("../middlewares/authMiddleware");

// Appliquer le middleware d'authentification à toutes les routes
router.use(authMiddleware);

// Routes pour les produits
router.post("/", ProduitController.createProduit);
router.get("/", ProduitController.getAllProduits);
router.get("/user/:userId", ProduitController.getProduitsByUser);
router.get("/:id", ProduitController.getProduitById);
router.put("/:id", ProduitController.updateProduit);
router.delete("/:id", ProduitController.deleteProduit);

module.exports = router;
