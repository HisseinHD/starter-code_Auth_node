const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const userModel = require("../models/userModel");
const generateOTP = require("../utils/generateOTP");
const { v4 } = require("uuid");
const otpModel = require("../models/otpModel");
const transporter = require("../utils/mailTransporter");

// Register
const register = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await userModel.findOne({ email });
    if (userExists) {
      return res.status(409).send({ message: "L'email existe déjà" });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword,
    });

    const otp = generateOTP();
    const otpToken = v4();

    await otpModel.create({
      userId: user._id,
      otp,
      otpToken,
      purpose: "verify-email",
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Verification email",
      html: `
        <h1>Verification email</h1>
        <div>
            Use the above code to verify your email:<br>
            <strong>${otp}</strong>
        </div>`,
    });

    res.status(201).send({
      message: "L'utilisateur est ajouté",
      otpToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de l'ajout de l'utilisateur",
      error: error.message,
    });
  }
};

// Verify Email
const verify = async (req, res) => {
  const { otp, otpToken, purpose } = req.body;

  try {
    // Vérification du purpose
    if (purpose !== "verify-email") {
      return res.status(422).send({ message: "Purpose invalid" });
    }

    // Recherche de l'OTP
    const otpDetails = await otpModel.findOne({
      otpToken,
      purpose,
    });

    if (!otpDetails) {
      return res.status(404).send({
        message: "Demande de vérification introuvable ou expirée",
      });
    }

    // Vérification de l'expiration (ajoutez createdAt dans votre modèle OTP)
    const now = new Date();
    const otpAge = now - otpDetails.createdAt;
    const OTP_VALID_DURATION = 15 * 60 * 1000; // 15 minutes en millisecondes

    if (otpAge > OTP_VALID_DURATION) {
      await otpModel.findByIdAndDelete(otpDetails._id);
      return res.status(410).send({
        message: "Le code OTP a expiré",
      });
    }

    // Vérification du code OTP
    if (otp !== otpDetails.otp) {
      return res.status(406).send({
        message: "OTP invalide",
        hints: "Vérifiez le code ou demandez un nouvel OTP",
      });
    }

    // Marquer l'email comme vérifié
    const verifiedUser = await userModel.findByIdAndUpdate(
      otpDetails.userId,
      { isEmailVerified: true },
      { new: true }
    );

    // Supprimer l'OTP après utilisation
    await otpModel.findByIdAndDelete(otpDetails._id);

    res.send({
      message: "Email vérifié avec succès",
      user: {
        id: verifiedUser._id,
        name: verifiedUser.name,
        email: verifiedUser.email,
        isEmailVerified: true,
      },
    });
  } catch (error) {
    console.error("Erreur de vérification:", error);
    res.status(500).send({
      message: "Erreur lors de la vérification",
      error: error.message,
    });
  }
};
// Login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).send({ message: "Identifiants invalides" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).send({ message: "Email non vérifié" });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
      },
      process.env.SECRET_KEY,
      { expiresIn: "24h" }
    );

    res.send({
      message: "Connexion réussie",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de la connexion",
      error: error.message,
    });
  }
};
// Delete User
const deleteUser = async (req, res) => {
  try {
    const userId = req.userData.userId;
    const { password } = req.body;

    // Vérifier que l'utilisateur existe
    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    // Vérifier le mot de passe
    const isPasswordCorrect = bcrypt.compareSync(password, user.password);
    if (!isPasswordCorrect) {
      return res.status(401).send({ message: "Mot de passe incorrect" });
    }

    // Supprimer l'utilisateur et ses OTP associés
    await userModel.findByIdAndDelete(userId);
    await otpModel.deleteMany({ userId });

    res.send({
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de la suppression de l'utilisateur",
      error: error.message,
    });
  }
};
const updatePassword = async (req, res) => {
  try {
    // Vérification du corps de la requête
    if (!req.body || !req.body.oldPassword || !req.body.newPassword) {
      return res.status(400).send({
        message: "Données manquantes",
        details: "Les champs 'oldPassword' et 'newPassword' sont requis",
      });
    }

    const { oldPassword, newPassword } = req.body;
    const userId = req.userData.userId;

    // Validation des mots de passe
    if (newPassword.length < 8) {
      return res.status(400).send({
        message: "Mot de passe trop court",
        details: "Le nouveau mot de passe doit contenir au moins 8 caractères",
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    const isOldPasswordCorrect = bcrypt.compareSync(oldPassword, user.password);
    if (!isOldPasswordCorrect) {
      return res.status(401).send({
        message: "Ancien mot de passe incorrect",
        solution: "Vérifiez votre mot de passe actuel",
      });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).send({
      message: "Mot de passe modifié avec succès",
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Erreur updatePassword:", error);
    res.status(500).send({
      message: "Erreur lors de la modification du mot de passe",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Forgot Password
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await userModel.findOne({ email });
    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    const otp = generateOTP();
    const otpToken = v4();

    await otpModel.create({
      userId: user._id,
      otp,
      otpToken,
      purpose: "reset-password",
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: "Réinitialisation de mot de passe",
      html: `
        <h1>Réinitialisation de mot de passe</h1>
        <div>
            Utilisez ce code pour réinitialiser votre mot de passe:<br>
            <strong>${otp}</strong>
        </div>`,
    });

    res.send({
      message: "Email de réinitialisation envoyé",
      otpToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de l'envoi de l'email de réinitialisation",
      error: error.message,
    });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  const { otp, otpToken, newPassword } = req.body;

  try {
    const otpDetails = await otpModel.findOne({
      otpToken,
      purpose: "reset-password",
    });
    if (!otpDetails) {
      return res.status(404).send({ message: "OTP non trouvé" });
    }

    if (otp !== otpDetails.otp) {
      return res.status(406).send({ message: "OTP invalide" });
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);
    await userModel.findByIdAndUpdate(otpDetails.userId, {
      password: hashedPassword,
    });

    await otpModel.findByIdAndDelete(otpDetails._id);

    res.send({
      message: "Mot de passe réinitialisé avec succès",
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de la réinitialisation du mot de passe",
      error: error.message,
    });
  }
};

// Get User Profile
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    console.log(userId);
    const user = await userModel.findById(userId).select("-password");

    if (!user) {
      return res.status(404).send({ message: "Utilisateur non trouvé" });
    }

    res.send({
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: "Erreur lors de la récupération du profil",
      error: error.message,
    });
  }
};

// Update Profile
const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { name, email } = req.body;

    // Vérifier si l’e-mail est déjà pris par un autre utilisateur
    if (email) {
      const existingUser = await userModel.findOne({ email });

      if (existingUser && existingUser._id.toString() !== userId.toString()) {
        return res.status(400).json({
          message: "Cet email est déjà utilisé par un autre utilisateur.",
        });
      }
    }

    // Mettre à jour l'utilisateur
    const user = await userModel
      .findByIdAndUpdate(
        userId,
        { name, email },
        { new: true, runValidators: true }
      )
      .select("-password");

    if (!user) {
      return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    res.status(200).json({
      message: "Profil mis à jour avec succès",
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Erreur lors de la mise à jour du profil",
      error: error.message,
    });
  }
};

module.exports = {
  register,
  verify,
  login,
  updatePassword,
  forgotPassword,
  resetPassword,
  getProfile,
  updateProfile,
  deleteUser,
};
