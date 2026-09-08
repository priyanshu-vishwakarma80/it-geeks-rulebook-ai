// Apex Rulebook Intelligence - Frontend Application (Pure CSS & Vanilla JS)

let allChunks = [];
let testSuite = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCorpusStats();
  loadTestSuite();
  loadAllChunks();
});

// Tab Navigation
function switchTab(tabId) {
  // Hide all view panels
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  
  // Remove active state from all tab buttons
  document.querySelectorAll('.tab-button').forEach(el => el.classList.remove('active'));

  // Show selected panel and mark button as active
  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) activeBtn.classList.add('active');

  // Scroll smoothly to top of main content
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Fetch Corpus Stats
async function loadCorpusStats() {
  try {
    const res = await fetch('/corpus');
    if (!res.ok) return;
    const data = await res.json();
    const wordsEl = document.getElementById('stat-words');
    if (wordsEl) wordsEl.textContent = `${data.total_words.toLocaleString()} Words Indexed`;
    const chunksEl = document.getElementById('total-chunks-span');
    if (chunksEl) chunksEl.textContent = data.total_chunks;
  } catch (err) {
    console.error("Error loading corpus stats:", err);
  }
}

// Fetch Test Suite and Populate Policy Gap Explorer if empty
async function loadTestSuite() {
  try {
    const res = await fetch('/test-suite');
    if (!res.ok) return;
    testSuite = await res.json();

    const gapsGrid = document.getElementById('gaps-grid');
    // If the grid is empty or has fewer than 25 items, populate it dynamically with proper classes
    if (gapsGrid && (!gapsGrid.children || gapsGrid.children.length === 0) && testSuite.unanswerable_questions) {
      gapsGrid.innerHTML = '';
      testSuite.unanswerable_questions.forEach(item => {
        const card = document.createElement('div');
        card.className = "item-card";
        card.innerHTML = `
          <div>
            <div class="item-badge-row">
              <span class="item-id">${item.id}</span>
              <span class="item-cat">${item.category}</span>
            </div>
            <h4 class="item-question">${escapeHtml(item.question)}</h4>
            <p class="item-desc">${escapeHtml(item.reason)}</p>
          </div>
          <button onclick="runDirectQuery('${escapeQuotes(item.question)}')" class="action-btn btn-rose">
            Verify Policy Gap ➔
          </button>
        `;
        gapsGrid.appendChild(card);
      });
    }
  } catch (err) {
    console.error("Error loading test suite:", err);
  }
}

// Fetch All Chunks for Corpus Viewer
async function loadAllChunks() {
  try {
    const res = await fetch('/corpus/chunks');
    if (!res.ok) return;
    const data = await res.json();
    allChunks = data.chunks || [];
    renderChunks(allChunks);
  } catch (err) {
    console.error("Error loading chunks:", err);
  }
}

function renderChunks(chunks) {
  const container = document.getElementById('chunks-container');
  if (!container) return;
  container.innerHTML = '';
  
  if (!chunks || !chunks.length) {
    container.innerHTML = `<div style="padding: 2rem; text-align: center; color: #64748b; font-size: 0.82rem;">No matching clauses found.</div>`;
    return;
  }

  chunks.forEach(c => {
    const item = document.createElement('div');
    item.className = "citation-card";
    
    let docClass = 'doc-md';
    let docLabel = 'MARKDOWN';
    if (c.doc_format === 'csv_table' || c.document.endsWith('.csv')) {
      docClass = 'doc-csv';
      docLabel = 'CSV TABLE';
    } else if (c.doc_format === 'pdf_handbook' || c.document.endsWith('.pdf')) {
      docClass = 'doc-pdf';
      docLabel = 'PDF HANDBOOK';
    }

    item.innerHTML = `
      <div class="cit-top">
        <div style="display: flex; align-items: center; gap: 0.6rem;">
          <span class="cit-doc ${docClass}">${docLabel}</span>
          <span style="font-weight: 700; color: #f1f5f9; font-size: 0.85rem;">${escapeHtml(c.section)}</span>
        </div>
        <span style="font-size: 0.72rem; font-family: ui-monospace, monospace; color: #64748b;">${escapeHtml(c.chunk_id)} • ${c.word_count} words</span>
      </div>
      <p class="cit-quote">${escapeHtml(c.text)}</p>
    `;
    container.appendChild(item);
  });
}

function filterChunks(query) {
  const q = (query || '').toLowerCase();
  if (!q) {
    renderChunks(allChunks);
    return;
  }
  const filtered = allChunks.filter(c => 
    (c.section && c.section.toLowerCase().includes(q)) || 
    (c.text && c.text.toLowerCase().includes(q)) || 
    (c.document && c.document.toLowerCase().includes(q))
  );
  renderChunks(filtered);
}

// Quick Scenario Query Handler
function setQuery(text) {
  const input = document.getElementById('query-input');
  if (input) {
    input.value = text;
    document.getElementById('ask-form').dispatchEvent(new Event('submit'));
  }
}

// Direct Trigger from Conflict Matrix or Policy Gaps
function runDirectQuery(text) {
  switchTab('qa');
  const input = document.getElementById('query-input');
  if (input) {
    input.value = text;
    document.getElementById('ask-form').dispatchEvent(new Event('submit'));
  }
}

// Form Submission Handler
async function handleAsk(event) {
  if (event) event.preventDefault();

  const input = document.getElementById('query-input');
  const query = input.value.trim();
  if (!query) return;

  const emptyState = document.getElementById('qa-empty');
  const loadingState = document.getElementById('qa-loading');
  const resultsGrid = document.getElementById('qa-results');
  const submitBtn = document.getElementById('submit-btn');

  if (emptyState) emptyState.classList.add('hidden');
  if (resultsGrid) resultsGrid.classList.add('hidden');
  if (loadingState) loadingState.classList.remove('hidden');
  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch('/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: query, top_k: 5 })
    });

    if (!res.ok) {
      const errData = await res.json();
      throw new Error(errData.detail || "Server request failed");
    }

    const data = await res.json();
    renderAnswerResponse(data);
  } catch (err) {
    alert(`Error: ${err.message}`);
  } finally {
    if (loadingState) loadingState.classList.add('hidden');
    if (resultsGrid) resultsGrid.classList.remove('hidden');
    if (submitBtn) submitBtn.disabled = false;
  }
}

// Render the Dual Pane Result
function renderAnswerResponse(data) {
  const answerCard = document.getElementById('answer-card');
  const typeBadge = document.getElementById('response-type-badge');
  const queryEl = document.getElementById('result-query');
  const answerEl = document.getElementById('result-answer');
  const confEl = document.getElementById('confidence-score');
  const conflictBox = document.getElementById('conflict-box');
  const silenceBox = document.getElementById('silence-box');
  const citationsList = document.getElementById('citations-list');
  const citationsBadge = document.getElementById('citations-count-badge');

  if (queryEl) queryEl.textContent = `"${data.query}"`;
  if (answerEl) answerEl.innerHTML = data.answer;
  if (confEl) confEl.textContent = `${(data.confidence_score * 100).toFixed(1)}%`;
  if (citationsBadge) citationsBadge.textContent = `${data.citations.length} Citation${data.citations.length === 1 ? '' : 's'}`;

  // Reset conditional callouts
  if (conflictBox) conflictBox.classList.add('hidden');
  if (silenceBox) silenceBox.classList.add('hidden');

  // Customize based on 3 Response Types:
  if (data.type === 'conflict') {
    if (answerCard) {
      answerCard.style.borderColor = '#d97706';
      answerCard.style.boxShadow = '0 0 20px rgba(217, 119, 6, 0.25)';
    }
    if (typeBadge) {
      typeBadge.className = "status-badge badge-conflict";
      typeBadge.innerHTML = `⚠️ Regulatory Contradiction Detected`;
    }

    if (data.conflict && conflictBox) {
      conflictBox.classList.remove('hidden');
      const topicEl = document.getElementById('conflict-topic');
      const expEl = document.getElementById('conflict-explanation');
      if (topicEl) topicEl.textContent = data.conflict.topic;
      if (expEl) expEl.textContent = data.conflict.explanation;

      const clausesGrid = document.getElementById('conflict-clauses-grid');
      if (clausesGrid) {
        clausesGrid.innerHTML = '';
        data.conflict.clauses.forEach((c, idx) => {
          const cCard = document.createElement('div');
          cCard.className = "clause-card";
          cCard.innerHTML = `
            <div class="clause-tag">Clause ${idx + 1} • ${escapeHtml(c.document)}</div>
            <strong style="color: #f1f5f9; font-size: 0.8rem; display: block; margin-bottom: 0.3rem;">${escapeHtml(c.section)}</strong>
            <p class="clause-text">"${escapeHtml(c.quote)}"</p>
          `;
          clausesGrid.appendChild(cCard);
        });
      }
    }

  } else if (data.type === 'not_covered') {
    if (answerCard) {
      answerCard.style.borderColor = '#e11d48';
      answerCard.style.boxShadow = '0 0 20px rgba(225, 29, 72, 0.25)';
    }
    if (typeBadge) {
      typeBadge.className = "status-badge badge-silence";
      typeBadge.innerHTML = `🛡️ Silence Admission / Policy Gap`;
    }

    if (silenceBox) {
      silenceBox.classList.remove('hidden');
      const reasonEl = document.getElementById('silence-reason');
      if (reasonEl) reasonEl.textContent = data.reasoning || "The institutional documents maintain silence and do not establish a policy for this query.";
    }

  } else {
    // Verified Answered
    if (answerCard) {
      answerCard.style.borderColor = '#059669';
      answerCard.style.boxShadow = '0 0 20px rgba(5, 150, 105, 0.25)';
    }
    if (typeBadge) {
      typeBadge.className = "status-badge badge-answered";
      typeBadge.innerHTML = `✅ Verified Determination`;
    }
  }

  // Render Right-Pane Side-by-Side Citations
  if (citationsList) {
    citationsList.innerHTML = '';
    if (!data.citations || data.citations.length === 0) {
      citationsList.innerHTML = `
        <div class="citation-card" style="text-align: center; padding: 2.5rem 1rem;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🛡️</div>
          <p style="font-size: 0.85rem; font-weight: 700; color: #cbd5e1;">Zero Direct Citations Matched</p>
          <p style="font-size: 0.78rem; color: #64748b; margin-top: 0.25rem;">The institutional corpus contains no governing clauses for this topic.</p>
        </div>
      `;
      return;
    }

    data.citations.forEach(cit => {
      const card = document.createElement('div');
      card.className = "citation-card";

      let docClass = 'doc-md';
      let docLabel = 'MARKDOWN';
      if (cit.document.endsWith('.csv')) {
        docClass = 'doc-csv';
        docLabel = 'CSV TABLE';
      } else if (cit.document.endsWith('.pdf')) {
        docClass = 'doc-pdf';
        docLabel = 'PDF HANDBOOK';
      }

      const simPct = Math.round(cit.similarity_score * 100);

      card.innerHTML = `
        <div class="cit-top">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <span class="cit-doc ${docClass}">${docLabel}</span>
            <span style="font-size: 0.75rem; font-family: ui-monospace, monospace; color: #94a3b8;">${escapeHtml(cit.document)}</span>
          </div>
          <span class="cit-score">${simPct}% Match</span>
        </div>
        <div class="cit-section">${escapeHtml(cit.section)}</div>
        <div class="cit-quote">"${escapeHtml(cit.text)}"</div>
      `;
      citationsList.appendChild(card);
    });
  }
}

// Live Benchmark Runner
async function runLiveBenchmark() {
  const btn = document.getElementById('run-benchmark-btn');
  const progressWrap = document.getElementById('bm-progress-wrap');
  const progressBar = document.getElementById('bm-progress-bar');
  const progressText = document.getElementById('bm-progress-text');
  const tableBody = document.getElementById('bm-table-body');

  if (btn) btn.disabled = true;
  if (progressWrap) progressWrap.classList.remove('hidden');
  if (progressBar) progressBar.style.width = '35%';
  if (progressText) progressText.textContent = '35%';

  try {
    if (progressBar) progressBar.style.width = '65%';
    if (progressText) progressText.textContent = '65%';

    const res = await fetch('/eval/run', { method: 'POST' });
    if (!res.ok) throw new Error("Audit failed to run");
    const data = await res.json();

    if (progressBar) progressBar.style.width = '100%';
    if (progressText) progressText.textContent = '100%';

    // Update Metric Cards
    const totalEl = document.getElementById('bm-total');
    const passedEl = document.getElementById('bm-passed');
    const failedEl = document.getElementById('bm-failed');
    const accEl = document.getElementById('bm-accuracy');

    if (totalEl) totalEl.textContent = data.total_tests;
    if (passedEl) passedEl.textContent = data.passed_tests;
    if (failedEl) failedEl.textContent = data.failed_tests;
    if (accEl) accEl.textContent = `${data.accuracy_percentage}%`;

    // Render Table
    if (tableBody) {
      tableBody.innerHTML = '';
      data.results.forEach(r => {
        const tr = document.createElement('tr');

        const statusBadge = r.passed
          ? `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.68rem; font-weight: 800; background: #064e3b; color: #6ee7b7; border: 1px solid #059669;">✔ PASSED</span>`
          : `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 9999px; font-size: 0.68rem; font-weight: 800; background: #881337; color: #fecdd3; border: 1px solid #e11d48;">✖ FAILED</span>`;

        let predColor = '#6ee7b7';
        if (r.predicted_type === 'conflict') predColor = '#fde68a';
        if (r.predicted_type === 'not_covered') predColor = '#fecdd3';

        tr.innerHTML = `
          <td style="font-family: ui-monospace, monospace; font-weight: 700; color: #94a3b8;">${escapeHtml(r.test_id)}</td>
          <td style="color: #f1f5f9; font-weight: 600; max-width: 380px;">${escapeHtml(r.query)}</td>
          <td style="font-family: ui-monospace, monospace; color: #38bdf8; font-weight: 700;">${r.expected_type.toUpperCase()}</td>
          <td style="font-family: ui-monospace, monospace; color: ${predColor}; font-weight: 700;">${r.predicted_type.toUpperCase()}</td>
          <td>${statusBadge}</td>
        `;
        tableBody.appendChild(tr);
      });
    }

  } catch (err) {
    alert(`Benchmark Error: ${err.message}`);
  } finally {
    if (btn) btn.disabled = false;
  }
}

// Helpers
function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeQuotes(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
}
