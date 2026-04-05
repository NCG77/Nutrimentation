"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Login from '../login_page/page';
import './index.css';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

function analyzeProductHealth(product) {
  let score = 100;
  const warnings = [];
  let tag = 'GREEN';

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

  if (nutriments['energy-kcal_100g']) {
    const calories = nutriments['energy-kcal_100g'];
    if (calories > 400) {
      score -= 8;
      warnings.push(`High calorie density: ${calories} kcal per 100g`);
    }
  }

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

  if (score >= 70) {
    tag = 'GREEN';
  } else if (score >= 40) {
    tag = 'YELLOW';
  } else {
    tag = 'RED';
  }

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

async function generateAISummaryWithGemini(product) {
  try {
    if (!process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const nutriments = product.nutriments || {};
    
    const productSummary = `
      Product: ${product.name}
      Brand: ${product.brand}
      Score: ${product.score}/100
      Category: ${product.category}
      
      Nutrition per 100g:
      - Calories: ${nutriments['energy-kcal_100g'] || 'N/A'} kcal
      - Protein: ${nutriments['protein_100g'] || 'N/A'}g
      - Carbs: ${nutriments['carbohydrates_100g'] || 'N/A'}g
      - Sugar: ${nutriments['sugars_100g'] || 'N/A'}g
      - Fat: ${nutriments['fat_100g'] || 'N/A'}g
      - Saturated Fat: ${nutriments['saturated-fat_100g'] || 'N/A'}g
      - Sodium: ${nutriments['sodium_100g'] || 'N/A'}mg
      - Fiber: ${nutriments['fiber_100g'] || 'N/A'}g
      
      Ingredients: ${product.ingredients || 'Not available'}
      Warnings: ${product.warnings && product.warnings.length > 0 ? product.warnings.join(', ') : 'None'}
    `;

    const prompt = `You are a nutritional health analyst. Analyze this product and provide a JSON response with the following structure:
    {
      "summary": "A 1-2 sentence overall assessment",
      "strengths": ["strength1", "strength2", "strength3"],
      "concerns": ["concern1", "concern2"],
      "recommendation": "Brief recommendation for consumption",
      "highlights": ["highlight1", "highlight2"],
      "healthScore": "number 0-100"
    }
    
    Product Details:
    ${productSummary}
    
    Provide ONLY valid JSON, no other text.`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = result.response.text();
    
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Could not parse JSON response');
    }
    
    const aiAnalysis = JSON.parse(jsonMatch[0]);
    return aiAnalysis;

  } catch (error) {
    console.error('Error generating AI summary:', error.message);
    return generateFallbackAISummary(product);
  }
}

function generateFallbackAISummary(product) {
  const nutri = product.nutriments || {};
  const score = product.score || 0;
  
  const sugar = nutri['sugars_100g'] || 0;
  const sodium = nutri['sodium_100g'] || 0;
  const saturated = nutri['saturated-fat_100g'] || 0;
  const fiber = nutri['fiber_100g'] || 0;
  const protein = nutri['protein_100g'] || 0;
  const fat = nutri['fat_100g'] || 0;
  const calories = nutri['energy-kcal_100g'] || 0;

  const strengths = [];
  if (protein > 8) strengths.push(`high protein (${protein.toFixed(1)}g)`);
  if (fiber > 3) strengths.push(`rich in fiber (${fiber.toFixed(1)}g)`);
  if (calories < 100) strengths.push('low calorie density');
  if (saturated < 2) strengths.push('low in saturated fat');
  if (sodium < 200) strengths.push('low sodium');
  if (sugar < 5) strengths.push('minimal added sugars');

  const concerns = [];
  if (sugar > 15) concerns.push(`high sugar intake (${sugar.toFixed(1)}g)`);
  if (sodium > 500) concerns.push(`elevated sodium (${sodium.toFixed(0)}mg)`);
  if (saturated > 5) concerns.push(`significant saturated fat (${saturated.toFixed(1)}g)`);
  if (calories > 250) concerns.push('calorie-dense per 100g');
  if (fat > 15) concerns.push('high total fat content');

  return {
    summary: score >= 75 ? 'Excellent nutritional quality' : 
             score >= 55 ? 'Good balance with some considerations' :
             score >= 40 ? 'Moderate nutrition with concerns' :
             'Limited nutritional value',
    strengths: strengths.slice(0, 3),
    concerns: concerns.slice(0, 2),
    recommendation: score >= 75 ? 'Excellent for daily consumption' :
                   score >= 55 ? 'Good for regular consumption' :
                   score >= 40 ? 'Use occasionally' :
                   'Limit consumption',
    highlights: product.warnings && product.warnings.length > 0 ? 
               product.warnings.slice(0, 2) : 
               ['Nutrition analyzed', 'Safety assessed'],
    healthScore: Math.max(0, product.score)
  };
}

function App() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (loading) {
    return (
      <div className="app loading-container">
        <p>Loading...</p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (err) {
      setError('Camera access denied. Please enable camera permissions.');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      setIsCameraActive(false);
    }
  };

  const extractBarcodeFromImage = async (imageData) => {
    try {
      setIsProcessing(true);
      setError('');

      // Convert canvas image data to base64
      const base64Image = imageData.split(',')[1] || imageData;

      const prompt = `Look at this image and extract any barcode or product code numbers visible in it. 
      Return ONLY the numeric barcode code as a plain number with no other text or formatting. 
      If you see a barcode, code, or number, return just the number (e.g., "5901234123457").
      If you cannot find any barcode or code, return "NOT_FOUND".`;

      const result = await geminiModel.generateContent([
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image,
          },
        },
        prompt,
      ]);

      const extractedCode = result.response.text().trim();

      if (extractedCode === 'NOT_FOUND' || !extractedCode || extractedCode.length < 8) {
        setError('No barcode detected in image. Please try another photo or enter barcode manually.');
        setIsProcessing(false);
        return;
      }

      // Clean the extracted code (remove any non-numeric characters)
      const cleanCode = extractedCode.replace(/\D/g, '');

      if (cleanCode.length < 8) {
        setError('Invalid barcode detected. Please try another photo.');
        setIsProcessing(false);
        return;
      }

      setBarcode(cleanCode);
      // Automatically scan the extracted barcode
      await scanProduct(cleanCode);
    } catch (err) {
      console.error('Error extracting barcode:', err);
      setError('Failed to extract barcode from image. Please try again or enter manually.');
    } finally {
      setIsProcessing(false);
    }
  };

  const captureFrame = async () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
      const imageData = canvasRef.current.toDataURL('image/jpeg');
      await extractBarcodeFromImage(imageData);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      setError('');

      const reader = new FileReader();
      reader.onload = async (event) => {
        const imageData = event.target?.result;
        if (imageData && typeof imageData === 'string') {
          await extractBarcodeFromImage(imageData);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  const scanProduct = async (code) => {
    if (!code.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setIsScanning(true);
    setError('');
    setProduct(null);
    setAiAnalysis(null);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`
      );

      const data = await response.json();

      if (data.status === 0) {
        setError('Product not found in database');
        setIsScanning(false);
        return;
      }

      const analyzedProduct = analyzeProductHealth(data.product);
      setProduct(analyzedProduct);
      stopCamera();

      const analysis = await generateAISummaryWithGemini(analyzedProduct);
      if (analysis) {
        setAiAnalysis(analysis);
      }
    } catch (err) {
      setError('Failed to fetch product data. Please check your internet connection.');
      console.error('Error:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleBarcodeInput = (e) => {
    const value = e.target.value;
    setBarcode(value);
  };

  const handleLogout = async () => {
    await logout();
    setMenuOpen(false);
    router.push('/src/login_page');
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1 className="logo">Nutrimentation</h1>
          <p className="tagline">Discover product quality</p>
        </div>
        
        <div className="header-menu">
          <button 
            className={`hamburger ${menuOpen ? 'active' : ''}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          
          {menuOpen && (
            <div className="user-menu">
              <div className="user-info">
                <p className="username">{user?.displayName || 'User'}</p>
                <p className="email">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="logout-btn"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container">
        {!product ? (
          <>
            <section className="scanner-section">
                <div className="section-header">
                  <h2>Scan Product</h2>
                </div>
                
                <div className="scanner-input-group">
                  <input
                    type="text"
                    placeholder="Enter barcode numbers..."
                    value={barcode}
                    onChange={handleBarcodeInput}
                    className="barcode-input"
                    autoFocus
                  />
                  <button 
                    onClick={() => scanProduct(barcode)}
                    disabled={isScanning}
                    className="btn btn-primary"
                  >
                    {isScanning ? 'Scanning...' : 'Search'}
                  </button>
                </div>

                <div className="divider"></div>

                <div className="camera-section">
                  <h3 className="section-subtitle">Or use camera</h3>
                  {!isCameraActive ? (
                    <div className="camera-options">
                      <button onClick={startCamera} className="btn btn-secondary">
                        📷 Open Camera
                      </button>
                      <span className="divider-text">or</span>
                      <label htmlFor="file-upload" className="btn btn-secondary btn-upload">
                        📁 Upload Photo
                      </label>
                      <input
                        id="file-upload"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        style={{ display: 'none' }}
                        disabled={isProcessing}
                      />
                    </div>
                  ) : (
                    <div className="camera-wrapper">
                      <video ref={videoRef} autoPlay playsInline />
                      <canvas ref={canvasRef} style={{ display: 'none' }} width="640" height="480" />
                      <div className="camera-controls">
                        <button 
                          onClick={captureFrame} 
                          className="btn btn-capture"
                          disabled={isProcessing}
                        >
                          {isProcessing ? '⏳ Processing...' : '📸 Click Photo'}
                        </button>
                        <button 
                          onClick={stopCamera} 
                          className="btn btn-close"
                          disabled={isProcessing}
                        >
                          ✕ Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {error && <div className="alert alert-error">{error}</div>}
              </section>
          </>
        ) : (
          <>
            <section className="product-section">
              <button 
                onClick={() => {
                  setProduct(null);
                  setAiAnalysis(null);
                }}
                className="btn-back"
              >
                ← Back to Search
              </button>

              <ProductCard product={product} detailed={true} aiAnalysis={aiAnalysis} />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ProductCard({ product, detailed = false, aiAnalysis = null }) {
  if (!product) return null;

  const tagColor = getTagColor(product.tag);

  return (
    <div className={`product-card ${detailed ? 'detailed' : ''}`}>
      {product.image && (
        <img src={product.image} alt={product.name} className="product-image" />
      )}

      <div className="product-header">
        <h3>{product.name}</h3>
        <div className="product-meta">
          <span className="brand">{product.brand}</span>
          <span className="category">{product.category}</span>
        </div>
      </div>

      <div className="safety-badge" style={{ borderColor: tagColor }}>
        <div className="score-circle" style={{ backgroundColor: tagColor }}>
          <span className="score-value">{Math.round(product.score)}</span>
          <span className="score-label">Score</span>
        </div>
        <div className="safety-info">
          <div className="tag" style={{ backgroundColor: tagColor }}>
            {product.tag} — {getTagMessage(product.tag)}
          </div>
        </div>
      </div>

      {detailed && (
        <div className="detailed-info">
          <section className="health-summary-section">
            <div className="summary-header">
              <h4>Health Overview</h4>
              <div className="health-badge">{getHealthRating(product)}</div>
            </div>
            <p className="health-description">{getHealthDescription(product)}</p>
          </section>

          <section className="ai-summary-section">
            <div className="ai-header">
              <h4>AI Nutritional Summary</h4>
            </div>
            <div className="ai-analysis">
              {renderAISummary(product, aiAnalysis)}
            </div>
          </section>

          <section className="health-metrics-section">
            <h4>Nutritional Breakdown</h4>
            <div className="metrics-grid">
              {getHealthMetrics(product).map((metric) => (
                <div key={metric.label} className="metric-card">
                  <div className="metric-label">{metric.label}</div>
                  <div className="metric-value">{metric.value}</div>
                  <div className={`metric-status ${metric.status}`}>{metric.status}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="macro-section">
            <h4>Macronutrient Balance</h4>
            <div className="macro-breakdown">
              {renderMacroAnalysis(product)}
            </div>
          </section>

          <section className="nutrition-section">
            <h4>Detailed Nutrition Facts</h4>
            <p className="section-note">Per 100 grams</p>
            <div className="nutrition-grid">
              {product.nutriments && Object.entries(product.nutriments).map(([key, value]) => (
                <div key={key} className="nutrition-item">
                  <span className="nutri-label">{formatNutrimentLabel(key)}</span>
                  <span className="nutri-value">{value.toFixed(1)}{getUnit(key)}</span>
                </div>
              ))}
            </div>
          </section>

          {product.warnings && product.warnings.length > 0 && (
            <section className="warnings-section">
              <h4>Health Warnings</h4>
              <ul className="warnings-list">
                {product.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="ingredients-section">
            <h4>Ingredients</h4>
            <p className="ingredients-text">{product.ingredients}</p>
          </section>

          {product.allergens && product.allergens !== 'Not specified' && (
            <section className="allergens-section">
              <h4>Allergens</h4>
              <p>{product.allergens}</p>
            </section>
          )}

          <div className="product-footer">
            <span className="barcode">Barcode: {product.barcode}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getTagColor(tag) {
  switch(tag) {
    case 'GREEN': return '#10b981';
    case 'YELLOW': return '#f59e0b';
    case 'RED': return '#ef4444';
    default: return '#6b7280';
  }
}

function getTagMessage(tag) {
  switch(tag) {
    case 'GREEN': return 'Healthy & Safe';
    case 'YELLOW': return 'Consume Moderately';
    case 'RED': return 'Limit Consumption';
    default: return 'Unknown';
  }
}

function formatNutrimentLabel(key) {
  const labels = {
    'energy-kcal_100g': 'Calories',
    'fat_100g': 'Total Fat',
    'saturated-fat_100g': 'Saturated Fat',
    'carbohydrates_100g': 'Carbs',
    'sugars_100g': 'Sugars',
    'protein_100g': 'Protein',
    'sodium_100g': 'Sodium',
    'fiber_100g': 'Fiber'
  };
  return labels[key] || key;
}

function getUnit(key) {
  if (key === 'sodium_100g') return 'mg';
  if (key === 'energy-kcal_100g') return ' kcal';
  return 'g';
}

function getHealthRating(product) {
  const score = product.score || 0;
  if (score >= 75) return '✓ Excellent';
  if (score >= 55) return '◐ Good';
  if (score >= 40) return '⚠ Fair';
  return '✗ Poor';
}

function getHealthDescription(product) {
  const score = product.score || 0;
  const nutri = product.nutriments || {};
  
  const sugar = nutri['sugars_100g'] || 0;
  const sodium = nutri['sodium_100g'] || 0;
  const saturated = nutri['saturated-fat_100g'] || 0;
  const fiber = nutri['fiber_100g'] || 0;
  const protein = nutri['protein_100g'] || 0;

  let description = '';

  if (score >= 75) {
    description = `This is a highly nutritious product. ${protein > 5 ? 'High in protein, ' : ''}${fiber > 5 ? 'good source of fiber, ' : ''}and balanced in key nutrients.`;
  } else if (score >= 55) {
    description = `A reasonably healthy choice. ${sugar > 10 ? 'Contains elevated sugar levels. ' : ''}${sodium > 400 ? 'Watch sodium intake. ' : ''}Overall good nutritional value.`;
  } else if (score >= 40) {
    description = `Moderate nutrition with some concerns. ${sugar > 15 ? 'High sugar content. ' : ''}${saturated > 5 ? 'Elevated saturated fat. ' : ''}${sodium > 500 ? 'High in sodium. ' : ''}Consume in moderation.`;
  } else {
    description = `Limited nutritional value. ${sugar > 20 ? 'Very high in sugar. ' : ''}${saturated > 8 ? 'High in saturated fat. ' : ''}${sodium > 800 ? 'Excessive sodium. ' : ''}Consider healthier alternatives.`;
  }

  return description;
}

function getHealthMetrics(product) {
  const nutri = product.nutriments || {};
  
  const sugar = nutri['sugars_100g'] || 0;
  const sodium = nutri['sodium_100g'] || 0;
  const saturated = nutri['saturated-fat_100g'] || 0;
  const fiber = nutri['fiber_100g'] || 0;
  const protein = nutri['protein_100g'] || 0;
  const calories = nutri['energy-kcal_100g'] || 0;

  return [
    {
      label: 'Sugar Impact',
      value: `${sugar.toFixed(1)}g`,
      status: sugar > 15 ? 'high' : sugar > 5 ? 'moderate' : 'low'
    },
    {
      label: 'Sodium Level',
      value: `${sodium.toFixed(0)}mg`,
      status: sodium > 500 ? 'high' : sodium > 200 ? 'moderate' : 'low'
    },
    {
      label: 'Saturated Fat',
      value: `${saturated.toFixed(1)}g`,
      status: saturated > 5 ? 'high' : saturated > 2 ? 'moderate' : 'low'
    },
    {
      label: 'Fiber Content',
      value: `${fiber.toFixed(1)}g`,
      status: fiber > 3 ? 'high' : fiber > 1 ? 'moderate' : 'low'
    },
    {
      label: 'Protein Level',
      value: `${protein.toFixed(1)}g`,
      status: protein > 10 ? 'high' : protein > 5 ? 'moderate' : 'low'
    },
    {
      label: 'Energy Density',
      value: `${calories.toFixed(0)} kcal`,
      status: calories > 250 ? 'high' : calories > 100 ? 'moderate' : 'low'
    }
  ];
}

function renderMacroAnalysis(product) {
  const nutri = product.nutriments || {};
  
  const protein = nutri['protein_100g'] || 0;
  const carbs = nutri['carbohydrates_100g'] || 0;
  const fat = nutri['fat_100g'] || 0;
  const fiber = nutri['fiber_100g'] || 0;
  
  const total = protein + carbs + fat;
  const proteinPct = total > 0 ? ((protein / total) * 100).toFixed(0) : 0;
  const carbsPct = total > 0 ? ((carbs / total) * 100).toFixed(0) : 0;
  const fatPct = total > 0 ? ((fat / total) * 100).toFixed(0) : 0;

  return (
    <div className="macro-bars">
      <div className="macro-bar">
        <div className="macro-label">Protein: {proteinPct}%</div>
        <div className="macro-bar-bg">
          <div className="macro-bar-fill" style={{width: `${proteinPct}%`, background: '#10b981'}}></div>
        </div>
      </div>
      <div className="macro-bar">
        <div className="macro-label">Carbs: {carbsPct}%</div>
        <div className="macro-bar-bg">
          <div className="macro-bar-fill" style={{width: `${carbsPct}%`, background: '#f59e0b'}}></div>
        </div>
      </div>
      <div className="macro-bar">
        <div className="macro-label">Fat: {fatPct}%</div>
        <div className="macro-bar-bg">
          <div className="macro-bar-fill" style={{width: `${fatPct}%`, background: '#ef4444'}}></div>
        </div>
      </div>
      <p className="macro-note">Fiber content: {fiber.toFixed(1)}g ({fiber > 3 ? 'Excellent' : fiber > 1 ? 'Good' : 'Low'})</p>
    </div>
  );
}

function renderAISummary(product, aiAnalysis = null) {
  if (aiAnalysis) {
    return (
      <div className="ai-summary-content">
        <p className="ai-intro">
          <strong>✓ Summary:</strong> {aiAnalysis.summary}
        </p>
        
        {aiAnalysis.strengths && aiAnalysis.strengths.length > 0 && (
          <p className="ai-strengths">
            <strong>Strengths:</strong> {aiAnalysis.strengths.join(', ')}.
          </p>
        )}
        
        {aiAnalysis.concerns && aiAnalysis.concerns.length > 0 && (
          <p className="ai-concerns">
            <strong>Considerations:</strong> {aiAnalysis.concerns.join(', ')}.
          </p>
        )}
        
        <p className="ai-recommendation">
          <strong>Recommendation:</strong> {aiAnalysis.recommendation}
        </p>
      </div>
    );
  }

  const nutri = product.nutriments || {};
  const score = product.score || 0;
  
  const sugar = nutri['sugars_100g'] || 0;
  const sodium = nutri['sodium_100g'] || 0;
  const saturated = nutri['saturated-fat_100g'] || 0;
  const fiber = nutri['fiber_100g'] || 0;
  const protein = nutri['protein_100g'] || 0;
  const fat = nutri['fat_100g'] || 0;
  const calories = nutri['energy-kcal_100g'] || 0;

  const strengths = [];
  if (protein > 8) strengths.push(`high protein (${protein.toFixed(1)}g)`);
  if (fiber > 3) strengths.push(`rich in fiber (${fiber.toFixed(1)}g)`);
  if (calories < 100) strengths.push('low calorie density');
  if (saturated < 2) strengths.push('low in saturated fat');
  if (sodium < 200) strengths.push('low sodium');
  if (sugar < 5) strengths.push('minimal added sugars');

  const concerns = [];
  if (sugar > 15) concerns.push(`high sugar intake (${sugar.toFixed(1)}g)`);
  if (sodium > 500) concerns.push(`elevated sodium (${sodium.toFixed(0)}mg)`);
  if (saturated > 5) concerns.push(`significant saturated fat (${saturated.toFixed(1)}g)`);
  if (calories > 250) concerns.push('calorie-dense per 100g');
  if (fat > 15) concerns.push('high total fat content');

  let title, emoji;
  if (score >= 75) {
    title = 'Excellent Choice';
    emoji = '✓';
  } else if (score >= 55) {
    title = 'Good Option';
    emoji = '◐';
  } else if (score >= 40) {
    title = 'Fair Quality';
    emoji = '⚠';
  } else {
    title = 'Limited Nutrition';
    emoji = '✗';
  }

  return (
    <div className="ai-summary-content">
      <p className="ai-intro">
        <strong>{emoji} {title}:</strong> {getIntroText(score)}
      </p>
      
      {strengths.length > 0 && (
        <p className="ai-strengths">
          <strong>Strengths:</strong> {strengths.slice(0, 3).join(', ')}.
        </p>
      )}
      
      {concerns.length > 0 && (
        <p className="ai-concerns">
          <strong>Considerations:</strong> {concerns.slice(0, 2).join(', ')}.
        </p>
      )}
      
      <p className="ai-recommendation">
        <strong>Recommendation:</strong> {getRecommendation(score)}
      </p>
    </div>
  );
}

function getIntroText(score) {
  if (score >= 75) return 'This product offers superior nutritional quality.';
  if (score >= 55) return 'A nutritionally balanced choice for most diets.';
  if (score >= 40) return 'Contains some nutrients but has nutritional concerns.';
  return 'Low nutritional value with potential health concerns.';
}

function getRecommendation(score) {
  if (score >= 75) return 'Excellent for daily consumption as part of a balanced diet.';
  if (score >= 55) return 'Good for regular consumption with balanced meal planning.';
  if (score >= 40) return 'Use occasionally or in moderation within a balanced diet.';
  return 'Limit consumption; seek healthier alternatives.';
}

export default App;