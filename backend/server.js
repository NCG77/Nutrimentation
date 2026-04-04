const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Function to analyze product health and assign safety tag
function analyzeProductHealth(product) {
  let score = 100;
  const warnings = [];
  let tag = 'GREEN'; // Default safe

  // Check for missing nutrition data
  if (!product.nutriments) {
    return {
      name: product.product_name || 'Unknown Product',
      barcode: product.code,
      image: product.image_front_url || null,
      warning: 'Insufficient nutrition data',
      tag: 'YELLOW',
      score: 0,
      nutriments: null,
      ingredients: null
    };
  }

  const nutriments = product.nutriments;

  // Analyze Sugar content (per 100g)
  if (nutriments['sugars_100g']) {
    const sugar = nutriments['sugars_100g'];
    if (sugar > 20) {
      score -= 25;
      warnings.push(`High sugar content: ${sugar}g per 100g`);
    } else if (sugar > 10) {
      score -= 10;
      warnings.push(`Moderate sugar content: ${sugar}g per 100g`);
    }
  }

  // Analyze Sodium content (per 100g)
  if (nutriments['sodium_100g']) {
    const sodium = nutriments['sodium_100g'];
    if (sodium > 600) {
      score -= 20;
      warnings.push(`High sodium content: ${sodium}mg per 100g`);
    } else if (sodium > 300) {
      score -= 8;
      warnings.push(`Moderate sodium content: ${sodium}mg per 100g`);
    }
  }

  // Analyze Saturated Fat (per 100g)
  if (nutriments['saturated-fat_100g']) {
    const satFat = nutriments['saturated-fat_100g'];
    if (satFat > 10) {
      score -= 20;
      warnings.push(`High saturated fat: ${satFat}g per 100g`);
    } else if (satFat > 5) {
      score -= 10;
      warnings.push(`Moderate saturated fat: ${satFat}g per 100g`);
    }
  }

  // Analyze Calories (per 100g)
  if (nutriments['energy-kcal_100g']) {
    const calories = nutriments['energy-kcal_100g'];
    if (calories > 400) {
      score -= 8;
      warnings.push(`High calorie density: ${calories} kcal per 100g`);
    }
  }

  // Check for ultra-processed ingredients
  if (product.ingredients_text) {
    const ingredientsLower = product.ingredients_text.toLowerCase();
    const badIngredients = [
      'high fructose corn syrup',
      'artificial flavors',
      'artificial colors',
      'propylene glycol',
      'butylated hydroxyanisole',
      'butylated hydroxytoluene',
      'sodium nitrite',
      'sodium nitrate'
    ];

    badIngredients.forEach(bad => {
      if (ingredientsLower.includes(bad)) {
        score -= 15;
        warnings.push(`Contains: ${bad}`);
      }
    });
  }

  // Determine tag based on final score
  if (score >= 70) {
    tag = 'GREEN';
  } else if (score >= 40) {
    tag = 'YELLOW';
  } else {
    tag = 'RED';
  }

  // Clean nutriments object for response
  const cleanNutriments = {};
  const keyNutriments = [
    'energy-kcal_100g',
    'fat_100g',
    'saturated-fat_100g',
    'carbohydrates_100g',
    'sugars_100g',
    'protein_100g',
    'sodium_100g',
    'fiber_100g'
  ];

  keyNutriments.forEach(key => {
    if (nutriments[key] !== undefined) {
      cleanNutriments[key] = nutriments[key];
    }
  });

  return {
    name: product.product_name || 'Unknown Product',
    barcode: product.code,
    brand: product.brands || 'Unknown Brand',
    image: product.image_front_url || null,
    category: product.categories || 'Unknown Category',
    tag: tag,
    score: Math.max(0, score),
    nutriments: cleanNutriments,
    ingredients: product.ingredients_text || 'Not available',
    warnings: warnings,
    allergens: product.allergens || 'Not specified',
    origin: product.origin_countries || 'Unknown'
  };
}

// Endpoint to scan product by barcode
app.post('/api/scan', async (req, res) => {
  try {
    const { barcode } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    // Fetch from Open Food Facts API
    const response = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`
    );

    if (response.data.status === 0) {
      return res.status(404).json({ 
        error: 'Product not found in database',
        barcode: barcode 
      });
    }

    const analyzedProduct = analyzeProductHealth(response.data.product);
    res.json(analyzedProduct);

  } catch (error) {
    console.error('Error scanning product:', error.message);
    res.status(500).json({ 
      error: 'Failed to scan product',
      details: error.message 
    });
  }
});

// Endpoint to search products by name
app.get('/api/search', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const response = await axios.get(
      `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${query}&page_size=10&json=1`
    );

    if (!response.data.products || response.data.products.length === 0) {
      return res.json({ 
        error: 'No products found',
        products: [] 
      });
    }

    const analyzed = response.data.products.map(product => 
      analyzeProductHealth(product)
    );

    res.json({ 
      count: analyzed.length,
      products: analyzed 
    });

  } catch (error) {
    console.error('Error searching products:', error.message);
    res.status(500).json({ 
      error: 'Failed to search products',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'API is running', timestamp: new Date() });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Scan endpoint: POST /api/scan`);
  console.log(`Search endpoint: GET /api/search?query=...`);
});

module.exports = app;