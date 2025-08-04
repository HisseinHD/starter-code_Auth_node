const mongoose = require("mongoose");
const { type } = require("os");
const { ref } = require("process");


const produitSchema = mongoose.Schema({
  titre: {
    type: String,
    require: true,
  },
  prix: {
    type: Number,
    require: true,
  },
  quantite: {
    type: Number,
    require: true,
    default: 1,
  },
  description: {
    type: String,
  },
  status: {
    type: Boolean,
    default: false,
  },
 user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Doit correspondre exactement au nom du modèle User
    required: true
  },
  createdAt: {
    type: Date,
    require: true,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    require: true,
    default: Date.now,
  }
});
  
module.exports = mongoose.model("Produit", produitSchema);