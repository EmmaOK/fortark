// ── Fortark Scorecard Engine ────────────────────────────────

const TOTAL_QUESTIONS = 8;
let currentQ = 1;
const answers = {};

// ── DOM refs ────────────────────────────────────────────────
const quizBox        = document.getElementById('quiz-box');
const resultsSection = document.getElementById('results-section');
const progressFill   = document.getElementById('progress-fill');
const progressLabel  = document.getElementById('progress-label');
const progressPct    = document.getElementById('progress-pct');
const btnNext        = document.getElementById('btn-next');
const btnPrev        = document.getElementById('btn-prev');
const retakeBtn      = document.getElementById('retake-btn');

// ── Progress ────────────────────────────────────────────────
function updateProgress() {
  const pct = Math.round((currentQ / TOTAL_QUESTIONS) * 100);
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `Question ${currentQ} of ${TOTAL_QUESTIONS}`;
  progressPct.textContent = pct + '%';
}

// ── Navigate ────────────────────────────────────────────────
function showQuestion(n) {
  document.querySelectorAll('.question-block').forEach(el => el.classList.remove('active'));
  const block = document.querySelector(`.question-block[data-q="${n}"]`);
  if (block) block.classList.add('active');

  btnPrev.style.visibility = n === 1 ? 'hidden' : 'visible';

  const isLast = n === TOTAL_QUESTIONS;
  btnNext.textContent = isLast ? 'See My Results →' : 'Next →';

  // Restore selection state
  const saved = answers[n];
  if (saved) {
    block.querySelectorAll('.option-btn').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.value === saved);
    });
    btnNext.disabled = false;
  } else {
    btnNext.disabled = true;
  }

  updateProgress();
}

// ── Option selection ────────────────────────────────────────
document.querySelectorAll('.option-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const block = btn.closest('.question-block');
    block.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    answers[currentQ] = btn.dataset.value;
    btnNext.disabled = false;
  });
});

// ── Next ────────────────────────────────────────────────────
btnNext.addEventListener('click', () => {
  if (btnNext.disabled) return;
  if (currentQ < TOTAL_QUESTIONS) {
    currentQ++;
    showQuestion(currentQ);
  } else {
    showResults();
  }
});

// ── Prev ────────────────────────────────────────────────────
btnPrev.addEventListener('click', () => {
  if (currentQ > 1) { currentQ--; showQuestion(currentQ); }
});

// ── Retake ──────────────────────────────────────────────────
retakeBtn.addEventListener('click', () => {
  Object.keys(answers).forEach(k => delete answers[k]);
  currentQ = 1;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  resultsSection.classList.remove('visible');
  quizBox.style.display = 'block';
  showQuestion(1);
});

// ── Scoring ─────────────────────────────────────────────────

function scoreAI() {
  let score = 100;
  const q1 = answers[1], q2 = answers[2], q6 = answers[6];
  if (q1 === 'agents')        score -= 35;
  else if (q1 === 'llm')      score -= 20;
  if (q2 === 'yes_user')      score -= 30;
  else if (q2 === 'yes_internal') score -= 15;
  if (q6 === 'high_stakes')   score -= 35;
  else if (q6 === 'low_stakes') score -= 15;
  return Math.max(0, score);
}

function scoreCloud() {
  let score = 100;
  const q3 = answers[3];
  if (q3 === 'self_hosted')   score -= 45;
  else if (q3 === 'other_cloud') score -= 20;
  return Math.max(0, score);
}

function scoreAuth() {
  let score = 100;
  const q8 = answers[8];
  if (q8 === 'none')   score -= 70;
  else if (q8 === 'basic') score -= 35;
  return Math.max(0, score);
}

function scoreCompliance() {
  let score = 100;
  const q4 = answers[4], q5 = answers[5], q7 = answers[7];
  if (q4 === 'yes_primary') score -= 20;
  else if (q4 === 'yes_some') score -= 10;
  if (q5 === 'none')       score -= 30;
  else if (q5 === 'working') score -= 10;
  if (q7 === 'no')         score -= 30;
  else if (q7 === 'partial') score -= 15;
  return Math.max(0, score);
}

function riskLevel(score) {
  if (score >= 70) return { label: 'Low Risk',    cls: 'score-low',    fill: 'fill-low',    dot: '#00e676' };
  if (score >= 40) return { label: 'Medium Risk', cls: 'score-medium', fill: 'fill-medium', dot: '#ffb300' };
  return               { label: 'High Risk',   cls: 'score-high',   fill: 'fill-high',   dot: '#ff5252' };
}

// ── Findings generator ──────────────────────────────────────
function generateFindings(scores) {
  const findings = [];
  const { ai, cloud, auth, compliance } = scores;

  if (answers[1] === 'agents')
    findings.push({ text: 'AI agents with autonomous tool use are exposed to goal hijacking and prompt injection (MAESTRO L3)', dot: '#ff5252' });
  if (answers[2] === 'yes_user')
    findings.push({ text: 'User-populated vector database creates RAG pipeline poisoning and data exfiltration risk (MAESTRO L2)', dot: '#ff5252' });
  if (answers[6] === 'high_stakes')
    findings.push({ text: 'High-stakes autonomous actions without human approval gates create critical AI agency risk (OWASP LLM06)', dot: '#ff5252' });
  if (answers[8] === 'none')
    findings.push({ text: 'No authentication — all application endpoints are publicly accessible', dot: '#ff5252' });
  else if (answers[8] === 'basic')
    findings.push({ text: 'Password-only authentication is vulnerable to credential stuffing and brute force attacks', dot: '#ffb300' });
  if (answers[3] === 'self_hosted')
    findings.push({ text: 'Self-hosted infrastructure requires manual security hardening — misconfiguration risk is high', dot: '#ffb300' });
  if (answers[4] === 'yes_primary' || answers[4] === 'yes_some')
    findings.push({ text: 'EU market presence triggers EU AI Act obligations — compliance review required', dot: '#ffb300' });
  if (answers[5] === 'none')
    findings.push({ text: 'No compliance framework identified — SOC 2 or ISO 27001 may be required by enterprise clients', dot: '#ffb300' });
  if (answers[7] === 'no')
    findings.push({ text: 'No security review in the past 12 months — vulnerability exposure is unknown', dot: '#ff5252' });

  if (findings.length === 0)
    findings.push({ text: 'Good baseline posture — a full audit will identify specific technical vulnerabilities in your stack', dot: '#00e676' });

  return findings.slice(0, 5);
}

// ── Show Results ────────────────────────────────────────────
function showResults() {
  const ai         = scoreAI();
  const cloud      = scoreCloud();
  const auth       = scoreAuth();
  const compliance = scoreCompliance();
  const overall    = Math.round((ai + cloud + auth + compliance) / 4);

  const overallRisk = riskLevel(overall);

  // Overall circle
  const circle = document.getElementById('overall-score-circle');
  circle.className = `overall-score ${overallRisk.cls}`;
  document.getElementById('overall-score-num').textContent = overall;

  // Headline
  document.getElementById('results-headline').textContent =
    overall < 40 ? 'Significant security gaps identified' :
    overall < 70 ? 'Moderate security risks detected' :
    'Reasonable baseline — room to improve';

  document.getElementById('results-summary').textContent =
    `Your overall risk score is ${overall}/100. ${overallRisk.label}. ` +
    `A full Fortark audit will surface the specific vulnerabilities behind these scores.`;

  // Domain bars
  const domains = [
    { name: 'AI / LLM Security', score: ai },
    { name: 'Cloud Posture',     score: cloud },
    { name: 'Authentication',    score: auth },
    { name: 'Compliance',        score: compliance },
  ];
  const domainContainer = document.getElementById('domain-scores');
  domainContainer.innerHTML = '';
  domains.forEach(d => {
    const r = riskLevel(d.score);
    domainContainer.innerHTML += `
      <div class="domain-row">
        <div class="domain-meta">
          <span class="domain-name">${d.name}</span>
          <span class="domain-score-val" style="color:${r.dot}">${d.score}/100 — ${r.label}</span>
        </div>
        <div class="domain-bar">
          <div class="domain-fill ${r.fill}" style="width: ${d.score}%"></div>
        </div>
      </div>`;
  });

  // Findings
  const findings = generateFindings({ ai, cloud, auth, compliance });
  const findingsList = document.getElementById('findings-list');
  findingsList.innerHTML = '';
  findings.forEach(f => {
    findingsList.innerHTML += `
      <div class="finding-item">
        <div class="finding-dot" style="background:${f.dot}"></div>
        <span>${f.text}</span>
      </div>`;
  });

  // Swap views
  quizBox.style.display = 'none';
  resultsSection.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Init ────────────────────────────────────────────────────
showQuestion(1);
