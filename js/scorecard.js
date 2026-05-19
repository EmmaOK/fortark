// ── Fortark Scorecard Engine ────────────────────────────────

const ALL_QUESTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
let sequence = [...ALL_QUESTIONS];
let seqIdx = 0; // index into sequence
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

// ── Skip logic ──────────────────────────────────────────────
// Q2 (RAG) and Q6 (autonomous actions) are AI-specific.
// Skip them if Q1 = 'none' (no LLM/agents).
function buildSequence() {
  if (answers[1] === 'none') {
    return ALL_QUESTIONS.filter(q => q !== 2 && q !== 6);
  }
  return [...ALL_QUESTIONS];
}

// ── Progress ────────────────────────────────────────────────
function updateProgress() {
  const total = sequence.length;
  const pos   = seqIdx + 1;
  const pct   = Math.round((pos / total) * 100);
  progressFill.style.width = pct + '%';
  progressLabel.textContent = `Question ${pos} of ${total}`;
  progressPct.textContent = pct + '%';
}

// ── Navigate ────────────────────────────────────────────────
function showQuestion(idx) {
  seqIdx = idx;
  const qNum = sequence[idx];
  document.querySelectorAll('.question-block').forEach(el => el.classList.remove('active'));
  const block = document.querySelector(`.question-block[data-q="${qNum}"]`);
  if (block) block.classList.add('active');

  btnPrev.style.visibility = idx === 0 ? 'hidden' : 'visible';

  const isLast = idx === sequence.length - 1;
  btnNext.textContent = isLast ? 'See My Results →' : 'Next →';

  const saved = answers[qNum];
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
    const qNum = parseInt(block.dataset.q, 10);
    answers[qNum] = btn.dataset.value;

    // Rebuild sequence if Q1 just changed
    if (qNum === 1) {
      sequence = buildSequence();
      // Reset answers for skipped questions
      if (answers[1] === 'none') {
        delete answers[2];
        delete answers[6];
      }
    }

    btnNext.disabled = false;
  });
});

// ── Next ────────────────────────────────────────────────────
btnNext.addEventListener('click', () => {
  if (btnNext.disabled) return;
  if (seqIdx < sequence.length - 1) {
    showQuestion(seqIdx + 1);
  } else {
    showResults();
  }
});

// ── Prev ────────────────────────────────────────────────────
btnPrev.addEventListener('click', () => {
  if (seqIdx > 0) showQuestion(seqIdx - 1);
});

// ── Retake ──────────────────────────────────────────────────
retakeBtn.addEventListener('click', () => {
  Object.keys(answers).forEach(k => delete answers[k]);
  sequence = [...ALL_QUESTIONS];
  seqIdx = 0;
  document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
  resultsSection.classList.remove('visible');
  quizBox.style.display = 'block';
  document.getElementById('email-capture-box').style.display = 'block';
  document.getElementById('email-success').classList.add('hidden');
  showQuestion(0);
});

// ── Scoring ─────────────────────────────────────────────────

function scoreAI() {
  let score = 100;
  const q1 = answers[1] ?? 'none';
  const q2 = answers[2] ?? 'no';
  const q6 = answers[6] ?? 'no';
  if (q1 === 'agents')              score -= 35;
  else if (q1 === 'llm')            score -= 20;
  if (q2 === 'yes_user')            score -= 30;
  else if (q2 === 'yes_internal')   score -= 15;
  if (q6 === 'high_stakes')         score -= 35;
  else if (q6 === 'low_stakes')     score -= 15;
  return Math.max(0, score);
}

function scoreCloud() {
  // Start at 70 — hosting platform alone doesn't confirm secure configuration.
  // IAM posture, bucket policies, network exposure, and WAF are all unknown.
  let score = 70;
  const q3  = answers[3]  ?? 'aws_gcp_azure';
  const q9  = answers[9]  ?? 'internal';
  const q10 = answers[10] ?? 'secrets_manager';
  // Hosting: self-hosted means fully manual hardening responsibility
  if (q3 === 'self_hosted')         score -= 15;
  else if (q3 === 'other_cloud')    score -= 5;
  // API exposure: public APIs significantly expand attack surface
  if (q9 === 'public')              score -= 30;
  else if (q9 === 'partner')        score -= 10;
  // Secrets management: hardcoded is critical regardless of hosting
  if (q10 === 'hardcoded')          score -= 50;
  else if (q10 === 'env_vars')      score -= 20;
  return Math.max(0, score);
}

function scoreAuth() {
  let score = 100;
  const q8 = answers[8] ?? 'mfa';
  if (q8 === 'none')    score -= 70;
  else if (q8 === 'basic') score -= 35;
  return Math.max(0, score);
}

function scoreCompliance() {
  let score = 100;
  const q4 = answers[4] ?? 'no';
  const q5 = answers[5] ?? 'none';
  const q7 = answers[7] ?? 'no';
  if (q4 === 'yes_primary')   score -= 20;
  else if (q4 === 'yes_some') score -= 10;
  if (q5 === 'none')          score -= 30;
  else if (q5 === 'working')  score -= 10;
  if (q7 === 'no')            score -= 30;
  else if (q7 === 'partial')  score -= 15;
  return Math.max(0, score);
}

function riskLevel(score) {
  if (score >= 70) return { label: 'Low Risk',    cls: 'score-low',    fill: 'fill-low',    dot: '#00e676' };
  if (score >= 40) return { label: 'Medium Risk', cls: 'score-medium', fill: 'fill-medium', dot: '#ffb300' };
  return               { label: 'High Risk',   cls: 'score-high',   fill: 'fill-high',   dot: '#ff5252' };
}

// ── Findings generator ──────────────────────────────────────
function generateFindings() {
  const findings = [];

  // CRITICAL findings (red)
  if (answers[10] === 'hardcoded')
    findings.push({ severity: 'CRITICAL', text: 'Hardcoded secrets create critical credential exposure risk — any repository leak or code access compromises all connected services (OWASP A07:2021 — Identification & Authentication Failures)', dot: '#ff5252' });
  if (answers[8] === 'none')
    findings.push({ severity: 'CRITICAL', text: 'No authentication — all application endpoints are publicly accessible (OWASP A01:2021 — Broken Access Control)', dot: '#ff5252' });
  if (answers[6] === 'high_stakes')
    findings.push({ severity: 'CRITICAL', text: 'High-stakes autonomous agent actions without human approval gates — goal hijacking or prompt injection could trigger irreversible operations (OWASP LLM06:2025 — Excessive Agency)', dot: '#ff5252' });
  if (answers[2] === 'yes_user')
    findings.push({ severity: 'CRITICAL', text: 'User-populated vector database creates RAG pipeline poisoning risk — malicious documents can inject attacker instructions into every future LLM response (MAESTRO L2, OWASP LLM02:2025)', dot: '#ff5252' });

  // HIGH findings (orange)
  if (answers[1] === 'agents')
    findings.push({ severity: 'HIGH', text: 'AI agents with autonomous tool use are exposed to prompt injection and goal hijacking — a single malicious input can redirect agent behaviour across an entire session (MAESTRO L3, OWASP ASI01:2026)', dot: '#ffb300' });
  if (answers[7] === 'no')
    findings.push({ severity: 'HIGH', text: 'No security review in the past 12 months — vulnerability exposure is unknown and likely increasing as the codebase evolves', dot: '#ffb300' });
  if (answers[9] === 'public')
    findings.push({ severity: 'HIGH', text: 'Public-facing API with many consumers requires rate limiting, authentication enforcement, and OWASP API Security Top 10 review — unauthenticated abuse and scraping are active risks', dot: '#ffb300' });
  if (answers[8] === 'basic')
    findings.push({ severity: 'HIGH', text: 'Password-only authentication is vulnerable to credential stuffing and brute force — HIBP list checking and account lockout are mandatory minimum controls (OWASP A07:2021)', dot: '#ffb300' });
  if (answers[3] === 'self_hosted')
    findings.push({ severity: 'HIGH', text: 'Self-hosted infrastructure requires manual security hardening — network segmentation, patch management, and CIS Benchmark compliance must be verified', dot: '#ffb300' });

  // MEDIUM findings (yellow)
  if (answers[4] === 'yes_primary' || answers[4] === 'yes_some') {
    if (answers[1] !== 'none') {
      findings.push({ severity: 'MEDIUM', text: 'EU market presence triggers EU AI Act obligations — high-risk AI systems require conformity assessment before deployment; non-compliance carries fines up to €30M or 6% global turnover', dot: '#ffb300' });
    } else {
      findings.push({ severity: 'MEDIUM', text: 'EU market presence requires GDPR compliance — data processing agreements, privacy notices, and lawful basis for processing must be in place', dot: '#ffb300' });
    }
  }
  if (answers[5] === 'none')
    findings.push({ severity: 'MEDIUM', text: 'No compliance framework identified — enterprise and regulated buyers increasingly require SOC 2 or ISO 27001 as a procurement condition', dot: '#ffb300' });
  if (answers[10] === 'env_vars')
    findings.push({ severity: 'MEDIUM', text: 'Environment variable secrets without a secrets manager risk exposure through logs, process listings, and container inspection — migrate to AWS Secrets Manager, GCP Secret Manager, or HashiCorp Vault', dot: '#ffb300' });
  if (answers[2] === 'yes_internal')
    findings.push({ severity: 'MEDIUM', text: 'Internal RAG pipeline — verify vector DB access controls, network isolation, and embedding integrity to prevent data exfiltration from compromised adjacent services (MAESTRO L2)', dot: '#ffb300' });

  // Default if clean
  if (findings.length === 0)
    findings.push({ severity: 'INFO', text: 'Good baseline posture — a full audit will identify specific technical vulnerabilities and verify controls are correctly implemented across your stack', dot: '#00e676' });

  return findings.slice(0, 6);
}

// ── Recommendation ──────────────────────────────────────────
function generateRecommendation(scores, overall) {
  const { cloud, auth, compliance } = scores;
  const hasAI  = answers[1] !== 'none' && answers[1] !== undefined;
  const hasEU  = answers[4] === 'yes_primary' || answers[4] === 'yes_some';
  const hasRAG = answers[2] === 'yes_user' || answers[2] === 'yes_internal';

  if (overall < 40 || auth < 40 || cloud < 30) {
    return {
      title: 'Starter Security Audit — Urgent',
      reason: 'Multiple high-risk areas identified. A Starter Audit delivers a prioritised remediation roadmap within 48 hours covering your most critical exposures.'
    };
  }
  if (hasAI && hasEU) {
    return {
      title: 'Full Security Audit — EU AI Act Compliance',
      reason: 'Your AI product with EU market presence requires MAESTRO framework coverage and EU AI Act compliance mapping to avoid regulatory exposure.'
    };
  }
  if (hasAI && hasRAG) {
    return {
      title: 'Full Security Audit — AI & RAG Coverage',
      reason: 'AI agents and RAG pipelines require deep MAESTRO 7-layer analysis and OWASP LLM/Agentic Top 10 testing beyond the Starter scope.'
    };
  }
  if (hasAI) {
    return {
      title: 'Starter Security Audit',
      reason: 'Your AI stack warrants an OWASP LLM Top 10 assessment and prompt injection testing. Start with a Starter Audit to map your specific exposure.'
    };
  }
  if (overall >= 70) {
    return {
      title: 'Monthly Security Monitoring',
      reason: 'Your baseline posture is reasonable. Continuous monitoring will catch regressions and new misconfigurations before they become incidents.'
    };
  }
  return {
    title: 'Starter Security Audit',
    reason: 'A focused assessment will surface specific vulnerabilities across your web application, cloud posture, and authentication controls.'
  };
}

// ── Show Results ────────────────────────────────────────────
function showResults() {
  const hasAI = answers[1] !== 'none';
  const cloud      = scoreCloud();
  const auth       = scoreAuth();
  const compliance = scoreCompliance();
  const scores     = { cloud, auth, compliance };

  // Only include AI domain if product actually uses AI
  const domains = [];
  if (hasAI) {
    const ai = scoreAI();
    scores.ai = ai;
    domains.push({ name: 'AI / LLM Security', score: ai });
  }
  domains.push(
    { name: 'Cloud & API Posture', score: cloud },
    { name: 'Authentication',     score: auth },
    { name: 'Compliance',         score: compliance },
  );

  const overall = Math.round(
    domains.reduce((sum, d) => sum + d.score, 0) / domains.length
  );

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
    `Your overall risk score is ${overall}/100 — ${overallRisk.label}. ` +
    `A full Fortark audit will surface the specific vulnerabilities behind these scores.`;

  // Domain bars
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
  const findings = generateFindings();
  const findingsList = document.getElementById('findings-list');
  findingsList.innerHTML = '';
  findings.forEach(f => {
    findingsList.innerHTML += `
      <div class="finding-item">
        <div class="finding-dot" style="background:${f.dot}"></div>
        <span>${f.text}</span>
      </div>`;
  });

  // Recommendation
  const rec = generateRecommendation(scores, overall);
  document.getElementById('recommendation-text').textContent = rec.title;
  document.getElementById('recommendation-reason').textContent = rec.reason;

  // Pre-populate hidden fields for email capture
  document.getElementById('hidden-scores').value = JSON.stringify({ overall, ...scores });
  document.getElementById('hidden-findings').value = findings.map(f => f.text).join(' | ');

  // Swap views
  quizBox.style.display = 'none';
  resultsSection.classList.add('visible');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Email capture form ──────────────────────────────────────
const emailForm = document.getElementById('scorecard-email-form');
if (emailForm) {
  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(emailForm);
    try {
      const res = await fetch('/', { method: 'POST', body: data });
      if (res.ok) {
        document.getElementById('email-capture-box').style.display = 'none';
        document.getElementById('email-success').classList.remove('hidden');
      }
    } catch (_) {
      // Fail silently — don't block the user
    }
  });
}

// ── Init ────────────────────────────────────────────────────
showQuestion(0);
