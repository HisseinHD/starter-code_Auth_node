require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();
const PORT = 3000;

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("Connected to database successfully.");
  })
  .catch((error) => {
    console.log("Connection to database failed:::", error);
  });

const schema = mongoose.Schema({
  productName: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  stockStatus: {
    type: String,
    enum: ["in-stock", "low-stock", "out-of-stock"],
    default: "in-stock",
  },
});

const productModel = mongoose.model("products", schema);

app.use(express.json());

app.get("/products", async (req, res) => {
  const products = await productModel.find();
  res.send(products);
});

app.get("/products/:id", async (req, res) => {
  const id = req.params.id;

  const product = await productModel.findById(id);

  if (!product) {
    res.status(404).send("Product not found.");
    return;
  }

  res.send({
    message: "Product found",
    product,
  });
});

app.post("/products", async (req, res) => {
  const { productName, price, stockStatus } = req.body;

  const allowedStatus = ["in-stock", "low-stock", "out-of-stock"];

  if (stockStatus && !allowedStatus.includes(stockStatus)) {
    // bad request
    res
      .status(400)
      .send(
        `The products stock status should be one the followings: ${allowedStatus}`
      );
    return;
  }

  const product = await productModel.create({
    productName,
    price,
    stockStatus,
  });

  res.send({
    message: "Product successfully added.",
    product,
  });
});

app.patch("/products/:id", async (req, res) => {
  const id = req.params.id;
  const { productName, price } = req.body;

  const productExists = await productModel.findById(id);

  if (!productExists) {
    res.status(404).send("Product not found");
    return;
  }

  const updatedProduct = await productModel.findByIdAndUpdate(
    id,
    { productName, price },
    { new: true }
  );

  res.send({
    message: "Product updated successfully.",
    updatedProduct,
  });
});

app.patch("/products/:id/:status", async (req, res) => {
  const id = req.params.id;
  const stockStatus = req.params.status;

  const productExists = await productModel.findById(id);

  if (!productExists) {
    res.status(404).send("Product not found");
    return;
  }

  const allowedStatus = ["in-stock", "low-stock", "out-of-stock"];
  if (!allowedStatus.includes(stockStatus)) {
    // bad request
    res
      .status(400)
      .send(
        `The products stock status should be one the followings: ${allowedStatus}`
      );
    return;
  }

  const updatedProduct = await productModel.findByIdAndUpdate(
    id,
    { stockStatus },
    { new: true }
  );

  res.send({
    message: "Product status updated successfully.",
    updatedProduct,
  });
});

app.delete("/products/:id", async (req, res) => {
  const id = req.params.id;

  const deletedProduct = await productModel.findByIdAndDelete(id);

  if (!deletedProduct) {
    res.status(404).send("Product not found.");
    return;
  }

  res.send({
    message: "Product deleted successfully.",
    deletedProduct,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
