const RELEASE = {
  name: 'Complete Nederlandse vertaling v1.0.17',
  outputName: 'Xenosaga I+II (Japan) [Dutch v1.0.17 Final].nds',
  patchLabel: 'Nederlandse v1.0.17 BPS SHA-256',
  patchHash: '8c102caaff764de32ca677d7de9cfb7622041a8c1f5001a5be60d55498783ae9',
  outputLabel: 'Nederlandse v1.0.17 output SHA-256',
  outputHash: 'ab4b66928073ff6caa61dc0c4f2fcbafa0150a69f003133d252c3737efb26a0b',
  resultTitle: 'Nederlandse v1.0.17 klaar'
};

const stepOrder = ['reading', 'source', 'patch', 'apply', 'output', 'ready'];
const input = document.querySelector('#romInput');
const selectButton = document.querySelector('#selectRom');
const dropZone = document.querySelector('#dropZone');
const stateBadge = document.querySelector('#stateBadge');
const percent = document.querySelector('#percent');
const progressBar = document.querySelector('#progressBar');
const statusMessage = document.querySelector('#statusMessage');
const resultPanel = document.querySelector('#resultPanel');
const resultTitle = document.querySelector('#resultTitle');
const resultHash = document.querySelector('#resultHash');
const downloadRom = document.querySelector('#downloadRom');
let downloadUrl = null;
let worker = null;

function resetSteps() { document.querySelectorAll('.steps li').forEach(li => li.classList.remove('active', 'done')); }
function setProgress(stage, value, message) {
  const v = Math.max(0, Math.min(100, value || 0));
  progressBar.style.width = `${v}%`; percent.textContent = `${v}%`;
  const stageIndex = stepOrder.indexOf(stage);
  document.querySelectorAll('.steps li').forEach(li => {
    const idx = stepOrder.indexOf(li.dataset.step);
    li.classList.toggle('done', idx < stageIndex || (stage === 'ready' && idx <= stageIndex));
    li.classList.toggle('active', idx === stageIndex && stage !== 'ready');
  });
  if (message) statusMessage.textContent = message;
}
function setBadge(text, type) { stateBadge.textContent = text; stateBadge.className = `status-badge ${type}`; }
function cleanupDownload() {
  if (downloadUrl) URL.revokeObjectURL(downloadUrl); downloadUrl = null;
  resultPanel.hidden = true; downloadRom.removeAttribute('href');
}
function fail(message) { setBadge('Gestopt', 'error'); statusMessage.textContent = message; resultPanel.hidden = true; }
function newWorker() {
  if (worker) worker.terminate();
  worker = new Worker('./js/patch-worker.js?v=20260905-1', { type: 'module' });
  worker.onmessage = event => {
    const data = event.data;
    if (data.type === 'progress') { setBadge('Bezig', 'working'); setProgress(data.stage, data.percent, data.message); }
    else if (data.type === 'success') {
      const blob = new Blob([data.output], { type: 'application/octet-stream' });
      downloadUrl = URL.createObjectURL(blob); downloadRom.href = downloadUrl; downloadRom.download = RELEASE.outputName;
      resultTitle.textContent = RELEASE.resultTitle; resultHash.textContent = data.outputHash; resultPanel.hidden = false;
      setBadge('Geverifieerd', 'success'); setProgress('ready', 100, `PATCH SUCCESVOL\n${RELEASE.name} is lokaal opgebouwd en de outputhash klopt.`);
    } else if (data.type === 'error') fail(data.message);
  };
  worker.onerror = event => fail(`Browser patch worker faalde: ${event.message || 'onbekende fout'}`);
}
async function patchFile(file) {
  cleanupDownload(); resetSteps(); setBadge('Bezig', 'working'); setProgress('reading', 2, `${file.name} lokaal lezen…`);
  if (file.size !== 67108864) { fail(`Niet-ondersteunde ROM-grootte.\n\nVerwacht: 67.108.864 bytes (64 MiB).\nJouw bestand: ${file.size.toLocaleString('nl-NL')} bytes.\n\nEr is niets gewijzigd.`); return; }
  try {
    const source = await file.arrayBuffer(); newWorker(); worker.postMessage({ type: 'patch', source }, [source]);
  } catch (error) { fail(error instanceof Error ? error.message : String(error)); }
}
selectButton.addEventListener('click', () => input.click());
input.addEventListener('change', () => { if (input.files?.[0]) patchFile(input.files[0]); });
dropZone.addEventListener('click', event => { if (event.target !== selectButton) input.click(); });
dropZone.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); } });
for (const eventName of ['dragenter', 'dragover']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.add('dragover'); });
for (const eventName of ['dragleave', 'drop']) dropZone.addEventListener(eventName, event => { event.preventDefault(); dropZone.classList.remove('dragover'); });
dropZone.addEventListener('drop', event => { const file = event.dataTransfer?.files?.[0]; if (file) patchFile(file); });
window.addEventListener('beforeunload', cleanupDownload);
resultTitle.textContent = RELEASE.resultTitle; resultHash.textContent = RELEASE.outputHash;
