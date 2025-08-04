require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const userRouter = require("./routers/userRouter");
const produitRouter = require("./routers/produitRouter");
const app = express();
const PORT = process.env.PORT;

// Connect to MongoDB database
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Successfully connected to database");
  })
  .catch((error) => {
    console.error(error);
  });

// Middleware to handle any json payload data sent from a client
app.use(express.json());

// Routes

app.use("/auth", userRouter);
app.use("/produits", produitRouter);
// Expose the server on the defined port
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
