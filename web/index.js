// @ts-check
import { join } from "path";
import { readFileSync } from "fs";
import express from "express";
import serveStatic from "serve-static";

import shopify from "./shopify.js";
import productCreator from "./product-creator.js";
import PrivacyWebhookHandlers from "./privacy.js";
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

// Conection with mongoose

// Connect to MongoDB
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

app.get("/subdata/subscription", async (req, res) => {
  try {
    console.log("Incoming request for subscription options");

    const subscriptionOptions = [
      {
        id: 1,
        name: "Monthly Subscription",
        delivery_frequency: "30 days",
        discount: 10,
      },
    ];

    // Log the subscription options for debugging
    console.log("Sending subscription options:", subscriptionOptions);

    res.status(200).json(subscriptionOptions);
  } catch (error) {
    console.error("Error fetching subscription options:", error); // Log the error for debugging
    res.status(500).send("Error fetching subscription options.");
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
app.post("/api/plans", async (req, res) => {
  const { selling_plan_group } = req.body;
  console.log('Received selling_plan_group data:', req.body);

  if (!selling_plan_group || !selling_plan_group.name || !selling_plan_group.selling_plans) {
    return res.status(400).send({ error: 'Invalid selling plan group data' });
  }

  const newPlan = {
    id: Date.now(),
    selling_plan_group,
  };

  plans.push(newPlan);
  res.status(201).json(newPlan);
});


// Handle fetching all subscription plans
app.get("/api/plans", async (req, res) => {
  try {
    const session = res.locals.shopify.session;
    const plansWithProducts = [];

    // Loop through your existing plans
    for (const plan of plans) {
      // Extract product IDs
      const productIds = plan.selling_plan_group.products;

      // Fetch product details for each product ID
      const productsWithNames = await Promise.all(
        productIds.map(async (productId) => {
          try {
            const productResponse = await shopify.api.rest.Product.find({
              session,
              id: productId,
            });
            return {
              id: productId,
              name: productResponse.title, // Get the product name
            };
          } catch (error) {
            console.error(`Failed to fetch product ${productId}`);
            return { id: productId, name: 'Unknown Product' }; // Handle failure
          }
        })
      );

      // Add the product names to the plan object
      const planWithProductNames = {
        ...plan,
        product_names: productsWithNames,
      };

      plansWithProducts.push(planWithProductNames);
    }

    res.status(200).json(plansWithProducts); // Send updated plans with product names
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).send({ error: "Failed to fetch plans" });
  }
});


// Handle deleting a subscription plan
app.delete("/api/plans/:id", async (req, res) => {
  const { id } = req.params;
  const planIndex = plans.findIndex((plan) => plan.id == id);
  if (planIndex !== -1) {
    plans.splice(planIndex, 1);
    return res.status(200).send({ success: true });
  } else {
    return res.status(404).send({ error: "Plan not found" });
  }
});

// Handle edit a subscription plan
app.get("/api/plans/:id", async (req, res) => {
  const session = res.locals.shopify.session; // Shopify session
  const { id } = req.params;

  try {
    // Find the plan by ID
    const plan = plans.find((plan) => plan.id == id);
    if (!plan) {
      return res.status(404).send({ error: "Plan not found" });
    }

    // Fetch product details (name) for the products in the plan
    const productIds = plan.selling_plan_group.products;
    const productsWithNames = await Promise.all(
      productIds.map(async (productId) => {
        try {
          const productResponse = await shopify.api.rest.Product.find({
            session,
            id: productId,
          });
          return {
            id: productId,
            name: productResponse.title, // Get product name
          };
        } catch (error) {
          console.error(`Failed to fetch product ${productId}`);
          return { id: productId, name: 'Unknown Product' };
        }
      })
    );

    // Return the plan with the product names included
    const planWithProductNames = {
      ...plan,
      product_names: productsWithNames,
    };

    res.status(200).json(planWithProductNames);
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).send({ error: "Failed to fetch plan" });
  }
});

// Handle update a subscription plan
app.put("/api/plans/:id", async (req, res) => {
  console.log("Update request received:", req.body);  // Log incoming data

  const { id } = req.params;
  const { selling_plan_group } = req.body;

  if (!selling_plan_group || !selling_plan_group.name || !selling_plan_group.selling_plans) {
    return res.status(400).send({ error: 'Invalid selling plan group data' });
  }

  const planIndex = plans.findIndex((plan) => plan.id == id);

  if (planIndex !== -1) {
    // Update the plan
    plans[planIndex].selling_plan_group = selling_plan_group;
    res.status(200).json(plans[planIndex]);
  } else {
    res.status(404).send({ error: "Plan not found" });
  }
});

app.get("/api/plans/:productId", async (req, res) => {
  const { productId } = req.params;
  const filteredPlans = plans.filter(plan =>
    plan.selling_plan_group.selling_plans.some(sp => sp.product_id === productId)
  );
  res.status(200).json(filteredPlans);
});
// Assuming you have Express set up


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
