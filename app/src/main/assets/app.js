const SHEET_ID = '1cv8JvmglnVXYJduC_93VQrqJjom5CIbe';
const SHEETS = ['TubingCatalog', 'UnsupportedColumn'];
let DATA = window.SNUBBING_SEED_DATA || { TubingCatalog: [], UnsupportedColumn: [] };
let state = { ram: 'Yes', direction: 'RIH', full: 'No' };

const $ = (id) => document.getElementById(id);
const fmt = new Intl.NumberFormat('en-US');

function csvUrl(sheet) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', quote = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i], next = text[i + 1];
    if (ch === '"' && quote && next === '"') { cell += '"'; i++; }
    else if (ch === '"') quote = !quote;
    else if (ch === ',' && !quote) { row.push(cell); cell = ''; }
    else if ((ch === '\n' || ch === '\r') && !quote) {
      if (ch === '\r' && next === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.filter(r => r.some(v => v !== '')).map(r => Object.fromEntries(headers.map((h, i) => [h, coerce(r[i])])))
}

function coerce(v) {
  if (v === undefined || v === null || v === '') return '';
  const n = Number(String(v).replace(/,/g, ''));
  return Number.isFinite(n) && String(v).trim() !== '' ? n : v;
}

async function refreshData() {
  $('dataStatus').textContent = 'Refreshing Google Sheet data…';
  try {
    const loaded = {};
    for (const s of SHEETS) {
      const res = await fetch(csvUrl(s), { cache: 'no-store' });
      if (!res.ok) throw new Error(`${s}: ${res.status}`);
      loaded[s] = parseCSV(await res.text());
    }
    DATA = loaded;
    localStorage.setItem('snubbingData', JSON.stringify(DATA));
    $('dataStatus').textContent = `Using live Google Sheet data. Updated ${new Date().toLocaleTimeString()}.`;
  } catch (err) {
    const cached = localStorage.getItem('snubbingData');
    if (cached) {
      DATA = JSON.parse(cached);
      $('dataStatus').textContent = 'Google Sheet unavailable; using cached data from this device.';
    } else {
      $('dataStatus').textContent = 'Google Sheet unavailable; using bundled starter data.';
    }
  }
  buildDropdowns();
  calculate();
}

function tubingSize(t) { return Number(t.PipeOD_in).toFixed(3).replace(/\.000$/, ''); }
function weightConn(t) { return `${t.NominalWeight_ppf} ppf${t.Connection ? ' / ' + t.Connection : ''}`; }

function unique(arr) { return [...new Set(arr)].filter(v => v !== '' && v !== undefined && v !== null).sort((a,b)=> String(a).localeCompare(String(b), undefined, {numeric:true})); }
function setOptions(sel, values, keep) {
  sel.innerHTML = values.map(v => `<option value="${String(v).replaceAll('"','&quot;')}">${v}</option>`).join('');
  if (values.includes(keep)) sel.value = keep;
}

function buildDropdowns() {
  const cat = DATA.TubingCatalog || [];
  const old = { size: $('sizeSelect').value, grade: $('gradeSelect').value, tube: $('tubeSelect').value };
  const sizes = unique(cat.map(tubingSize));
  setOptions($('sizeSelect'), sizes, old.size || '2.875');
  const size = $('sizeSelect').value;
  const gradeList = unique(cat.filter(t => tubingSize(t) === size).map(t => t.Grade));
  setOptions($('gradeSelect'), gradeList, old.grade || 'P110');
  const grade = $('gradeSelect').value;
  const tubes = cat.filter(t => tubingSize(t) === size && String(t.Grade) === String(grade));
  $('tubeSelect').innerHTML = tubes.map(t => `<option value="${t.TubingID}">${weightConn(t)}</option>`).join('');
  if (tubes.some(t => t.TubingID === old.tube)) $('tubeSelect').value = old.tube;
}

function selectedTubing() { return (DATA.TubingCatalog || []).find(t => t.TubingID === $('tubeSelect').value) || DATA.TubingCatalog[0]; }
function num(id, fallback=0) { const v = Number($(id).value); return Number.isFinite(v) ? v : fallback; }
function ceil(v) { return Math.ceil(Number(v) || 0); }
function lbs(v) { return `${fmt.format(ceil(v))} lbs`; }
function ft(v) { return Number.isFinite(v) ? `${Number(v).toFixed(v % 1 ? 1 : 0)} ft` : '—'; }

function effectiveWeight(t) {
  const base = Number(t.NominalWeight_ppf) || 0, od = Number(t.PipeOD_in)||0, id = Number(t.PipeID_in)||0;
  const tubeFluidRaw = $('tubeFluidInput').value, wellFluidRaw = $('wellFluidInput').value;
  const tubeFluid = num('tubeFluidInput'), wellFluid = num('wellFluidInput');
  if (state.direction === 'RIH' && wellFluidRaw === '') return { value: base, note: 'No fluid weights entered — using nominal pipe weight.' };
  if (state.direction === 'RIH' && wellFluidRaw !== '') return { value: base - ((od ** 2 * wellFluid) / 24.5), note: 'RIH with wellbore fluid weight adjustment.' };
  if (state.direction === 'POOH' && state.full === 'No') return { value: base - ((od ** 2 * wellFluid) / 24.5), note: 'POOH, tubing not full — wellbore fluid adjustment only.' };
  return { value: base + ((id ** 2 * tubeFluid) / 24.5) - ((od ** 2 * wellFluid) / 24.5), note: 'POOH, tubing full — tubing and wellbore fluid adjustments.' };
}

function lookupLength(tid, force, col) {
  const rows = (DATA.UnsupportedColumn || [])
    .filter(r => r.TubingID === tid && Number(r[col]) >= force)
    .sort((a,b) => Number(b.UnsupportedLength_ft) - Number(a.UnsupportedLength_ft));
  return rows.length ? Number(rows[0].UnsupportedLength_ft) : NaN;
}

function calculate() {
  const t = selectedTubing(); if (!t) return;
  const pressure = num('pressureInput');
  const od = Number(t.PipeOD_in)||0, id = Number(t.PipeID_in)||0, cOD = Number(t.CouplingOD_in)||0;
  const snubNo = ceil(od ** 2 * 0.7854 * pressure);
  const snubF = ceil(od ** 2 * 0.7854 * pressure * 1.2);
  const annNo = ceil(cOD ** 2 * 0.7854 * pressure);
  const annF = ceil(cOD ** 2 * 0.7854 * pressure * 1.2);
  const showAnn = state.ram === 'No' || pressure < 2500;
  const ew = effectiveWeight(t);
  const joint = num('jointInput', 31.3) || 31.3;
  const transFt = ew.value > 0 ? snubNo / ew.value : NaN;
  const transJoints = Number.isFinite(transFt) ? Math.ceil(transFt / joint) : NaN;

  $('selectedDetails').innerHTML = [
    ['OD', `${od} in`], ['ID', `${id} in`], ['Coupling OD', `${cOD} in`], ['Nominal Weight', `${t.NominalWeight_ppf} ppf`], ['Grade', t.Grade], ['Connection', t.Connection || '—']
  ].map(([k,v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('effectiveWeight').textContent = `${Number(ew.value).toFixed(2)} ppf`;
  $('weightNote').textContent = ew.note;
  $('snubNo').textContent = lbs(snubNo); $('snubFriction').textContent = lbs(snubF);
  $('annularNo').textContent = lbs(annNo); $('annularFriction').textContent = lbs(annF);
  $('annularForceBlock').classList.toggle('hidden', !showAnn);
  document.querySelectorAll('.annular-only').forEach(el => el.classList.toggle('hidden', !showAnn));
  $('lenNo100').textContent = ft(lookupLength(t.TubingID, snubNo, 'Force100_lbs'));
  $('lenNo80').textContent = ft(lookupLength(t.TubingID, snubNo, 'Force80_lbs'));
  $('lenF100').textContent = ft(lookupLength(t.TubingID, snubF, 'Force100_lbs'));
  $('lenF80').textContent = ft(lookupLength(t.TubingID, snubF, 'Force80_lbs'));
  $('lenAnnNo100').textContent = ft(lookupLength(t.TubingID, annNo, 'Force100_lbs'));
  $('lenAnnNo80').textContent = ft(lookupLength(t.TubingID, annNo, 'Force80_lbs'));
  $('lenAnnF100').textContent = ft(lookupLength(t.TubingID, annF, 'Force100_lbs'));
  $('lenAnnF80').textContent = ft(lookupLength(t.TubingID, annF, 'Force80_lbs'));
  $('transFt').textContent = Number.isFinite(transFt) ? `${fmt.format(Math.ceil(transFt))} ft` : '—';
  $('transJoints').textContent = Number.isFinite(transJoints) ? `${fmt.format(transJoints)} joints` : '—';
  updateControls();
}

function updateControls() {
  const pooh = state.direction === 'POOH';
  $('tubingFullField').classList.toggle('disabled', !pooh);
  const tubeFluidEnabled = pooh && state.full === 'Yes';
  $('tubeFluidInput').disabled = !tubeFluidEnabled;
  $('tubeFluidLabel').classList.toggle('disabled', !tubeFluidEnabled);
}

function resetInputs() {
  $('pressureInput').value = 3000; $('jointInput').value = ''; $('wellFluidInput').value = ''; $('tubeFluidInput').value = '';
  state = { ram: 'Yes', direction: 'RIH', full: 'No' };
  document.querySelectorAll('.seg button').forEach(b => b.classList.toggle('active', b.dataset.value === state[b.dataset.group]));
  buildDropdowns(); calculate();
}

document.addEventListener('click', e => {
  if (e.target.matches('.seg button')) {
    state[e.target.dataset.group] = e.target.dataset.value;
    document.querySelectorAll(`[data-group="${e.target.dataset.group}"]`).forEach(b => b.classList.toggle('active', b === e.target));
    calculate();
  }
});
['pressureInput','jointInput','tubeFluidInput','wellFluidInput','tubeSelect'].forEach(id => $(id).addEventListener('input', calculate));
$('sizeSelect').addEventListener('change', () => { buildDropdowns(); calculate(); });
$('gradeSelect').addEventListener('change', () => { buildDropdowns(); calculate(); });
$('refreshBtn').addEventListener('click', refreshData); $('resetBtn').addEventListener('click', resetInputs);
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
refreshData();
