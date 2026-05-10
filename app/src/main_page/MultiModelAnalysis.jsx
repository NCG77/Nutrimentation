import React, { useState } from 'react';

export default function MultiModelAnalysisDisplay({ analysis, showExplanations }) {
  const [activeTab, setActiveTab] = useState('combined');

  if (!analysis || !analysis.models) {
    return null;
  }

  const { personalization, foodFacts, webSearch } = analysis.models;
  const { combined_recommendation } = analysis;

  return (
    <div className="multi-model-container">
      <div className="combined-recommendation-card">
        <div className="rec-header">
          <h3>Overall Assessment</h3>
          <div className="rec-score">
            <span className="score-value">{combined_recommendation?.overall_score || 0}</span>
            <span className="score-label">Score</span>
          </div>
        </div>
        <div className="rec-recommendation">
          <p className="rec-text">{combined_recommendation?.recommendation}</p>
        </div>
        <div className="rec-rationale">
          {combined_recommendation?.rationale?.map((reason, idx) => (
            <p key={idx} className="rationale-item">• {reason}</p>
          ))}
        </div>
      </div>

      <div className="model-tabs">
        <button
          className={`tab-btn ${activeTab === 'combined' ? 'active' : ''}`}
          onClick={() => setActiveTab('combined')}
        >
          Combined View
        </button>
        <button
          className={`tab-btn ${activeTab === 'personalization' ? 'active' : ''}`}
          onClick={() => setActiveTab('personalization')}
        >
          🎯 Your Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'foodfacts' ? 'active' : ''}`}
          onClick={() => setActiveTab('foodfacts')}
        >
          📊 Nutrition Facts
        </button>
        <button
          className={`tab-btn ${activeTab === 'websearch' ? 'active' : ''}`}
          onClick={() => setActiveTab('websearch')}
        >
          🔍 Online Research
        </button>
      </div>

      <div className="model-content">
        {activeTab === 'combined' && (
          <div className="tab-pane">
            <h3>Integrated Analysis</h3>
            <div className="combined-summary">
              <p>This product has been analyzed across three dimensions:</p>
              <ul>
                <li><strong>Your Preferences:</strong> How well it fits your dietary goals and health concerns</li>
                <li><strong>Nutritional Quality:</strong> Overall nutritional profile from food database</li>
                <li><strong>Online Research:</strong> Cross-verified information from web sources</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === 'personalization' && personalization && (
          <div className="tab-pane model-pane">
            <h3>Personalization Analysis</h3>
            <div className="model-card">
              <div className="card-header">
                <span className={`compat-badge ${personalization.suitable ? 'suitable' : 'not-suitable'}`}>
                  {personalization.suitable ? '✓ Suitable' : '✗ Not Suitable'}
                </span>
                <span className="compat-score">{personalization.compatibility_score || 0}% Match</span>
              </div>
              <p className="model-reasoning">{personalization.reasoning}</p>
              
              {personalization.recommendations?.length > 0 && (
                <div className="model-section">
                  <h4>Recommendations</h4>
                  <ul>
                    {personalization.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {personalization.alternatives?.length > 0 && (
                <div className="model-section">
                  <h4>Better Alternatives</h4>
                  <ul>
                    {personalization.alternatives.map((alt, idx) => (
                      <li key={idx}>{alt}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'foodfacts' && foodFacts && (
          <div className="tab-pane model-pane">
            <h3>Nutritional Quality Analysis</h3>
            <div className="model-card">
              <div className="card-header">
                <span className={`quality-badge ${foodFacts.nutritional_quality}`}>
                  {foodFacts.nutritional_quality?.toUpperCase() || 'MODERATE'}
                </span>
                <span className="quality-score">{foodFacts.quality_score || 0}/100</span>
              </div>
              <p className="model-reasoning">{foodFacts.nutrition_summary}</p>
              
              {foodFacts.highlights?.length > 0 && (
                <div className="model-section">
                  <h4>✓ Highlights</h4>
                  <ul>
                    {foodFacts.highlights.map((highlight, idx) => (
                      <li key={idx}>{highlight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {foodFacts.concerns?.length > 0 && (
                <div className="model-section concerns">
                  <h4>Concerns</h4>
                  <ul>
                    {foodFacts.concerns.map((concern, idx) => (
                      <li key={idx}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="model-section">
                <h4>Best For</h4>
                <p>{foodFacts.best_for}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'websearch' && webSearch && (
          <div className="tab-pane model-pane">
            <h3>Online Research & Verification</h3>
            <div className="model-card">
              <div className="card-header">
                <span className={`verified-badge ${webSearch.web_verified ? 'verified' : 'unverified'}`}>
                  {webSearch.web_verified ? '✓ Verified' : '⚠ Limited Data'}
                </span>
                <span className="consistency-badge">{webSearch.data_consistency?.toUpperCase() || 'MEDIUM'}</span>
              </div>
              
              {webSearch.additional_insights?.length > 0 && (
                <div className="model-section">
                  <h4>Additional Insights</h4>
                  <ul>
                    {webSearch.additional_insights.map((insight, idx) => (
                      <li key={idx}>{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {webSearch.consumer_feedback_themes?.length > 0 && (
                <div className="model-section">
                  <h4>Consumer Feedback Themes</h4>
                  <ul>
                    {webSearch.consumer_feedback_themes.map((theme, idx) => (
                      <li key={idx}>{theme}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              <div className="model-section">
                <h4>Availability</h4>
                <p>{webSearch.availability ? webSearch.availability.toUpperCase() : 'STANDARD'}</p>
              </div>
              
              {webSearch.sourcing_notes && (
                <div className="model-section">
                  <h4>Sourcing Notes</h4>
                  <p>{webSearch.sourcing_notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
