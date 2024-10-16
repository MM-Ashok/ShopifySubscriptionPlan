// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";
import mongoose from "mongoose";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";

const PORT = parseInt(process.env.BACKEND_PORT || process.env.PORT || "3000", 10);
const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();
app.use(express.json()); // Parse incoming JSON requests

// Set up Shopify authentication and webhook handling
app.get(shopify.config.auth.path, shopify.auth.begin());
app.get(
  shopify.config.auth.callbackPath,
  shopify.auth.callback(),
  shopify.redirectToShopifyOrAppRoot()
);
app.post(
  shopify.config.webhooks.path,
  shopify.processWebhooks({ webhookHandlers: PrivacyWebhookHandlers })
);

app.use("/api/*", shopify.validateAuthenticatedSession());
app.use("/subdata/*", shopify.validateAuthenticatedSession());

// MongoDB connection using Mongoose
const mongoURI = "mongodb+srv://ranjeetgautam498:Y96LTNUCUTlfKg9j@shopifysubscription.ebrke.mongodb.net/shopify_subscription_app";

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("-- Connected to Mongo successfully --"))
  .catch((error) => console.error("-- Mongo connection error: ", error));

// Mongoose error handler
mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

// Define the SellingPlan and Plan Schemas
const SellingPlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price_adjustments: [{ adjustment_type: String, value: Number }],
  delivery_policy: {
    interval: { type: String, required: true },
    interval_count: { type: Number, required: true },
  },
});

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  delivery_frequency: { type: Number, required: true },
  delivery_interval: { type: String, required: true },
  discount: { type: Number, required: true },
  discount_type: { type: String, required: true },
  products: { type: [String], required: true }, // Array of product IDs
  selling_plans: { type: [SellingPlanSchema], required: true },
  created_at: { type: Date, default: Date.now },
});

const Plan = mongoose.model("Plan", PlanSchema);

// Route to handle subscription data
app.get("/subdata/subscription", async (req, res) => {
  try {
    const subscriptionOptions = [
      {
        id: 1,
        name: "Monthly Subscription",
        delivery_frequency: "30 days",
        discount: 10,
      },
    ];
    res.status(200).json(subscriptionOptions);
  } catch (error) {
    console.error("Error fetching subscription options:", error);
    res.status(500).send("Error fetching subscription options.");
  }
});

// Authenticate Shopify store
app.use("/subdata/*", async (req, res, next) => {
  let shop = req.query.shop;
  if (!shop) return res.status(400).send("Missing shop parameter");

  let storeName = await shopify.config.sessionStorage.findSessionsByShop(shop);
  if (storeName && storeName.length > 0 && shop === storeName[0].shop) {
    next();
  } else {
    res.status(401).send("Sub not auth");
  }
});

// Read shop information
app.get("/api/store/info", async (req, res) => {
  try {
    const storeInfo = await shopify.api.rest.Shop.all({
      session: res.locals.shopify.session,
    });
    res.status(200).send(storeInfo);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch store info" });
  }
});

// Fetch products from the store
app.get("/api/products", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const products = await shopify.api.rest.Product.all({ session });
    res.status(200).json(products);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch products" });
  }
});

// Create subscription plans
const plans = [];

app.post("/api/plans", async (req, res) => {
  const { selling_plan_group } = req.body;
  if (!selling_plan_group?.name || !selling_plan_group.selling_plans) {
    return res.status(400).send({ error: "Invalid selling plan group data" });
  }

  const newPlan = new Plan({
    name: selling_plan_group.name,
    delivery_frequency: selling_plan_group.selling_plans[0].delivery_policy.interval_count,
    delivery_interval: selling_plan_group.selling_plans[0].delivery_policy.interval,
    discount: selling_plan_group.selling_plans[0].price_adjustments[0].value,
    discount_type: selling_plan_group.selling_plans[0].price_adjustments[0].adjustment_type,
    products: selling_plan_group.products,
    selling_plans: selling_plan_group.selling_plans,
  });

  try {
    await newPlan.save();
    res.status(201).json(newPlan);
  } catch (error) {
    res.status(500).send({ error: "Failed to create subscription plan" });
  }
});

// Fetch all subscription plans
app.get("/api/plans", async (req, res) => {
  try {
    const plans = await Plan.find({});
    res.status(200).json(plans);
  } catch (error) {
    res.status(500).send({ error: "Failed to fetch plans" });
  }
});

// Update a subscription plan
app.put("/api/plans/:id", async (req, res) => {
  const { id } = req.params;
  const updatedData = req.body;

  try {
    const updatedPlan = await Plan.findByIdAndUpdate(id, updatedData, {
      new: true,
    });
    res.status(200).json(updatedPlan);
  } catch (error) {
    res.status(500).send({ error: "Failed to update plan" });
  }
});

// Delete a subscription plan
app.delete("/api/plans/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await Plan.findByIdAndDelete(id);
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ error: "Failed to delete plan" });
  }
});

// Fetch subscription plans related to a product
app.get("/api/plans/:productId", async (req, res) => {
  const { productId } = req.params;
  const filteredPlans = await Plan.find({
    products: productId,
  });
  res.status(200).json(filteredPlans);
});

// Shopify-specific routes
app.get("/apps/proxy", async (req, res) => {
  try {
    const response = await shopify.api.rest.SellingPlanGroup.all({
      session: res.locals.shopify.session,
    });
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch subscription plans" });
  }
});

// Product count route
app.get("/api/products/count", async (_req, res) => {
  const client = new shopify.api.clients.Graphql({
    session: res.locals.shopify.session,
  });

  const countData = await client.request(`
    query shopifyProductCount {
      productsCount {
        count
      }
    }
  `);
  res.status(200).send({ count: countData.data.productsCount.count });
});

// Create a new product in the store
app.post("/api/products", async (_req, res) => {
  try {
    await productCreator(res.locals.shopify.session);
    res.status(200).send({ success: true });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

// Static files and frontend handling
app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), (_req, res) => {
  res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
