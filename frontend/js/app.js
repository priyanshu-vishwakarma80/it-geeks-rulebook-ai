// Apex Rulebook Intelligence - Frontend Application

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
    el.classList.remove('bg-gradient-to-r', 'from-cyan-600', 'to-blue-600', 'text-white', 'font-bold', 'shadow-md');
    el.classList.add('text-slate-400');
  });

  const activeView = document.getElementById(`view-${tabId}`);
  const activeBtn = document.getElementById(`tab-btn-${tabId}`);
  if (activeView) activeView.classList.remove('hidden');
  if (activeBtn) {
    activeBtn.classList.add('bg-gradient-to-r', 'from-cyan-600', 'to-blue-600', 'text-white', 'font-bold', 'shadow-md');
    activeBtn.classList.remove('text-slate-400');
  }
}

// Fetch Corpus Stats
async function loadCorpusStats() {
  try {
    const res = await fetch('/corpus');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('stat-words').textContent = `${data.total_words.toLocaleString()} Words Indexed`;
    document.getElementById('total-chunks-span').textContent = data.total_chunks;
  } catch (err) {
    console.error("Error loading corpus stats:", err);
  }
}

// Fetch Test Suite and Populate Policy Gap Explorer
async function loadTestSuite() {
  try {
    const res = await fetch('/test-suite');
    if (!res.ok) return;
    testSuite = await res.json();

    // Populate Policy Gaps Grid (25 items)
    const gapsGrid = document.getElementById('gaps-grid');
    if (gapsGrid && testSuite.unanswerable_questions) {
      gapsGrid.innerHTML = '';
      testSuite.unanswerable_questions.forEach(item => {
        const card = document.createElement('div');
        card.className = "p-5 rounded-2xl bg-slate-950/80 border border-rose-900/50 hover:border-rose-700/80 transition-all flex flex-col justify-between";
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-850">${item.id}</span>
              <span class="text-[10px] text-slate-500 font-mono">${item.category}</span>
            </div>
            <h4 class="text-xs text-slate-200 font-bold leading-snug">${item.question}</h4>
            <p class="text-[11px] text-slate-400 mt-2 italic font-serif leading-relaxed">"${item.reason}"</p>
          </div>
          <button onclick="runDirectQuery('${escapeQuotes(item.question)}')" class="mt-4 w-full py-2 rounded-xl bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-all">
            <span>Verify Policy Gap</span>
            <i class="fa-solid fa-arrow-right text-[10px]"></i>
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
  container.innerHTML = '';
  if (!chunks.length) {
    container.innerHTML = `<div class="p-8 text-center text-xs text-slate-500">No matching clauses found.</div>`;
    return;
  }

  chunks.forEach(c => {
    const item = document.createElement('div');
    item.className = "p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 text-xs hover:border-slate-700 transition-all";
    
    let formatBadge = '';
    if (c.doc_format === 'markdown') {
      formatBadge = `<span class="px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-900 text-[10px] font-mono font-bold">MD</span>`;
    } else if (c.doc_format === 'csv_table') {
      formatBadge = `<span class="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-900 text-[10px] font-mono font-bold">CSV</span>`;
    } else {
      formatBadge = `<span class="px-2 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-900 text-[10px] font-mono font-bold">PDF</span>`;
    }

    item.innerHTML = `
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2.5">
          ${formatBadge}
          <span class="font-bold text-slate-200">${c.section}</span>
        </div>
        <span class="text-[10px] font-mono text-slate-500">${c.chunk_id} • ${c.word_count} words</span>
      </div>
      <p class="text-[11px] text-slate-400 font-mono line-clamp-2 leading-relaxed">${c.text.substring(0, 190)}...</p>
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

// Quick Pill Query Handler
function setQuery(text) {
  document.getElementById('query-input').value = text;
  document.getElementById('ask-form').dispatchEvent(new Event('submit'));
}

// Direct Trigger from Conflict Matrix or Policy Gaps
function runDirectQuery(text) {
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
  answerCard.className = "bg-gradient-to-b from-slate-900 to-slate-950 border rounded-3xl p-6 shadow-2xl relative overflow-hidden transition-all";

  // Customize based on 3 Response Types:
  if (data.type === 'conflict') {
    answerCard.classList.add('border-amber-600/80', 'ring-1', 'ring-amber-500/30');
    typeBadge.className = "px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 bg-amber-950 text-amber-300 border border-amber-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-amber-400"></i> Regulatory Conflict Identified`;

    if (data.conflict) {
      conflictBox.classList.remove('hidden');
      document.getElementById('conflict-topic').textContent = data.conflict.topic;
      document.getElementById('conflict-explanation').textContent = data.conflict.explanation;

      const clausesGrid = document.getElementById('conflict-clauses-grid');
      clausesGrid.innerHTML = '';
      data.conflict.clauses.forEach((c, idx) => {
        const cCard = document.createElement('div');
        cCard.className = "p-4 rounded-xl bg-slate-950/90 border border-amber-800/70 flex flex-col justify-between";
        cCard.innerHTML = `
          <div>
            <div class="flex items-center justify-between text-[11px] font-mono text-amber-400 mb-1.5">
              <span>Clause ${idx + 1}</span>
              <span class="text-slate-400">${c.document}</span>
            </div>
            <strong class="text-xs text-slate-100 block mb-1.5">${c.section}</strong>
            <blockquote class="text-[11px] text-slate-300 font-serif italic border-l-2 border-amber-500 pl-2.5 mt-1 leading-relaxed">"${c.quote}"</blockquote>
          </div>
        `;
        clausesGrid.appendChild(cCard);
      });
    }

  } else if (data.type === 'not_covered') {
    answerCard.classList.add('border-rose-600/80', 'ring-1', 'ring-rose-500/30');
    typeBadge.className = "px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 bg-rose-950 text-rose-300 border border-rose-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-shield-halved text-rose-400"></i> Policy Gap / Corpus Silent`;

    silenceBox.classList.remove('hidden');
    document.getElementById('silence-reason').textContent = data.reasoning || "The official documents do not stipulate regulations for this specific topic.";

  } else {
    // ANSWERED
    answerCard.classList.add('border-slate-800');
    typeBadge.className = "px-3.5 py-1.5 rounded-xl text-xs font-extrabold uppercase tracking-wider flex items-center gap-2 bg-emerald-950 text-emerald-300 border border-emerald-800";
    typeBadge.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-400"></i> Verified Regulatory Citation`;
  }

  // Render Right-Pane Citations Feed
  citationsList.innerHTML = '';
  if (!data.citations || data.citations.length === 0) {
    citationsList.innerHTML = `
      <div class="p-8 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
        <i class="fa-solid fa-database text-slate-600 text-2xl mb-2"></i>
        <p class="text-xs text-slate-400 font-medium">Zero direct regulatory citations matched.</p>
        <p class="text-[11px] text-slate-500 mt-1">Rulebook corpus contains no governing clause.</p>
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
      <div class="flex items-center justify-between mb-2.5">
        <span class="text-[11px] font-mono ${docColor} font-bold flex items-center gap-1.5">
          <i class="fa-regular fa-file-lines"></i>
          <span>${cit.document}</span>
        </span>
        <div class="flex items-center gap-2">
          <span class="text-[11px] font-mono text-cyan-400 font-bold">${simScore}% match</span>
          <div class="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style="width: ${simScore}%"></div>
          </div>
        </div>
      </div>
      <h4 class="text-xs font-bold text-slate-100 mb-2">${cit.section}</h4>
      <div class="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-300 font-serif leading-relaxed">
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
    if (!res.ok) throw new Error("Audit failed to run");
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
        ? `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800"><i class="fa-solid fa-check mr-1"></i>PASSED</span>`
        : `<span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800"><i class="fa-solid fa-xmark mr-1"></i>FAILED</span>`;

      tr.innerHTML = `
        <td class="py-3 px-4 font-mono font-bold text-slate-300">${r.test_id}</td>
        <td class="py-3 px-4 text-slate-200 font-medium max-w-xs truncate" title="${r.query}">${r.query}</td>
        <td class="py-3 px-4 font-mono text-cyan-400 font-semibold">${r.expected_type.toUpperCase()}</td>
        <td class="py-3 px-4 font-mono ${r.passed ? 'text-emerald-400' : 'text-rose-400'} font-semibold">${r.predicted_type.toUpperCase()}</td>
        <td class="py-3 px-4">${statusBadge}</td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (err) {
    alert(`Audit Error: ${err.message}`);
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
