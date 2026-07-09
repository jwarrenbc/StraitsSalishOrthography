document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const inputOrthoSelect = document.getElementById('inputOrtho');
  const outputOrthoSelect = document.getElementById('outputOrtho');
  const inputTextarea = document.getElementById('inputText');
  const outputTextarea = document.getElementById('outputText');
  const clearInputBtn = document.getElementById('clearInput');
  const copyOutputBtn = document.getElementById('copyOutput');
  const copyToast = document.getElementById('copyToast');
  const swapBtn = document.getElementById('swapBtn');

  let mapper = null;

  // Lock UI controls while loading CSV mappings
  inputTextarea.disabled = true;
  inputOrthoSelect.disabled = true;
  outputOrthoSelect.disabled = true;
  inputTextarea.placeholder = 'Loading orthography mappings...';

  // Fetch the mapping CSV directly from the server's lib directory
  fetch('lib/orthography_mapping.csv')
    .then(res => {
      if (!res.ok) throw new Error(`Failed to load mapping CSV: ${res.statusText} (${res.status})`);
      return res.text();
    })
    .then(csvText => {
      // Instantiate the mapper using the class exported from mapper.js
      const OrthographyMapper = module.exports;
      mapper = new OrthographyMapper(csvText);
      
      // Enable the UI inputs
      inputTextarea.disabled = false;
      inputOrthoSelect.disabled = false;
      outputOrthoSelect.disabled = false;
      inputTextarea.placeholder = 'Type or paste text to translate...';
      inputTextarea.focus();
    })
    .catch(error => {
      console.error('Initialization error:', error);
      inputTextarea.placeholder = 'Failed to load translator mapping engine.';
      outputTextarea.value = `Error loading translation mappings: ${error.message}\n\nPlease check that the file 'lib/orthography_mapping.csv' is hosted and accessible.`;
      outputTextarea.classList.add('error');
    });

  // Handle Translate Trigger
  function performTranslation() {
    if (!mapper) return;
    const text = inputTextarea.value;
    const src = inputOrthoSelect.value;
    const tgt = outputOrthoSelect.value;
    
    if (!text.trim()) {
      outputTextarea.value = '';
      return;
    }
    
    try {
      const translated = mapper.translate(src, tgt, text);
      outputTextarea.value = translated;
      outputTextarea.classList.remove('error');
    } catch (err) {
      console.error(err);
      outputTextarea.value = 'Translation error: ' + err.message;
      outputTextarea.classList.add('error');
    }
  }

  // Debounced/Auto-translation helper for immediate feedback
  let translateTimeout;
  function autoTranslate() {
    clearTimeout(translateTimeout);
    translateTimeout = setTimeout(performTranslation, 100);
  }

  // Clear Input Action
  clearInputBtn.addEventListener('click', () => {
    inputTextarea.value = '';
    outputTextarea.value = '';
    inputTextarea.focus();
  });

  // Copy Output Action
  copyOutputBtn.addEventListener('click', async () => {
    const textToCopy = outputTextarea.value;
    if (!textToCopy) return;

    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback
      outputTextarea.select();
      document.execCommand('copy');
      showToast('Copied to clipboard!');
    }
  });

  function showToast(message) {
    copyToast.textContent = message;
    copyToast.classList.add('show');
    setTimeout(() => {
      copyToast.classList.remove('show');
    }, 2000);
  }

  // Swap Languages Action
  if (swapBtn) {
    swapBtn.addEventListener('click', () => {
      const tempOrtho = inputOrthoSelect.value;
      inputOrthoSelect.value = outputOrthoSelect.value;
      outputOrthoSelect.value = tempOrtho;
      
      const tempText = inputTextarea.value;
      inputTextarea.value = outputTextarea.value;
      outputTextarea.value = tempText;
      
      // Re-translate with new source/target
      performTranslation();
    });
  }

  // Event listeners
  inputTextarea.addEventListener('input', autoTranslate);
  inputOrthoSelect.addEventListener('change', performTranslation);
  outputOrthoSelect.addEventListener('change', performTranslation);
});
