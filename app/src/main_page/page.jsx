"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Login from '../login_page/page';
import BarcodeScanner from './BarcodeScanner';
import MultiModelAnalysisDisplay from './MultiModelAnalysis';
import './index.css';

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
    origin: product.origin_countries || 'Unknown',
    source: product.source || 'open-food-facts'
  };
}

async function generateAISummary(product, userPrefs = null) {
  try {
    if (product.score >= 70 && (!product.warnings || product.warnings.length === 0)) {
      return generateFallbackAISummary(product);
    }

    // Call multi-model analysis
    try {
      const multiAnalysisResponse = await fetch('/api/multi-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          product, 
          userPrefs,
          searchData: null // Can be populated if search results are available
        })
      });

      if (multiAnalysisResponse.ok) {
        const multiData = await multiAnalysisResponse.json();
        if (multiData.analysis) {
          return multiData.analysis;
        }
      }
    } catch (multiErr) {
      console.error('Multi-model analysis failed, falling back to simple analysis:', multiErr);
    }

    // Fallback to simple analysis if multi-model fails
    const nutriments = product.nutriments || {};
    
    const productSummary = `Name: ${product.name}, Brand: ${product.brand}, Score: ${product.score}/100\nCalories: ${nutriments['energy-kcal_100g'] || 0}, Protein: ${nutriments['protein_100g'] || 0}g, Sugar: ${nutriments['sugars_100g'] || 0}g, Fat: ${nutriments['fat_100g'] || 0}g, Sodium: ${nutriments['sodium_100g'] || 0}mg\nWarnings: ${product.warnings && product.warnings.length > 0 ? product.warnings.join(', ') : 'None'}`;

    let prefContext = '';
    if (userPrefs?.dietTypes?.length > 0) {
      prefContext += `\nUser's dietary focus: ${userPrefs.dietTypes.join(', ')}.`;
    }
    if (userPrefs?.customHealthProblems?.trim()) {
      prefContext += `\nUser's health concerns: ${userPrefs.customHealthProblems}.`;
    }
    if (prefContext) {
      prefContext += ' Provide analysis and recommendations relevant to their specific needs and goals.';
    }

    const explanationRequest = userPrefs?.showExplanations 
      ? `\nFor concerns, also return: "explanations": [{"ingredient": "name", "issue": "why it matters for their health", "alternatives": ["alternative 1", "alternative 2"]}]`
      : '';

    const prompt = `Analyze this product and return ONLY this JSON (no other text):
{"summary":"1-2 sentence assessment","strengths":["s1","s2"],"concerns":["c1","c2"],"recommendation":"brief advice"${explanationRequest ? ',"explanations":[{"ingredient":"name","issue":"why it matters","alternatives":["alt1"]}]' : ''}}

Product: ${productSummary}${prefContext}`;

    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product, prompt })
    });

    if (!response.ok) throw new Error('API request failed');
    
    const data = await response.json();
    return data.analysis || generateFallbackAISummary(product);

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

const aiAnalysisCache = {};

// Personalization preferences
const DIET_TYPES = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🌱' },
  { id: 'vegan', label: 'Vegan', icon: '🥬' },
  { id: 'muscle-gain', label: 'Muscle Gain', icon: '💪' },
  { id: 'weight-gain', label: 'Weight Gain', icon: '📈' },
  { id: 'weight-loss', label: 'Weight Loss', icon: '⚖️' },
  { id: 'acne-safe', label: 'Acne-Safe', icon: '✨' },
  { id: 'diabetes', label: 'Diabetes-Friendly', icon: '🩺' },
  { id: 'cholesterol', label: 'Cholesterol Management', icon: '❤️‍🩹' },
  { id: 'heart-health', label: 'Heart Health', icon: '❤️' }
];

function App() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [barcode, setBarcode] = useState('');
  const [product, setProduct] = useState(null);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const fileInputRef = useRef(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [userPreferences, setUserPreferences] = useState({ dietTypes: [], customHealthProblems: '', showExplanations: true });
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [showExplanations, setShowExplanations] = useState(true);
  const [customHealthProblems, setCustomHealthProblems] = useState('');

  // Load preferences from localStorage after hydration
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nutrimentation_preferences');
      if (saved) {
        const prefs = JSON.parse(saved);
        setUserPreferences(prefs);
        setShowExplanations(prefs.showExplanations ?? true);
        setCustomHealthProblems(prefs.customHealthProblems || '');
      }
    }
  }, []);

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
    setShowScanner(true);
  };

  const stopCamera = () => {
    setShowScanner(false);
  };

  const handleScan = (barcode) => {
    setBarcode(barcode);
    setShowScanner(false);
    scanProduct(barcode);
  };

  const extractBarcodeFromImage = async (base64Data, mimeType = 'image/jpeg') => {
    try {
      setIsProcessing(true);
      setError('');

      console.log('Sending image to backend for barcode extraction...');

      const response = await fetch('/api/extract-barcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64Data, mimeType })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const extractedCode = data.barcode?.trim();

      console.log('Extracted barcode:', extractedCode);

      if (extractedCode === 'NOT_FOUND' || !extractedCode || extractedCode.length < 8) {
        setError('No barcode detected in image. Please try another photo or enter barcode manually.');
        setIsProcessing(false);
        return;
      }

      const cleanCode = extractedCode.replace(/\D/g, '');

      if (cleanCode.length < 8) {
        setError('Invalid barcode detected. Please try another photo.');
        setIsProcessing(false);
        return;
      }

      console.log('Cleaned barcode:', cleanCode);
      setBarcode(cleanCode);
      
      await scanProduct(cleanCode);
    } catch (err) {
      console.error('Error extracting barcode:', err);
      
      if (err.message?.includes('API key') || err.status === 401) {
        setError('API authentication failed. Please contact support.');
      } else if (err.message?.includes('quota') || err.status === 429) {
        setError('API quota exceeded. Please try again later.');
      } else if (err.message?.includes('Failed to extract')) {
        setError('Invalid image format. Please try a clearer photo.');
      } else {
        setError(`Failed to extract barcode: ${err.message || 'Unknown error'}. Please try again or enter manually.`);
      }
    } finally {
      setIsProcessing(false);
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
        try {
          const base64String = event.target?.result;
          if (!base64String || typeof base64String !== 'string') {
            throw new Error('Failed to read file');
          }

          const base64Data = base64String.includes(',') 
            ? base64String.split(',')[1] 
            : base64String;

          await extractBarcodeFromImage(base64Data, 'image/jpeg');
        } catch (error) {
          console.error('Error in file reader:', error);
          setError('Failed to process image file. Please try again.');
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error setting up file upload:', err);
      setError('Failed to process image. Please try again.');
      setIsProcessing(false);
    }
  };

  const scanProduct = async (code) => {
    if (isProcessing) return;
    
    if (!code.trim()) {
      setError('Please enter a barcode');
      return;
    }

    setError('');
    setProduct(null);
    setAiAnalysis(null);
    setIsProcessing(true);

    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${code}.json`
      );

      const data = await response.json();

      if (data.status === 0) {
        console.log('Product not found in Open Food Facts, trying web search...');
        
        try {
          const webSearchResponse = await fetch('/api/web-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ barcode: code })
          });

          if (!webSearchResponse.ok) {
            setError('Product not found in any database. Please try a different barcode.');
            return;
          }

          const webSearchData = await webSearchResponse.json();
          
          if (!webSearchData.success || !webSearchData.product) {
            setError('Product not found in any database. Please try a different barcode.');
            return;
          }

          console.log('Product found via web search:', webSearchData.product);
          
          const analyzedProduct = analyzeProductHealth(webSearchData.product);
          setProduct(analyzedProduct);
          stopCamera();

          await new Promise(resolve => setTimeout(resolve, 1500));

          if (aiAnalysisCache[code]) {
            setAiAnalysis(aiAnalysisCache[code]);
          } else {
            const analysis = await generateAISummary(analyzedProduct, userPreferences);
            if (analysis) {
              aiAnalysisCache[code] = analysis;
              setAiAnalysis(analysis);
            }
          }
        } catch (webSearchErr) {
          console.error('Web search fallback failed:', webSearchErr);
          setError('Product not found in Open Food Facts or online sources. Please try a different barcode.');
          return;
        }
      } else {
        const analyzedProduct = analyzeProductHealth(data.product);
        setProduct(analyzedProduct);
        stopCamera();

        await new Promise(resolve => setTimeout(resolve, 1500));

        if (aiAnalysisCache[code]) {
          setAiAnalysis(aiAnalysisCache[code]);
        } else {
          const analysis = await generateAISummary(analyzedProduct, userPreferences);
          if (analysis) {
            aiAnalysisCache[code] = analysis;
            setAiAnalysis(analysis);
          }
        }
      }
    } catch (err) {
      setError('Failed to fetch product data. Please check your internet connection.');
      console.error('Error:', err);
    } finally {
      setIsProcessing(false);
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

  const updatePreferences = (newPrefs) => {
    const updated = { ...userPreferences, ...newPrefs };
    setUserPreferences(updated);
    localStorage.setItem('nutrimentation_preferences', JSON.stringify(updated));
  };

  const toggleDietType = (dietId) => {
    const current = userPreferences.dietTypes || [];
    const updated = current.includes(dietId) 
      ? current.filter(id => id !== dietId)
      : [...current, dietId];
    updatePreferences({ dietTypes: updated });
  };

  const toggleExplanations = () => {
    const newValue = !showExplanations;
    setShowExplanations(newValue);
    updatePreferences({ showExplanations: newValue });
  };

  const handleCustomHealthProblemsChange = (e) => {
    const value = e.target.value;
    setCustomHealthProblems(value);
    updatePreferences({ customHealthProblems: value });
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
            className="btn-preferences"
            onClick={() => setShowPreferencesModal(!showPreferencesModal)}
            title="Set dietary preferences"
          >
            ⚙️ Preferences
          </button>
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

      {showPreferencesModal && (
        <div className="preferences-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>Your Preferences</h2>
              <button 
                className="btn-close"
                onClick={() => setShowPreferencesModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="section">
                <h3>Dietary Focus</h3>
                <p className="section-hint">Select all that apply to get personalized insights</p>
                <div className="diet-options">
                  {DIET_TYPES.map(diet => (
                    <button
                      key={diet.id}
                      className={`diet-option ${userPreferences.dietTypes?.includes(diet.id) ? 'active' : ''}`}
                      onClick={() => toggleDietType(diet.id)}
                    >
                      <span className="diet-icon">{diet.icon}</span>
                      <span className="diet-label">{diet.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="section">
                <h3>Explanation Level</h3>
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={showExplanations}
                    onChange={toggleExplanations}
                  />
                  <span>Show detailed explanations (WHY unhealthy, WHAT ingredients, alternatives)</span>
                </label>
              </div>

              <div className="section">
                <h3>Custom Health Concerns</h3>
                <p className="section-hint">Describe any specific health issues or goals</p>
                <textarea
                  className="custom-health-input"
                  placeholder="E.g., high blood pressure, kidney problems, sensitive stomach, lactose intolerance..."
                  value={customHealthProblems}
                  onChange={handleCustomHealthProblemsChange}
                  rows="4"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
                    disabled={isProcessing}
                  />
                  <button 
                    onClick={() => scanProduct(barcode)}
                    className="btn btn-primary"
                    disabled={isProcessing}
                  >
                    {isProcessing ? 'Processing...' : 'Search'}
                  </button>
                </div>

                <div className="divider"></div>

                <div className="camera-section">
                  <h3 className="section-subtitle">Or use camera</h3>
                  {!showScanner ? (
                    <div className="camera-options">
                      <button onClick={startCamera} className="btn btn-secondary" disabled={isProcessing}>
                        📷 Scan Barcode
                      </button>
                      <span className="divider-text">or</span>
                      <label htmlFor="file-upload" className="btn btn-secondary btn-upload" style={{pointerEvents: isProcessing ? 'none' : 'auto', opacity: isProcessing ? 0.5 : 1}}>
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
                    <BarcodeScanner
                      onScan={handleScan}
                      onClose={() => setShowScanner(false)}
                    />
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

              <ProductCard 
                product={product} 
                detailed={true} 
                aiAnalysis={aiAnalysis}
                showExplanations={showExplanations}
                userPreferences={userPreferences}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ProductCard({ product, detailed = false, aiAnalysis = null, showExplanations = false, userPreferences = {} }) {
  if (!product) return null;
  
  const [expandedExplanations, setExpandedExplanations] = useState(false);

  const scoreColor = 
    product.score >= 70 ? '#10b981' :
    product.score >= 40 ? '#f59e0b' :
    '#ef4444';

  if (detailed) {
    return (
      <div className="modern-container">
        <div className="hero-card">
          <div className="hero-text">
            <p className="subtitle">Product Analysis</p>
            <h2>{product.name}</h2>
            <p className="hero-brand">{product.brand}</p>
          </div>
          <div className="score-circle-hero" style={{ background: scoreColor }}>
            {Math.round(product.score)}
            <span className="score-percent">%</span>
          </div>
        </div>

        {aiAnalysis && (
          <>
            {aiAnalysis.models ? (
              <MultiModelAnalysisDisplay 
                analysis={aiAnalysis} 
                showExplanations={showExplanations} 
              />
            ) : (
              <div className="card soft">
                <h3>AI Insight</h3>
                <p className="ai-insight-text">{aiAnalysis.summary || 'Analyzing product...'}</p>
                {userPreferences.dietTypes?.length > 0 && (
                  <p className="personalization-note">
                    💡 Analyzed for: {userPreferences.dietTypes.map(d => DIET_TYPES.find(dt => dt.id === d)?.label).filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div className="metrics-bubble-grid">
          {renderBubble('Sugar', product.nutriments?.['sugars_100g'], 'g')}
          {renderBubble('Protein', product.nutriments?.['protein_100g'], 'g')}
          {renderBubble('Fat', product.nutriments?.['fat_100g'], 'g')}
          {renderBubble('Fiber', product.nutriments?.['fiber_100g'], 'g')}
        </div>

        {(aiAnalysis?.strengths || aiAnalysis?.concerns) && (
          <div className="card">
            <div className="insight-header">
              <h3>Key Insights</h3>
              {showExplanations && aiAnalysis?.explanations?.length > 0 && (
                <button
                  className="btn-toggle-explanations"
                  onClick={() => setExpandedExplanations(!expandedExplanations)}
                >
                  {expandedExplanations ? '▼ Hide Details' : '► Show Details'}
                </button>
              )}
            </div>
            {aiAnalysis?.strengths && aiAnalysis.strengths.length > 0 && (
              <div className="insight-group">
                <p className="insight-label">✓ Strengths</p>
                <ul className="insight-list">
                  {aiAnalysis.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {aiAnalysis?.concerns && aiAnalysis.concerns.length > 0 && (
              <div className="insight-group">
                <p className="insight-label">⚠ Concerns</p>
                <ul className="insight-list">
                  {aiAnalysis.concerns.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            {expandedExplanations && aiAnalysis?.explanations && aiAnalysis.explanations.length > 0 && (
              <div className="explanations-section">
                <h4>Detailed Breakdown</h4>
                {aiAnalysis.explanations.map((exp, i) => (
                  <div key={i} className="explanation-item">
                    <div className="exp-ingredient">
                      <strong>🔴 {exp.ingredient || 'Ingredient'}</strong>
                    </div>
                    <div className="exp-issue">
                      <p><strong>Why it matters:</strong> {exp.issue || 'May impact health'}</p>
                    </div>
                    {exp.alternatives && exp.alternatives.length > 0 && (
                      <div className="exp-alternatives">
                        <p><strong>💡 Healthier alternatives:</strong></p>
                        <ul>
                          {exp.alternatives.map((alt, j) => (
                            <li key={j}>{alt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <h3>Complete Nutrition</h3>
          <div className="nutrition-compact-grid">
            {product.nutriments && Object.entries(product.nutriments).map(([key, value]) => (
              <div key={key} className="nutrition-compact-item">
                <span className="nutri-compact-label">{formatNutrimentLabel(key)}</span>
                <span className="nutri-compact-value">{value.toFixed(1)}{getUnit(key)}</span>
              </div>
            ))}
          </div>
        </div>

        {product.ingredients && product.ingredients !== 'Not available' && (
          <div className="card light">
            <h3>Ingredients</h3>
            <p className="ingredients-compact">{product.ingredients}</p>
          </div>
        )}

        {product.warnings && product.warnings.length > 0 && (
          <div className="card warning-card">
            <h3>⚠ Health Warnings</h3>
            <ul className="warning-compact-list">
              {product.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="product-footer-compact">
          <span className="barcode-compact">Barcode: {product.barcode}</span>
          {product.source && (
            <span className="source-badge">{product.source === 'web-search' ? '🔍 Web Search' : '📊 Open Food Facts'}</span>
          )}
        </div>
      </div>
    );
  }

  const tagColor = getTagColor(product.tag);
  return (
    <div className="product-card">
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
    </div>
  );
}

function renderBubble(label, value, unit) {
  if (value === undefined || value === null) return null;
  return (
    <div className="bubble">
      <span className="bubble-value">{value.toFixed(1)}</span>
      <span className="bubble-unit">{unit}</span>
      <p className="bubble-label">{label}</p>
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
