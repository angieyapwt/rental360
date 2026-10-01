'use strict';
const form = document.getElementById('budget-form');
const result = document.getElementById('budget-result');
const currency = new Intl.NumberFormat('en-SG', {style:'currency',currency:'SGD',minimumFractionDigits:0,maximumFractionDigits:0});
const money = {format: value => currency.format(value).replace(/^\$/, 'S$')};
const rentInput = document.getElementById('rent');
const leaseInput = document.getElementById('months');
const depositInput = document.getElementById('deposit');
const advanceInput = document.getElementById('advance');
const depositHint = document.getElementById('deposit-hint');
let useSuggestedDeposit = true;
let useSuggestedAdvance = true;

function updateSuggestions(changedInput) {
  const rent = Number(rentInput.value);
  const months = Number(leaseInput.value);
  const depositMonths = months === 12 ? 1 : months === 24 ? 2 : null;
  if (changedInput === depositInput) useSuggestedDeposit = false;
  if (changedInput === advanceInput) useSuggestedAdvance = false;
  if (changedInput === leaseInput && depositMonths !== null) {
    useSuggestedDeposit = true;
    useSuggestedAdvance = true;
  }
  if (rentInput.validity.valid && rent > 0) {
    if (useSuggestedDeposit && depositMonths !== null) depositInput.value = String(rent * depositMonths);
    if (useSuggestedAdvance) advanceInput.value = String(rent);
  }
  depositHint.textContent = depositMonths === null
    ? 'For this lease length, enter the security deposit you agree with your landlord.'
    : useSuggestedDeposit
      ? `Suggested: ${depositMonths} month${depositMonths === 1 ? '’s' : 's’'} rent for a ${months}-month lease. Change this if you agree a different amount.`
      : 'Using your entered deposit. Confirm this amount in writing with your landlord.';
}

function calculateEstimate() {
  if (!form.checkValidity()) {
    result.replaceChildren(Object.assign(document.createElement('span'), {textContent:'Check your figures to see your updated estimate. Use a lease length from 1 to 48 months.'}));
    return;
  }
  const values = Object.fromEntries(['rent','months','deposit','advance','other'].map(id => [id, Number(document.getElementById(id).value)]));
  if (Object.values(values).some(v => !Number.isFinite(v))) return;
  const duty = values.rent * 12 <= 1000 ? 0 : Math.max(1, Math.floor(values.rent * values.months * 0.004 + 1e-9));
  const total = values.deposit + values.advance + values.other + duty;
  result.replaceChildren();
  const label = document.createElement('span'); label.textContent = 'Estimated upfront total';
  const amount = document.createElement('strong'); amount.textContent = money.format(total);
  const breakdown = document.createElement('dl'); breakdown.className = 'cost-breakdown';
  [['Security deposit',values.deposit],['Advance rent',values.advance],['Stamp duty',duty],['Other upfront costs',values.other]].forEach(([name,value]) => {
    const row = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = name;
    const sum = document.createElement('dd'); sum.textContent = money.format(value);
    row.append(term,sum); breakdown.append(row);
  });
  result.append(label, amount, breakdown);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  calculateEstimate();
});
form.addEventListener('input', (event) => {
  updateSuggestions(event.target);
  calculateEstimate();
});
updateSuggestions(null);
calculateEstimate();
// Integration hooks only. No analytics service is installed and no data is transmitted.
document.querySelectorAll('[data-event]').forEach(link => link.addEventListener('click', () => {
  window.dispatchEvent(new CustomEvent('estatebasics:conversion', {detail:{event:link.dataset.event}}));
}));

const emailForm = document.getElementById('guide-email-form');
const emailStatus = document.getElementById('email-status');
emailForm.addEventListener('submit', event => {
  event.preventDefault();
  const email = document.getElementById('guide-email');
  email.value = email.value.trim();
  if (!emailForm.reportValidity()) return;
  if (emailForm.elements.website.value) return;
  const endpoint = window.estateBasicsEmail?.endpoint;
  if (!endpoint || !/^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(endpoint)) {
    emailStatus.textContent = 'Email delivery is being connected. Please try again shortly.';
    return;
  }
  emailForm.action = endpoint;
  emailForm.method = 'post';
  emailForm.target = '_blank';
  for (const [name,value] of Object.entries({guide:'rental-360',requestId:crypto.randomUUID()})) {
    let field = emailForm.querySelector(`input[name="${name}"]`);
    if (!field) { field=document.createElement('input'); field.type='hidden'; field.name=name; emailForm.append(field); }
    field.value=value;
  }
  emailStatus.textContent = 'Check the new tab for confirmation that your guidebook was sent.';
  // A normal form POST works across GitHub Pages and Apps Script without CORS workarounds.
  // The new Google-hosted tab reports the actual server outcome; opening it is not proof of sending.
  emailForm.submit();
});
