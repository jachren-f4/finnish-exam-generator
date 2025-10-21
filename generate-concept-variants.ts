/**
 * Generate visual variants of key concepts display
 * Uses existing test data without calling Gemini
 */

import * as fs from 'fs';
import * as path from 'path';

// Load the 3-image test result
const testDataPath = path.join(__dirname, 'prompttests/test-gamified-concepts-v1.2-2025-10-20T15-00-00-922Z.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));
const concepts = testData.response.key_concepts;

console.log(`📊 Loaded ${concepts.length} key concepts from test data`);

/**
 * Variant 1: Minimalist Grey/White (Main Menu Style)
 * Clean, professional, subtle colors
 */
function generateMinimalistVariant(concepts: any[]): string {
  const cards = concepts.map((concept, idx) => `
    <div class="concept-card" data-clicked="false" data-index="${idx}">
      <div class="card-header">
        <div class="header-left">
          <h3>${concept.concept_name}</h3>
          <span class="category-tag">${concept.category}</span>
        </div>
        <span class="difficulty-badge ${concept.difficulty}">${concept.difficulty}</span>
      </div>
      <div class="card-meta">
        <span class="badge-name">🏅 ${concept.badge_title}</span>
        <span class="question-count">Asked in ${concept.related_question_ids?.length || 0} question${concept.related_question_ids?.length === 1 ? '' : 's'}</span>
      </div>
      <button class="expand-btn" onclick="toggleDefinition(this)">
        <span class="btn-text">Show explanation</span>
        <span class="btn-icon">▼</span>
      </button>
      <div class="definition hidden">
        <p class="definition-text">${concept.definition}</p>
        <p class="hint"><strong>Hint:</strong> ${concept.mini_game_hint}</p>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ExamGenie – Key Concepts (Minimalist)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: #f5f5f5;
      color: #1a1a1a;
      padding: 2rem 1rem;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid #e0e0e0;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
      font-weight: 700;
    }

    .subtitle {
      color: #666;
      font-size: 1.1rem;
      margin: 0.5rem 0;
      font-weight: 400;
    }

    .purpose {
      max-width: 600px;
      margin: 1.5rem auto 0;
      padding: 1.5rem;
      background: white;
      border-radius: 8px;
      border-left: 3px solid #333;
      color: #444;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .purpose strong {
      color: #1a1a1a;
    }

    .stats-bar {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-around;
      flex-wrap: wrap;
      gap: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .stat { text-align: center; }
    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #1a1a1a;
    }
    .stat-label {
      font-size: 0.9rem;
      color: #666;
      margin-top: 0.25rem;
    }

    .concept-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .concept-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      transition: all 0.2s ease;
      border: 1px solid #e0e0e0;
    }

    .concept-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .concept-card.mastered {
      border-color: #4CAF50;
      background: #f9fff9;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 1rem;
      gap: 1rem;
    }

    .header-left {
      flex: 1;
    }

    h3 {
      font-size: 1.25rem;
      color: #1a1a1a;
      line-height: 1.3;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .category-tag {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.8rem;
      font-weight: 500;
      background: #f0f0f0;
      color: #666;
    }

    .difficulty-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      white-space: nowrap;
      letter-spacing: 0.5px;
    }

    .difficulty-badge.foundational {
      background: #e8e8e8;
      color: #555;
    }
    .difficulty-badge.intermediate {
      background: #d0d0d0;
      color: #333;
    }
    .difficulty-badge.advanced {
      background: #b0b0b0;
      color: #1a1a1a;
    }

    .card-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 0;
      margin-bottom: 0.75rem;
      border-bottom: 1px solid #f0f0f0;
      gap: 1rem;
    }

    .badge-name {
      font-weight: 500;
      color: #444;
      font-size: 0.9rem;
    }

    .question-count {
      color: #888;
      font-size: 0.85rem;
      white-space: nowrap;
    }

    .expand-btn {
      width: 100%;
      padding: 0.75rem 1rem;
      background: #1a1a1a;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: background 0.2s;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .expand-btn:hover {
      background: #333;
    }

    .btn-icon {
      transition: transform 0.2s;
      font-size: 0.8rem;
    }

    .expand-btn.expanded .btn-icon {
      transform: rotate(180deg);
    }

    .definition {
      margin-top: 1rem;
      padding: 1rem;
      background: #fafafa;
      border-radius: 6px;
      border-left: 3px solid #333;
      line-height: 1.6;
    }

    .definition p {
      margin: 0.5rem 0;
      color: #444;
      font-size: 0.95rem;
    }

    .definition-text {
      color: #1a1a1a;
      font-weight: 500;
    }

    .hint {
      color: #666;
      font-style: italic;
      font-size: 0.9rem;
    }

    .hidden { display: none; }

    #completion-banner {
      background: #4CAF50;
      color: white;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      animation: fadeIn 0.5s ease forwards;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    footer {
      text-align: center;
      padding: 2rem 0;
      color: #888;
      font-size: 0.9rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Key Concepts</h1>
      <p class="subtitle">Master the essential ideas from your textbook</p>
      <div class="purpose">
        <strong>Purpose:</strong> Help students quickly understand and remember the most important ideas from their textbook material before taking the exam.
      </div>
    </header>

    <div class="stats-bar">
      <div class="stat">
        <div class="stat-value" id="clicked-count">0</div>
        <div class="stat-label">Concepts Learned</div>
      </div>
      <div class="stat">
        <div class="stat-value">${concepts.length}</div>
        <div class="stat-label">Total Concepts</div>
      </div>
      <div class="stat">
        <div class="stat-value" id="progress-percent">0%</div>
        <div class="stat-label">Progress</div>
      </div>
    </div>

    <section id="key-concepts">
      <div class="concept-grid">${cards}</div>
      <div id="completion-banner" class="hidden">
        🎉 Congratulations! You've mastered all key concepts!
      </div>
    </section>

    <footer>
      <p>Variant: Minimalist Grey/White • ExamGenie Key Concepts</p>
    </footer>
  </div>

  <script>
    function toggleDefinition(btn) {
      const card = btn.parentElement;
      const def = btn.nextElementSibling;
      const wasHidden = def.classList.contains('hidden');

      def.classList.toggle('hidden');
      btn.classList.toggle('expanded');

      // Update button text
      const btnText = btn.querySelector('.btn-text');
      btnText.textContent = wasHidden ? 'Hide explanation' : 'Show explanation';

      // Mark card as mastered on first click
      if (wasHidden && !card.classList.contains('mastered')) {
        card.classList.add('mastered');
        card.dataset.clicked = "true";
        updateProgress();
      }
    }

    function updateProgress() {
      const all = document.querySelectorAll('.concept-card');
      const mastered = document.querySelectorAll('.concept-card[data-clicked="true"]');
      const progress = Math.round((mastered.length / all.length) * 100);

      document.getElementById('clicked-count').textContent = mastered.length;
      document.getElementById('progress-percent').textContent = progress + '%';

      if (mastered.length === all.length) {
        document.getElementById('completion-banner').classList.remove('hidden');
      }
    }
  </script>
</body>
</html>`;
}

/**
 * Variant 2: Card Stack Layout
 * Cleaner vertical stack with more whitespace
 */
function generateCardStackVariant(concepts: any[]): string {
  const cards = concepts.map((concept, idx) => `
    <div class="concept-card" data-clicked="false" data-index="${idx}">
      <div class="card-number">${idx + 1}</div>
      <div class="card-content">
        <div class="top-row">
          <h3>${concept.concept_name}</h3>
          <span class="difficulty ${concept.difficulty}">${concept.difficulty}</span>
        </div>
        <div class="meta-row">
          <span class="category">${concept.category}</span>
          <span class="questions">${concept.related_question_ids?.length || 0} questions</span>
        </div>
        <div class="badge-row">
          <span class="badge">🏅 ${concept.badge_title}</span>
        </div>
        <button class="toggle-btn" onclick="toggleCard(this)">
          Show Details
        </button>
        <div class="details hidden">
          <div class="detail-section">
            <h4>Definition</h4>
            <p>${concept.definition}</p>
          </div>
          <div class="detail-section hint-section">
            <h4>Hint</h4>
            <p>${concept.mini_game_hint}</p>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="fi">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>ExamGenie – Key Concepts (Card Stack)</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: #fafafa;
      color: #1a1a1a;
      padding: 2rem 1rem;
      min-height: 100vh;
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
    }

    header {
      text-align: center;
      margin-bottom: 3rem;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.75rem;
      color: #1a1a1a;
      font-weight: 700;
    }

    .header-meta {
      color: #666;
      font-size: 1rem;
      margin-bottom: 1.5rem;
    }

    .purpose-box {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      border-left: 4px solid #1a1a1a;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .purpose-box strong {
      display: block;
      margin-bottom: 0.5rem;
      color: #1a1a1a;
    }

    .purpose-box p {
      color: #555;
      line-height: 1.6;
    }

    .progress-bar {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }

    .progress-text {
      text-align: center;
      font-size: 1.1rem;
      color: #333;
      margin-bottom: 1rem;
    }

    .progress-track {
      width: 100%;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .progress-fill {
      height: 100%;
      background: #4CAF50;
      width: 0%;
      transition: width 0.3s ease;
    }

    .concept-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .concept-card {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      overflow: hidden;
      transition: all 0.2s ease;
      display: flex;
      border: 2px solid transparent;
    }

    .concept-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    .concept-card.mastered {
      border-color: #4CAF50;
    }

    .card-number {
      width: 60px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      color: #999;
    }

    .card-content {
      flex: 1;
      padding: 1.5rem;
    }

    .top-row {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 1rem;
      margin-bottom: 0.75rem;
    }

    h3 {
      font-size: 1.25rem;
      color: #1a1a1a;
      line-height: 1.3;
      font-weight: 600;
      flex: 1;
    }

    .difficulty {
      padding: 0.25rem 0.75rem;
      border-radius: 4px;
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .difficulty.foundational { background: #e8e8e8; color: #555; }
    .difficulty.intermediate { background: #d0d0d0; color: #333; }
    .difficulty.advanced { background: #b0b0b0; color: #1a1a1a; }

    .meta-row {
      display: flex;
      gap: 1.5rem;
      margin-bottom: 0.75rem;
      font-size: 0.9rem;
    }

    .category {
      color: #666;
    }

    .questions {
      color: #999;
    }

    .badge-row {
      margin-bottom: 1rem;
    }

    .badge {
      color: #444;
      font-weight: 500;
      font-size: 0.95rem;
    }

    .toggle-btn {
      width: 100%;
      padding: 0.75rem;
      background: #f5f5f5;
      color: #333;
      border: 1px solid #e0e0e0;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      transition: all 0.2s;
    }

    .toggle-btn:hover {
      background: #e8e8e8;
      border-color: #ccc;
    }

    .details {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .detail-section {
      margin-bottom: 1rem;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    .detail-section h4 {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .detail-section p {
      color: #444;
      line-height: 1.6;
      font-size: 0.95rem;
    }

    .hint-section p {
      font-style: italic;
      color: #666;
    }

    .hidden { display: none; }

    #completion {
      background: #4CAF50;
      color: white;
      padding: 2rem;
      border-radius: 8px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin-top: 2rem;
    }

    footer {
      text-align: center;
      padding: 2rem 0;
      color: #999;
      font-size: 0.85rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Key Concepts</h1>
      <p class="header-meta">${concepts.length} concepts from your textbook</p>
      <div class="purpose-box">
        <strong>Purpose</strong>
        <p>Help students quickly understand and remember the most important ideas from their textbook material before taking the exam.</p>
      </div>
    </header>

    <div class="progress-bar">
      <p class="progress-text"><span id="count">0</span>/${concepts.length} concepts learned</p>
      <div class="progress-track">
        <div class="progress-fill" id="progress"></div>
      </div>
    </div>

    <div class="concept-list">
      ${cards}
    </div>

    <div id="completion" class="hidden">
      🎉 All concepts mastered!
    </div>

    <footer>
      <p>Variant: Card Stack • ExamGenie Key Concepts</p>
    </footer>
  </div>

  <script>
    function toggleCard(btn) {
      const card = btn.closest('.concept-card');
      const details = btn.nextElementSibling;
      const wasHidden = details.classList.contains('hidden');

      details.classList.toggle('hidden');
      btn.textContent = wasHidden ? 'Hide Details' : 'Show Details';

      if (wasHidden && !card.classList.contains('mastered')) {
        card.classList.add('mastered');
        card.dataset.clicked = "true";
        updateProgress();
      }
    }

    function updateProgress() {
      const all = document.querySelectorAll('.concept-card');
      const mastered = document.querySelectorAll('.concept-card[data-clicked="true"]');
      const progress = Math.round((mastered.length / all.length) * 100);

      document.getElementById('count').textContent = mastered.length;
      document.getElementById('progress').style.width = progress + '%';

      if (mastered.length === all.length) {
        document.getElementById('completion').classList.remove('hidden');
      }
    }
  </script>
</body>
</html>`;
}

// Generate both variants
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const outputDir = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Variant 1: Minimalist
const minimalistHTML = generateMinimalistVariant(concepts);
const minimalistPath = path.join(outputDir, `key-concepts-minimalist-${timestamp}.html`);
fs.writeFileSync(minimalistPath, minimalistHTML, 'utf-8');
console.log(`✅ Minimalist variant saved: ${path.basename(minimalistPath)}`);

// Variant 2: Card Stack
const cardStackHTML = generateCardStackVariant(concepts);
const cardStackPath = path.join(outputDir, `key-concepts-cardstack-${timestamp}.html`);
fs.writeFileSync(cardStackPath, cardStackHTML, 'utf-8');
console.log(`✅ Card stack variant saved: ${path.basename(cardStackPath)}`);

console.log(`\n🎨 Visual variants generated!`);
console.log(`   Open in browser:`);
console.log(`   - file://${minimalistPath}`);
console.log(`   - file://${cardStackPath}`);
