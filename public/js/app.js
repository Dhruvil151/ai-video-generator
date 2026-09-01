document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('generate-form');
  const inputSection = document.getElementById('input-section');
  const progressSection = document.getElementById('progress-section');
  const resultSection = document.getElementById('result-section');
  
  const submitBtn = document.getElementById('submit-btn');
  const btnText = submitBtn.querySelector('.btn-text');
  const btnLoader = submitBtn.querySelector('.btn-loader');
  
  const progressBar = document.getElementById('progress-bar');
  const progressPercentage = document.getElementById('progress-percentage');
  const progressStep = document.getElementById('progress-step');
  
  const outputVideo = document.getElementById('output-video');
  const downloadBtn = document.getElementById('download-btn');
  const createAnotherBtn = document.getElementById('create-another-btn');
  
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');

  let activeEventSource = null;

  // ── Form Submission ──────────────────────────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const topic = document.getElementById('topic').value.trim();
    const mode = document.getElementById('mode').value;
    const voice = document.getElementById('voice').value;
    
    if (!topic) return;

    setLoading(true);

    try {
      // Step 1: Generate Script
      progressStep.textContent = 'Generating script with Gemini...';
      const scriptRes = await fetch('/api/script/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, mode, voice })
      });
      
      const scriptData = await scriptRes.json();
      if (!scriptRes.ok) throw new Error(scriptData.error || 'Failed to generate script');

      // Step 2: Queue Job
      progressStep.textContent = 'Queuing render job...';
      const renderRes = await fetch('/api/render/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptId: scriptData.id, voice })
      });
      
      const renderData = await renderRes.json();
      if (!renderRes.ok) throw new Error(renderData.error || 'Failed to start render');

      // Step 3: Listen to SSE for live progress
      startSSE(renderData.jobId);
      
      // Transition UI
      inputSection.classList.add('hidden');
      progressSection.classList.remove('hidden');
      progressSection.classList.add('animate-fade-in');

    } catch (err) {
      showError(err.message);
      setLoading(false);
    }
  });

  // ── Server-Sent Events (Live Progress) ───────────────────────────────────────
  function startSSE(jobId) {
    if (activeEventSource) activeEventSource.close();
    
    activeEventSource = new EventSource(`/api/render/${jobId}/stream`);

    activeEventSource.addEventListener('progress', (e) => {
      const data = JSON.parse(e.data);
      updateProgress(data.progress, data.currentStep);
    });

    activeEventSource.addEventListener('completed', (e) => {
      const data = JSON.parse(e.data);
      updateProgress(100, 'Video ready!');
      activeEventSource.close();
      showResult(data.outputVideoUrl);
    });

    activeEventSource.addEventListener('failed', (e) => {
      const data = JSON.parse(e.data);
      activeEventSource.close();
      showError(`Render failed: ${data.error}`);
      resetUI();
    });

    activeEventSource.addEventListener('error', (e) => {
      console.error('SSE Error', e);
      // Automatically reconnects on its own, but we handle explicit disconnects
    });
  }

  // ── UI Helpers ───────────────────────────────────────────────────────────────
  function updateProgress(pct, message) {
    progressBar.style.width = `${pct}%`;
    progressPercentage.textContent = `${pct}%`;
    if (message) {
      progressStep.textContent = message;
    }
  }

  function showResult(videoUrl) {
    progressSection.classList.add('hidden');
    resultSection.classList.remove('hidden');
    resultSection.classList.add('animate-fade-in');
    
    outputVideo.src = videoUrl;
    downloadBtn.href = videoUrl;
  }

  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    if (isLoading) {
      btnText.classList.add('hidden');
      btnLoader.classList.remove('hidden');
    } else {
      btnText.classList.remove('hidden');
      btnLoader.classList.add('hidden');
    }
  }

  function resetUI() {
    setLoading(false);
    inputSection.classList.remove('hidden');
    progressSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    updateProgress(0, 'Connecting to AI model...');
    if (activeEventSource) {
      activeEventSource.close();
      activeEventSource = null;
    }
  }

  function showError(msg) {
    toastMessage.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 5000);
  }

  createAnotherBtn.addEventListener('click', () => {
    outputVideo.pause();
    outputVideo.src = "";
    resetUI();
  });
});
