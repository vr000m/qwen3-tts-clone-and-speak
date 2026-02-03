const micSelect = document.getElementById("mic");
const speakerSelect = document.getElementById("speaker");

const startBtn = document.getElementById("btn-start");
const stopBtn = document.getElementById("btn-stop");
const clearBtn = document.getElementById("btn-clear");
const statusText = document.getElementById("status-text");
const timerEl = document.getElementById("timer");

const scriptEl = document.getElementById("script");
const speedEl = document.getElementById("speed");
const autoScrollBtn = document.getElementById("btn-scroll");
const speakerNameInput = document.getElementById("speaker-name");
const templateSelect = document.getElementById("script-template");

const player = document.getElementById("player");
const downloadLink = document.getElementById("download");
const downloadWavLink = document.getElementById("download-wav");

let mediaRecorder = null;
let mediaStream = null;
let chunks = [];
let timerId = null;
let startTime = null;
let scrollTimer = null;
let autoScrollOn = false;
let webmUrl = null;
let wavUrl = null;

// Prompter mode state
let prompterMode = false;
let sentences = [];
let currentSentenceIndex = 0;
let wordsInCurrentSentence = 0;
let wordCountThreshold = 0;
let spokenWordCount = 0;

// Audio analysis state
let audioContext = null;
let analyserNode = null;
let isSpeaking = false;
let silenceStart = null;
const SPEAK_THRESHOLD = 10; // Amplitude threshold to detect speech (0-255)
const SILENCE_THRESHOLD = 6; // Amplitude threshold for silence
const WORD_GAP_MS = 10; // Minimum silence duration to count as word boundary (median ~20ms)
let animationFrameId = null;

const STORAGE_KEY = "tts_speak_teleprompter";
const SPEAKER_KEY = "tts_speak_speaker_name";
const TEMPLATE_KEY = "tts_speak_template";

const scriptTemplates = [
  {
    id: "core-clarity-90s",
    label: "Core Clarity (90s)",
    // All 24 consonants + 16 common vowels in natural sentences
    text:
      "Today I am recording a clear reference sample for voice cloning. I will speak at a steady pace with natural pauses.\n\n" +
      "The boy enjoyed measuring how far the blue boat had floated across the calm bay. She chose a good path through the village, then joined her friends near the old church.\n\n" +
      "The weather was clear, with thin clouds and a light breeze from the south. I packed a warm jacket and took a short walk before heading back home.\n\n" +
      "I will finish now with even phrasing and a calm, steady tone.",
  },
  {
    id: "balanced-range-120s",
    label: "Balanced Range (120s)",
    // Adds remaining diphthongs and consonant clusters naturally
    text:
      "This is a natural reference script for voice cloning. I will speak clearly at a moderate pace with even breathing throughout.\n\n" +
      "Last Tuesday, I visited a small cafe near the train station. The atmosphere felt unusual but pleasant, and I enjoyed a quiet hour reading the newspaper. A friend called later to confirm our tour of the old castle.\n\n" +
      "The green field stretched wide under a pale morning sky. A cool breeze moved through the trees as the first birds began to sing. The air smelled fresh and pure after the night rain.\n\n" +
      "On the way home, I walked down a straight street past the square. Three children were playing near the fountain, their voices carrying clearly in the still air.\n\n" +
      "I will end with calm phrasing, steady rhythm, and consistent volume.",
  },
  {
    id: "extended-coverage-150s",
    label: "Extended Coverage (150s)",
    // Positional coverage through natural narrative
    text:
      "I am recording a longer sample for a voice reference. I will use relaxed pacing and smooth transitions so every sound is captured naturally.\n\n" +
      "The morning began with a cup of strong coffee and a good book. Bob had left a message about grabbing tickets for the evening show, so I made a note to call him back before noon.\n\n" +
      "Outside, the dog ran across the thick grass while a robin sang from the hedge. The path led through a gate and down toward the beach, where the waves made a soft rushing sound against the shore.\n\n" +
      "I stopped to watch a ship pass by on the calm sea. The vision of it moving slowly toward the horizon felt peaceful and timeless. A young boy nearby pointed with joy as seabirds circled above.\n\n" +
      "Later, I shared the photos with my mother and father. They both agreed the trip had been worth the long journey south. We made careful plans to return again next year when the weather turns fair.\n\n" +
      "I will finish with natural phrasing, clear endings, and a steady rhythm.",
  },
  {
    id: "full-spectrum-180s",
    label: "Full Spectrum (180s)",
    // Complete coverage with emotional variety and connected speech
    text:
      "Today I am recording a full reference passage for voice cloning. I will speak with calm consistency, natural pauses, and clear articulation.\n\n" +
      "The journey began on a bright Thursday morning. I caught the eight fifteen train and found a quiet seat near the window. A woman across the aisle was reading a thick novel, while her young son played with a small toy car.\n\n" +
      "We passed through several villages before reaching the coast. The view was stunning: white cliffs rose sharply from the azure water, and fishing boats rocked gently in the harbour. I took a few photographs to share with friends back home.\n\n" +
      "At the hotel, the manager greeted me with a warm smile. She showed me to a comfortable room with a view of the square below. The bathroom had fresh towels and a large mirror above the sink.\n\n" +
      "That evening, I enjoyed a leisurely meal at a restaurant near the theatre. The fish was excellent, and the service was thoughtful without being rushed. Afterward, I walked along the pier as the sun set behind the distant hills.\n\n" +
      "Would you believe I almost missed my train home? I had to rush through the station, but I made it just in time. What a relief that was!\n\n" +
      "I will end now with steady sentences and clear phrasing. The experience was wonderful, and I hope to visit again soon. Thank you for listening to this recording.",
  },
];

function formatTime(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function setStatus(text) {
  statusText.textContent = text;
}

function stopTimer() {
  if (timerId) {
    clearInterval(timerId);
    timerId = null;
  }
}

function updateTimer() {
  if (!startTime) return;
  timerEl.textContent = formatTime(Date.now() - startTime);
}

function startTimer() {
  startTime = Date.now();
  updateTimer();
  timerId = setInterval(updateTimer, 250);
}

function setButtons(recording) {
  startBtn.disabled = recording;
  stopBtn.disabled = !recording;
  clearBtn.disabled = recording;
}

function saveScript() {
  localStorage.setItem(STORAGE_KEY, scriptEl.value);
}

function sanitizeForFilename(value) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function getTemplateById(id) {
  return scriptTemplates.find((template) => template.id === id);
}

function populateTemplates() {
  templateSelect.innerHTML = "";
  scriptTemplates.forEach((template) => {
    const option = document.createElement("option");
    option.value = template.id;
    option.textContent = template.label;
    templateSelect.appendChild(option);
  });
  const savedTemplate = localStorage.getItem(TEMPLATE_KEY);
  templateSelect.value = getTemplateById(savedTemplate)
    ? savedTemplate
    : scriptTemplates[0].id;
}

function applyTemplate(id) {
  const template = getTemplateById(id);
  if (!template) return;
  scriptEl.value = template.text;
  saveScript();
}

function loadSpeakerName() {
  const saved = localStorage.getItem(SPEAKER_KEY);
  if (saved) {
    speakerNameInput.value = saved;
  }
}

function loadScript() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    scriptEl.value = saved;
  } else {
    const template = getTemplateById(templateSelect.value) || scriptTemplates[0];
    scriptEl.value = template.text;
  }
}

function stopAutoScroll() {
  if (scrollTimer) {
    clearInterval(scrollTimer);
    scrollTimer = null;
  }
  autoScrollOn = false;
  autoScrollBtn.textContent = "Auto Scroll";
}

// --- Prompter Mode Functions ---

function parseSentences(text) {
  // Split on sentence-ending punctuation, keeping the punctuation
  const raw = text.split(/(?<=[.!?])\s+/);
  return raw
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => ({
      text: s,
      wordCount: s.split(/\s+/).filter((w) => w.length > 0).length,
    }));
}

function calculateWordThreshold(sentenceIndex) {
  let total = 0;
  for (let i = 0; i <= sentenceIndex; i++) {
    total += sentences[i].wordCount;
  }
  return total;
}

function createPrompterElement(className, text) {
  const el = document.createElement("div");
  el.className = className;
  el.textContent = text;
  return el;
}

function renderPrompter() {
  const prev = sentences[currentSentenceIndex - 1];
  const current = sentences[currentSentenceIndex];
  const next = sentences[currentSentenceIndex + 1];

  // Hide original textarea and toolbar
  scriptEl.style.display = "none";
  const toolbar = document.querySelector(".teleprompter-toolbar");
  if (toolbar) toolbar.style.display = "none";

  let container = document.getElementById("prompter-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "prompter-container";
    container.className = "prompter-container";
    container.addEventListener("click", () => {
      if (prompterMode) advanceSentence();
    });
    scriptEl.parentNode.insertBefore(container, scriptEl.nextSibling);
  }

  // Clear existing content safely
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  // Build content using safe DOM methods
  container.appendChild(createPrompterElement("prompter-prev", prev ? prev.text : ""));

  const currentEl = createPrompterElement(
    "prompter-current",
    current ? current.text : "Done!",
  );
  container.appendChild(currentEl);

  container.appendChild(createPrompterElement("prompter-next", next ? next.text : ""));

  // Speaking indicator
  const indicator = createPrompterElement("prompter-indicator", "");
  indicator.id = "speaking-indicator";
  container.appendChild(indicator);

  container.appendChild(
    createPrompterElement(
      "prompter-progress",
      `Sentence ${currentSentenceIndex + 1} of ${sentences.length} · Words: ${spokenWordCount} / ${wordCountThreshold}`,
    ),
  );
  container.appendChild(
    createPrompterElement(
      "prompter-hint",
      "Speak naturally · Tap or Spacebar to skip · ← → to navigate",
    ),
  );

  container.style.display = "flex";
}

function exitPrompterMode() {
  prompterMode = false;
  currentSentenceIndex = 0;
  spokenWordCount = 0;
  sentences = [];

  const container = document.getElementById("prompter-container");
  if (container) {
    container.style.display = "none";
  }
  scriptEl.style.display = "";

  // Restore toolbar visibility
  const toolbar = document.querySelector(".teleprompter-toolbar");
  if (toolbar) toolbar.style.display = "";

  stopAudioAnalysis();
  document.removeEventListener("keydown", handlePrompterKeydown);
}

function advanceSentence() {
  if (currentSentenceIndex < sentences.length - 1) {
    currentSentenceIndex++;
    wordCountThreshold = calculateWordThreshold(currentSentenceIndex);
    renderPrompter();
  }
}

function previousSentence() {
  if (currentSentenceIndex > 0) {
    currentSentenceIndex--;
    // Adjust spoken word count to match
    spokenWordCount =
      currentSentenceIndex > 0 ? calculateWordThreshold(currentSentenceIndex - 1) : 0;
    wordCountThreshold = calculateWordThreshold(currentSentenceIndex);
    renderPrompter();
  }
}

function setupAudioAnalysis(stream) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  audioContext = new AudioContextClass();
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 256;
  analyserNode.smoothingTimeConstant = 0.3;

  const source = audioContext.createMediaStreamSource(stream);
  source.connect(analyserNode);
  // Don't connect to destination - we don't want to hear ourselves

  isSpeaking = false;
  silenceStart = null;
  spokenWordCount = 0;

  detectWords();
}

function updateSpeakingIndicator(speaking) {
  const indicator = document.getElementById("speaking-indicator");
  if (indicator) {
    indicator.className = speaking ? "prompter-indicator speaking" : "prompter-indicator";
  }
}

function detectWords() {
  if (!analyserNode || !prompterMode) {
    return;
  }

  const dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  analyserNode.getByteFrequencyData(dataArray);

  // Calculate average amplitude
  const average = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length;

  const now = Date.now();

  if (average > SPEAK_THRESHOLD) {
    // Speaking detected
    if (!isSpeaking) {
      isSpeaking = true;
      updateSpeakingIndicator(true);
    }
    silenceStart = null;
  } else if (average < SILENCE_THRESHOLD) {
    // Silence detected
    if (isSpeaking) {
      if (!silenceStart) {
        silenceStart = now;
      } else if (now - silenceStart > WORD_GAP_MS) {
        // Word boundary detected
        isSpeaking = false;
        spokenWordCount++;
        updateSpeakingIndicator(false);

        // Check if we should advance
        if (spokenWordCount >= wordCountThreshold) {
          advanceSentence();
        } else {
          // Update word count display
          updateWordCountDisplay();
        }
      }
    }
  }

  animationFrameId = requestAnimationFrame(detectWords);
}

function updateWordCountDisplay() {
  const progress = document.querySelector(".prompter-progress");
  if (progress) {
    progress.textContent = `Sentence ${currentSentenceIndex + 1} of ${sentences.length} · Words: ${spokenWordCount} / ${wordCountThreshold}`;
  }
}

function stopAudioAnalysis() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  if (audioContext && audioContext.state !== "closed") {
    audioContext.close();
  }
  audioContext = null;
  analyserNode = null;
}

function enterPrompterMode() {
  sentences = parseSentences(scriptEl.value);
  if (sentences.length === 0) {
    return false;
  }

  prompterMode = true;
  currentSentenceIndex = 0;
  spokenWordCount = 0;
  wordCountThreshold = calculateWordThreshold(0);

  renderPrompter();

  // Add keyboard listener for manual advance
  document.addEventListener("keydown", handlePrompterKeydown);

  return true;
}

function handlePrompterKeydown(e) {
  if (!prompterMode) return;

  if (e.code === "Space" || e.code === "ArrowRight" || e.code === "ArrowDown") {
    e.preventDefault();
    advanceSentence();
  } else if (e.code === "ArrowLeft" || e.code === "ArrowUp") {
    e.preventDefault();
    previousSentence();
  }
}

function startAutoScroll() {
  const speed = Number(speedEl.value);
  if (speed === 0) return;
  autoScrollOn = true;
  autoScrollBtn.textContent = "Stop Scroll";
  scrollTimer = setInterval(() => {
    scriptEl.scrollTop += speed / 8;
  }, 120);
}

autoScrollBtn.addEventListener("click", () => {
  if (autoScrollOn) {
    stopAutoScroll();
  } else {
    startAutoScroll();
  }
});

scriptEl.addEventListener("input", saveScript);

speakerNameInput.addEventListener("input", () => {
  localStorage.setItem(SPEAKER_KEY, speakerNameInput.value.trim());
});

templateSelect.addEventListener("change", () => {
  const savedScript = localStorage.getItem(STORAGE_KEY);
  const currentTemplate = getTemplateById(localStorage.getItem(TEMPLATE_KEY));
  const isModified =
    savedScript && currentTemplate && savedScript !== currentTemplate.text;

  if (isModified) {
    const confirmed = window.confirm(
      "Changing the template will replace your current script. Continue?",
    );
    if (!confirmed) {
      templateSelect.value = localStorage.getItem(TEMPLATE_KEY) || scriptTemplates[0].id;
      return;
    }
  }

  localStorage.setItem(TEMPLATE_KEY, templateSelect.value);
  applyTemplate(templateSelect.value);
});

function applySpeakerSink(audioEl, deviceId) {
  if (!deviceId) return;
  if (typeof audioEl.setSinkId === "function") {
    audioEl.setSinkId(deviceId).catch(() => {
      // Ignore failures, likely unsupported browser.
    });
  }
}

async function ensurePermissions() {
  if (!mediaStream) {
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  }
}

async function populateDevices() {
  await ensurePermissions();
  const devices = await navigator.mediaDevices.enumerateDevices();
  const inputs = devices.filter((d) => d.kind === "audioinput");
  const outputs = devices.filter((d) => d.kind === "audiooutput");

  const selectedMic = localStorage.getItem("tts_speak_mic");
  const selectedSpeaker = localStorage.getItem("tts_speak_speaker");

  micSelect.innerHTML = "";
  speakerSelect.innerHTML = "";

  inputs.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Microphone ${micSelect.length + 1}`;
    if (device.deviceId === selectedMic) option.selected = true;
    micSelect.appendChild(option);
  });

  outputs.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.deviceId;
    option.textContent = device.label || `Speaker ${speakerSelect.length + 1}`;
    if (device.deviceId === selectedSpeaker) option.selected = true;
    speakerSelect.appendChild(option);
  });

  if (speakerSelect.value) {
    applySpeakerSink(player, speakerSelect.value);
  }
}

async function getSelectedStream() {
  const deviceId = micSelect.value || undefined;
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: deviceId ? { deviceId: { exact: deviceId } } : true,
  });
  return mediaStream;
}

function getFileBase() {
  const dateStamp = new Date().toISOString().slice(0, 10);
  const templateLabel =
    templateSelect.options[templateSelect.selectedIndex]?.textContent ||
    templateSelect.value ||
    "reference";
  const speakerValue = speakerNameInput.value || "speaker";
  const templateSlug = sanitizeForFilename(templateLabel) || "reference";
  const speakerSlug = sanitizeForFilename(speakerValue) || "speaker";
  return `${dateStamp}-${templateSlug}-${speakerSlug}`;
}

function writeWavString(view, offset, text) {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function encodeWav(audioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const numFrames = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const buffer = new ArrayBuffer(44 + numFrames * blockAlign);
  const view = new DataView(buffer);

  writeWavString(view, 0, "RIFF");
  view.setUint32(4, 36 + numFrames * blockAlign, true);
  writeWavString(view, 8, "WAVE");
  writeWavString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeWavString(view, 36, "data");
  view.setUint32(40, numFrames * blockAlign, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      let sample = audioBuffer.getChannelData(channel)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      offset += 2;
    }
  }

  return buffer;
}

async function createWavBlob(webmBlob) {
  const buffer = await webmBlob.arrayBuffer();
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextClass();
  const audioBuffer = await audioContext.decodeAudioData(buffer);
  const wavBuffer = encodeWav(audioBuffer);
  await audioContext.close();
  return new Blob([wavBuffer], { type: "audio/wav" });
}

async function startRecording() {
  try {
    await ensurePermissions();
    const stream = await getSelectedStream();
    chunks = [];

    // Enter prompter mode and set up audio analysis
    if (enterPrompterMode()) {
      setupAudioAnalysis(stream);
    }

    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: "audio/webm" });
      const url = URL.createObjectURL(blob);
      if (webmUrl) URL.revokeObjectURL(webmUrl);
      if (wavUrl) URL.revokeObjectURL(wavUrl);
      webmUrl = url;
      wavUrl = null;
      player.src = url;
      downloadLink.href = url;
      downloadWavLink.href = "#";
      downloadWavLink.textContent = "Preparing WAV...";
      downloadWavLink.setAttribute("aria-disabled", "true");

      const fileBase = getFileBase();
      downloadLink.download = `${fileBase}.webm`;
      downloadWavLink.download = `${fileBase}.wav`;

      createWavBlob(blob)
        .then((wavBlob) => {
          wavUrl = URL.createObjectURL(wavBlob);
          downloadWavLink.href = wavUrl;
          downloadWavLink.textContent = "Download WAV";
          downloadWavLink.setAttribute("aria-disabled", "false");
        })
        .catch(() => {
          downloadWavLink.textContent = "WAV unavailable";
          downloadWavLink.setAttribute("aria-disabled", "true");
        });

      setStatus("Recorded");
    };

    mediaRecorder.start();
    setStatus("Recording");
    setButtons(true);
    startTimer();
  } catch (err) {
    setStatus("Mic permission denied");
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  stopTimer();
  stopAutoScroll();
  exitPrompterMode();
  timerEl.textContent = "00:00";
  setButtons(false);
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
}

function clearRecording() {
  player.removeAttribute("src");
  downloadLink.href = "#";
  downloadLink.download = "recording.webm";
  downloadWavLink.href = "#";
  downloadWavLink.download = "recording.wav";
  downloadWavLink.textContent = "Download WAV";
  downloadWavLink.setAttribute("aria-disabled", "true");
  if (webmUrl) {
    URL.revokeObjectURL(webmUrl);
    webmUrl = null;
  }
  if (wavUrl) {
    URL.revokeObjectURL(wavUrl);
    wavUrl = null;
  }
  setStatus("Idle");
}

micSelect.addEventListener("change", () => {
  localStorage.setItem("tts_speak_mic", micSelect.value);
});

speakerSelect.addEventListener("change", () => {
  localStorage.setItem("tts_speak_speaker", speakerSelect.value);
  applySpeakerSink(player, speakerSelect.value);
});

startBtn.addEventListener("click", startRecording);
stopBtn.addEventListener("click", stopRecording);
clearBtn.addEventListener("click", clearRecording);

window.addEventListener("beforeunload", () => {
  stopAutoScroll();
  if (mediaStream) {
    mediaStream.getTracks().forEach((track) => track.stop());
  }
});

downloadWavLink.setAttribute("aria-disabled", "true");

downloadWavLink.addEventListener("click", (e) => {
  if (downloadWavLink.getAttribute("aria-disabled") === "true") {
    e.preventDefault();
  }
});

populateTemplates();
loadSpeakerName();
loadScript();
setButtons(false);
populateDevices().catch(() => {
  setStatus("Allow microphone access to list devices");
});

// Auto-update device list when devices are connected/disconnected
navigator.mediaDevices.addEventListener("devicechange", () => {
  populateDevices().catch(() => {});
});
