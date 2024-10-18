// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
//import Settings from "./models/settings";
import mongoose from "mongoose";



const PORT = parseInt(
  process.env.BACKEND_PORT || process.env.PORT || "3000",
  10
);

const STATIC_PATH =
  process.env.NODE_ENV === "production"
    ? `${process.cwd()}/frontend/dist`
    : `${process.cwd()}/frontend/`;

const app = express();

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

// If you are adding routes outside of the /api path, remember to
// also add a proxy rule for them in web/frontend/vite.config.js

app.use("/api/*", shopify.validateAuthenticatedSession());
app.use("/subdata/*", shopify.validateAuthenticatedSession());

app.use(express.json());

// Connect to MongoDB
//const mongoURI = "mongodb://localhost:27017/shopify_subscription_app";
const mongoURI = "mongodb+srv://ranjeetgautam498:Y96LTNUCUTlfKg9j@shopifysubscription.ebrke.mongodb.net/shopify_subscription_app";


mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => {
    console.log("-- Connected to Mongo successfully --");
})
.catch((error) => {
    console.error("-- Mongo connection error: ", error);
});

// Mongoose connection error event handler
mongoose.connection.on('error', (err) => {
    console.error('Mongoose connection error:', err);
});

const SettingsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Settings = mongoose.model("Settings", SettingsSchema);
//module.exports = Settings;

// Define the API endpoint to add settings
app.post("/api/settings", async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    return res.status(400).send("Name and email are required");
  }

  try {
    const newSettings = new Settings({ name, email });
    await newSettings.save();

    res.status(201).json({ message: "Settings saved successfully" });
  } catch (error) {
    console.error("Error saving settings:", error.message);
    res.status(500).send("Error saving settings: " + error.message);
  }
});



app.use("/subdata/*", async (req, res, next) => {
  console.log("Authenticated request incoming:", req.query.shop);  // Add logging
  let shop = req.query.shop;

  if (!shop) {
    return res.status(400).send("Missing shop parameter");
  }

  let storeName = await shopify.config.sessionStorage.findSessionsByShop(shop);
  if (storeName && storeName.length > 0 && shop === storeName[0].shop) {
    console.log("Shop authenticated:", shop);
    next();
  } else {
    console.error("Failed to authenticate shop:", shop);
    res.status(401).send("Sub not auth");
  }
});



//read shop information
app.get("/api/store/info", async (req, res) => {
  try {
    const storeInfo = await shopify.api.rest.Shop.all({
      session: res.locals.shopify.session,
    });
    res.status(200).send(storeInfo);
  } catch (error) {
    console.error("Error fetching store info:", error);
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
    console.error("Error fetching products:", error);
    res.status(500).send({ error: "Failed to fetch products" });
  }
});



// Handle creating a subscription plan
const plans = [];
// Handle creating a subscription plan
// app.post("/api/plans", async (req, res) => {
//   const { selling_plan_group } = req.body;
//   console.log('Received selling_plan_group data:', req.body);

//   if (!selling_plan_group || !selling_plan_group.name || !selling_plan_group.selling_plans) {
//     return res.status(400).send({ error: 'Invalid selling plan group data' });
//   }

//   const newPlan = {
//     id: Date.now(),
//     selling_plan_group,
//   };

//   plans.push(newPlan);
//   res.status(201).json(newPlan);
// });

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true },
  selling_plans: [
      {
          name: String,
          price_adjustments: [{ adjustment_type: String, value: Number }],
          delivery_policy: { interval: String, interval_count: Number }
      }
  ],
  products: [{ type: String }],  // Change ObjectId to String here
});


// Create a model from the schema
const Plan = mongoose.model('Plan', PlanSchema);

// Endpoint to save subscription plan
app.post('/api/plans', async (req, res) => {
  const { selling_plan_group } = req.body;

  if (!selling_plan_group || !selling_plan_group.name || !selling_plan_group.selling_plans) {
      return res.status(400).send({ error: 'Invalid selling plan group data' });
  }

  try {
      // Create a new plan document
      const newPlan = new Plan({
          name: selling_plan_group.name,
          selling_plans: selling_plan_group.selling_plans,
          products: selling_plan_group.products,
      });

      // Save the plan to the database
      const savedPlan = await newPlan.save();
      res.status(201).json(savedPlan);  // Send the saved plan in the response
  } catch (error) {
      console.error('Error saving plan to MongoDB:', error);  // Log the error to check what's going wrong
      res.status(500).json({ error: 'Failed to save the plan: ' + error.message });
  }
});

app.get('/apps/proxy', async (req, res) => {
  try {
    const response = await shopify.api.rest.SellingPlanGroup.all({
      session: res.locals.shopify.session,
    });
    res.json(response); // Send the subscription plans to the frontend
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});



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

app.post("/api/products", async (_req, res) => {
  let status = 200;
  let error = null;

  try {
    await productCreator(res.locals.shopify.session);
  } catch (e) {
    console.log(`Failed to process products/create: ${e.message}`);
    status = 500;
    error = e.message;
  }
  res.status(status).send({ success: status === 200, error });
});

app.use(shopify.cspHeaders());
app.use(serveStatic(STATIC_PATH, { index: false }));

app.use("/*", shopify.ensureInstalledOnShop(), async (_req, res, _next) => {
  return res
    .status(200)
    .set("Content-Type", "text/html")
    .send(
      readFileSync(join(STATIC_PATH, "index.html"))
        .toString()
        .replace("%VITE_SHOPIFY_API_KEY%", process.env.SHOPIFY_API_KEY || "")
    );
});

app.listen(PORT);
