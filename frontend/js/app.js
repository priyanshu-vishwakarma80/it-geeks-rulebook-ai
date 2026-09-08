// The Rulebook That Argues With Itself - Frontend Application

let allChunks = [];
let testSuite = null;

document.addEventListener('DOMContentLoaded', () => {
  loadCorpusStats();
  loadTestSuite();
  loadAllChunks();
});

// Tab Navigation
function switchTab(tabId) {
  document.querySelectorAll('.view-panel').forEach(el => el.classList.add('hidden'));
  document.querySelectorAll('.tab-btn').forEach(el => {
    el.classList.remove('bg-cyan-600', 'text-white', 'font-semibold');
    el.classList.add('text-slate-400');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('bg-cyan-600', 'text-white', 'font-semibold');
    activeBtn.classList.remove('text-slate-400');
  }
}

// Fetch Corpus Stats
async function loadCorpusStats() {
  try {
    const res = await fetch('/corpus');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('stat-words').textContent = `${data.total_words.toLocaleString()} Words`;
    document.getElementById('total-chunks-span').textContent = data.total_chunks;
  } catch (err) {
    console.error("Error loading corpus stats:", err);
  }
}

// Fetch Test Suite and Populate Demo Cards
async function loadTestSuite() {
  try {
    const res = await fetch('/test-suite');
    if (!res.ok) return;
    testSuite = await res.json();

    // Populate Unanswerable Demo Grid (25 items)
    const unansGrid = document.getElementById('demo-unanswerable-grid');
    unansGrid.innerHTML = '';
    testSuite.unanswerable_questions.forEach(item => {
      const card = document.createElement('div');
      card.className = "demo-card border-rose-900/40 bg-rose-950/20 hover:bg-rose-950/40";
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between">
            <span class="badge-tag text-rose-400">${item.id}</span>
            <span class="text-[10px] text-slate-500">${item.category}</span>
          </div>
          <p class="text-xs text-slate-200 mt-1 font-medium">${item.question}</p>
          <p class="text-[10px] text-slate-400 mt-1 italic">${item.reason}</p>
        </div>
        <button onclick="runDemoQuery('${escapeQuotes(item.question)}')" class="demo-btn text-rose-300 bg-rose-900/30 hover:bg-rose-800/50">
          <i class="fa-solid fa-play text-[10px]"></i> Test Silence
        </button>
      `;
      unansGrid.appendChild(card);
    });

    // Populate Positive Queries Grid (8 items)
    const posGrid = document.getElementById('demo-positive-grid');
    posGrid.innerHTML = '';
    testSuite.positive_queries.forEach(item => {
      const card = document.createElement('div');
      card.className = "demo-card border-emerald-900/40 bg-emerald-950/20 hover:bg-emerald-950/40";
      card.innerHTML = `
        <div>
          <span class="badge-tag text-emerald-400">${item.id}</span>
          <p class="text-xs text-slate-200 mt-1 font-medium">${item.query}</p>
        </div>
        <button onclick="runDemoQuery('${escapeQuotes(item.query)}')" class="demo-btn text-emerald-300 bg-emerald-900/30 hover:bg-emerald-800/50">
          <i class="fa-solid fa-play text-[10px]"></i> Query Rule
        </button>
      `;
      posGrid.appendChild(card);
    });

  } catch (err) {
    console.error("Error loading test suite:", err);
  }
}

// Fetch All Chunks for Corpus Explorer
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
  container.innerHTML = '';
  if (!chunks.length) {
    container.innerHTML = `<div class="p-4 text-center text-xs text-slate-500">No matching chunks found.</div>`;
    return;
  }

  chunks.forEach(c => {
    const item = document.createElement('div');
    item.className = "p-3 rounded-lg bg-slate-950 border border-slate-800/80 text-xs";
    
    let formatBadge = '';
    if (c.doc_format === 'markdown') {
      formatBadge = `<span class="px-1.5 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900 text-[10px] font-mono">MD</span>`;
    } else if (c.doc_format === 'csv_table') {
      formatBadge = `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] font-mono">CSV</span>`;
    } else {
      formatBadge = `<span class="px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900 text-[10px] font-mono">PDF</span>`;
    }

    item.innerHTML = `
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2">
          ${formatBadge}
          <span class="font-bold text-slate-200">${c.section}</span>
        </div>
        <span class="text-[10px] font-mono text-slate-500">${c.chunk_id} • ${c.word_count} words</span>
      </div>
      <p class="text-[11px] text-slate-400 font-mono line-clamp-2 mt-1">${c.text.substring(0, 180)}...</p>
    `;
    container.appendChild(item);
  });
}

function filterChunks(query) {
  const q = query.toLowerCase();
  if (!q) {
    renderChunks(allChunks);
    return;
  }
  const filtered = allChunks.filter(c => 
    c.section.toLowerCase().includes(q) || 
    c.text.toLowerCase().includes(q) || 
    c.document.toLowerCase().includes(q)
  );
  renderChunks(filtered);
}

// Quick Pill Setter
function setQuery(text) {
  document.getElementById('query-input').value = text;
  document.getElementById('ask-form').dispatchEvent(new Event('submit'));
}

// 1-Click Demo Trigger from Demo Tab
function runDemoQuery(text) {
  switchTab('qa');
  document.getElementById('query-input').value = text;
  document.getElementById('ask-form').dispatchEvent(new Event('submit'));
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

  emptyState.classList.add('hidden');
  resultsGrid.classList.add('hidden');
  loadingState.classList.remove('hidden');
  submitBtn.disabled = true;

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
    loadingState.classList.add('hidden');
    resultsGrid.classList.remove('hidden');
    submitBtn.disabled = false;
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

  queryEl.textContent = `"${data.query}"`;
  answerEl.innerHTML = data.answer;
  confEl.textContent = `${(data.confidence_score * 100).toFixed(1)}%`;
  citationsBadge.textContent = `${data.citations.length} Citation${data.citations.length === 1 ? '' : 's'}`;

  // Reset conditional boxes
  conflictBox.classList.add('hidden');
  silenceBox.classList.add('hidden');
  answerCard.className = "bg-slate-900 border rounded-2xl p-6 shadow-xl relative overflow-hidden";

  // Customize based on 3 Response Types:
  if (data.type === 'conflict') {
    answerCard.classList.add('border-amber-700/80', 'ring-1', 'ring-amber-500/30');
    typeBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-amber-950 text-amber-300 border border-amber-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Regulatory Conflict Detected`;

    if (data.conflict) {
      conflictBox.classList.remove('hidden');
      document.getElementById('conflict-topic').textContent = data.conflict.topic;
      document.getElementById('conflict-explanation').textContent = data.conflict.explanation;

      const clausesGrid = document.getElementById('conflict-clauses-grid');
      clausesGrid.innerHTML = '';
      data.conflict.clauses.forEach((c, idx) => {
        const cCard = document.createElement('div');
        cCard.className = "p-3 rounded-lg bg-slate-950/80 border border-amber-800/60 flex flex-col justify-between";
        cCard.innerHTML = `
          <div>
            <div class="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-1">
              <span>Clause ${idx + 1}</span>
              <span class="text-slate-400">${c.document}</span>
            </div>
            <strong class="text-xs text-slate-200 block mb-1">${c.section}</strong>
            <blockquote class="text-[11px] text-slate-300 italic border-l-2 border-amber-500 pl-2 mt-1">"${c.quote}"</blockquote>
          </div>
        `;
        clausesGrid.appendChild(cCard);
      });
    }

  } else if (data.type === 'not_covered') {
    answerCard.classList.add('border-rose-800/80', 'ring-1', 'ring-rose-500/20');
    typeBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-rose-950 text-rose-300 border border-rose-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-circle-xmark text-rose-400"></i> Not Covered in Rulebook`;

    silenceBox.classList.remove('hidden');
    document.getElementById('silence-reason').textContent = data.reasoning || "The official documents do not stipulate regulations for this specific topic.";

  } else {
    // ANSWERED
    answerCard.classList.add('border-slate-800');
    typeBadge.className = "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 bg-emerald-950 text-emerald-300 border border-emerald-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> Answered with Citations`;
  }

  // Render Right-Pane Citations Feed
  citationsList.innerHTML = '';
  if (!data.citations || data.citations.length === 0) {
    citationsList.innerHTML = `
      <div class="p-6 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
        <i class="fa-solid fa-database text-slate-600 text-2xl mb-2"></i>
        <p class="text-xs text-slate-400">Zero direct textual citations matched.</p>
        <p class="text-[11px] text-slate-500 mt-0.5">Corpus is silent on this topic.</p>
      </div>
    `;
    return;
  }

  data.citations.forEach((cit, idx) => {
    const card = document.createElement('div');
    card.className = "citation-card";

    let docColor = 'text-blue-400';
    if (cit.document.endsWith('.csv')) docColor = 'text-emerald-400';
    if (cit.document.endsWith('.pdf')) docColor = 'text-rose-400';

    const simScore = Math.round(cit.similarity_score * 100);

    card.innerHTML = `
      <div class="flex items-center justify-between mb-2">
        <span class="text-[11px] font-mono ${docColor} font-bold flex items-center gap-1.5">
          <i class="fa-regular fa-file-lines"></i>
          <span>${cit.document}</span>
        </span>
        <div class="flex items-center gap-1.5">
          <span class="text-[10px] font-mono text-cyan-400 font-bold">${simScore}% match</span>
          <div class="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-cyan-500" style="width: ${simScore}%"></div>
          </div>
        </div>
      </div>
      <h4 class="text-xs font-bold text-slate-200 mb-1.5">${cit.section}</h4>
      <div class="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 font-serif leading-relaxed">
        "${cit.text}"
      </div>
    `;
    citationsList.appendChild(card);
  });
}

// Live Benchmark Runner
async function runLiveBenchmark() {
  const btn = document.getElementById('run-benchmark-btn');
  const progressWrap = document.getElementById('bm-progress-wrap');
  const progressBar = document.getElementById('bm-progress-bar');
  const progressText = document.getElementById('bm-progress-text');
  const tableBody = document.getElementById('bm-table-body');

  btn.disabled = true;
  progressWrap.classList.remove('hidden');
  progressBar.style.width = '30%';
  progressText.textContent = '30%';

  try {
    progressBar.style.width = '60%';
    progressText.textContent = '60%';

    const res = await fetch('/eval/run', { method: 'POST' });
    if (!res.ok) throw new Error("Benchmark failed to run");
    const data = await res.json();

    progressBar.style.width = '100%';
    progressText.textContent = '100%';

    // Update Metric Cards
    document.getElementById('bm-total').textContent = data.total_tests;
    document.getElementById('bm-passed').textContent = data.passed_tests;
    document.getElementById('bm-failed').textContent = data.failed_tests;
    document.getElementById('bm-accuracy').textContent = `${data.accuracy_percentage}%`;

    // Render Table
    tableBody.innerHTML = '';
    data.results.forEach(r => {
      const tr = document.createElement('tr');
      tr.className = "hover:bg-slate-900/60";

      let statusBadge = r.passed
        ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800"><i class="fa-solid fa-check mr-1"></i>PASSED</span>`
        : `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800"><i class="fa-solid fa-xmark mr-1"></i>FAILED</span>`;

      tr.innerHTML = `
        <td class="py-2.5 px-4 font-mono font-bold text-slate-300">${r.test_id}</td>
        <td class="py-2.5 px-4 text-slate-200 font-medium max-w-xs truncate" title="${r.query}">${r.query}</td>
        <td class="py-2.5 px-4 font-mono text-cyan-400">${r.expected_type.toUpperCase()}</td>
        <td class="py-2.5 px-4 font-mono ${r.passed ? 'text-emerald-400' : 'text-rose-400'}">${r.predicted_type.toUpperCase()}</td>
        <td class="py-2.5 px-4">${statusBadge}</td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    alert(`Benchmark Error: ${err.message}`);
  } finally {
    btn.disabled = false;
    setTimeout(() => {
      progressWrap.classList.add('hidden');
    }, 1500);
  }
}

// Utility to escape quotes in HTML handlers
function escapeQuotes(str) {
  return str.replace(/'/g, "\\'");
}
