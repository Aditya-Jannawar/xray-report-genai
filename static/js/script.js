const imageInput = document.getElementById("xray-image");
const imagePreview = document.getElementById("image-preview");
const previewFrame = document.getElementById("preview-frame");
const generateButton = document.getElementById("generate-button");
const clearButton = document.getElementById("clear-button");
const loadingIndicator = document.getElementById("loading-indicator");
const loadingText = document.getElementById("loading-text");
const errorMessage = document.getElementById("error-message");
const reportEmpty = document.getElementById("report-empty");
const findingsSection = document.getElementById("findings-section");
const impressionSection = document.getElementById("impression-section");
const findingsOutput = document.getElementById("findings-output");
const impressionOutput = document.getElementById("impression-output");
const reportActions = document.getElementById("report-actions");
const copyButton = document.getElementById("copy-button");
const downloadTxtButton = document.getElementById("download-txt-button");
const downloadPdfButton = document.getElementById("download-pdf-button");
const downloadMenu = document.querySelector(".download-menu");
const generateAgainButton = document.getElementById("generate-again-button");
const copyToast = document.getElementById("copy-toast");
let previewUrl = null;
let currentReport = null;
let toastTimer = null;

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  clearError();
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  imagePreview.hidden = true;
  previewFrame.classList.remove("has-image");
  if (!file) { generateButton.disabled = true; return; }
  if (!file.type.match(/^image\/(jpeg|png)$/)) {
    showError("Please choose a JPG, JPEG, or PNG image.");
    imageInput.value = "";
    generateButton.disabled = true;
    return;
  }
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreview.hidden = false;
  previewFrame.classList.add("has-image");
  generateButton.disabled = false;
});

generateButton.addEventListener("click", () => generateReport(false));
generateAgainButton.addEventListener("click", () => generateReport(true));
copyButton.addEventListener("click", copyReport);
downloadTxtButton.addEventListener("click", downloadTextReport);
downloadPdfButton.addEventListener("click", downloadPdfReport);
clearButton.addEventListener("click", resetForm);

async function generateReport(isRegeneration) {
  const file = imageInput.files[0];
  if (!file) { showError("Please select an X-ray image first."); return; }
  const formData = new FormData();
  formData.append("image", file);
  setLoading(true, isRegeneration ? "Generating report..." : "Analyzing X-ray...");
  clearError();
  try {
    const response = await fetch("/generate-report", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Unable to generate a report.");
    if (!displayReport(result.report)) throw new Error("The AI returned an unexpected report format. Please try again.");
  } catch (error) {
    showError(error instanceof SyntaxError ? "The server returned an unexpected response. Please try again." : (error.message || "A network error occurred. Please try again."));
  } finally { setLoading(false); }
}

function displayReport(report) {
  if (!report || !Array.isArray(report.findings) || !Array.isArray(report.impression)) {
    return false;
  }
  currentReport = {
    findings: report.findings.map(String),
    impression: report.impression.map(String),
  };
  renderBulletList(findingsOutput, report.findings);
  renderBulletList(impressionOutput, report.impression);
  findingsSection.hidden = false;
  impressionSection.hidden = false;
  reportEmpty.hidden = true;
  reportActions.hidden = false;
  return true;
}
function renderBulletList(list, items) {
  list.replaceChildren();
  if (!items.length) items = ["No supported observations were returned."];
  items.forEach((item) => {
    const listItem = document.createElement("li");
    listItem.textContent = String(item);
    list.appendChild(listItem);
  });
}
function setLoading(isLoading, message = "Analyzing X-ray...") {
  loadingIndicator.hidden = !isLoading;
  loadingText.textContent = message;
  generateButton.disabled = isLoading || !imageInput.files.length;
  generateButton.classList.toggle("is-loading", isLoading);
  imageInput.disabled = isLoading;
  clearButton.disabled = isLoading;
  reportActions.querySelectorAll("button").forEach((button) => { button.disabled = isLoading; });
  downloadMenu.setAttribute("aria-disabled", String(isLoading));
  if (isLoading) downloadMenu.open = false;
}
function showError(message) { errorMessage.textContent = message; errorMessage.hidden = false; }
function clearError() { errorMessage.textContent = ""; errorMessage.hidden = true; }

function reportAsText() {
  const formatItems = (items) => items.length ? items.map((item) => `- ${item}`).join("\n") : "- No content provided.";
  return [
    "AI-Based Chest X-Ray Report",
    "",
    "Findings",
    formatItems(currentReport.findings),
    "",
    "Impression",
    formatItems(currentReport.impression),
    "",
    "Educational/research prototype only. AI-generated reports are not medically validated and must not be used for clinical decision-making.",
  ].join("\n");
}

async function copyReport() {
  try {
    if (!navigator.clipboard || !navigator.clipboard.writeText) throw new Error("Clipboard access is unavailable.");
    await navigator.clipboard.writeText(reportAsText());
    showCopyToast("Copied!");
  } catch (_) {
    showCopyToast("Copy failed. You can still download the report.");
  }
}

function downloadTextReport() {
  downloadMenu.open = false;
  saveBlob(new Blob([reportAsText()], { type: "text/plain;charset=utf-8" }), "xray-report.txt");
}

async function downloadPdfReport() {
  downloadPdfButton.disabled = true;
  downloadMenu.open = false;
  try {
    const response = await fetch("/download-report/pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ report: currentReport }),
    });
    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      throw new Error(result.error || "PDF download failed. Please try again.");
    }
    saveBlob(await response.blob(), "xray-report.pdf");
  } catch (error) {
    showError(error.message || "PDF download failed. Please try again.");
  } finally {
    downloadPdfButton.disabled = false;
  }
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function showCopyToast(message) {
  window.clearTimeout(toastTimer);
  copyToast.textContent = message;
  copyToast.hidden = false;
  toastTimer = window.setTimeout(() => { copyToast.hidden = true; }, 2200);
}

function resetForm() {
  imageInput.value = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  imagePreview.removeAttribute("src");
  imagePreview.hidden = true;
  previewFrame.classList.remove("has-image");
  generateButton.disabled = true;
  loadingIndicator.hidden = true;
  loadingText.textContent = "Analyzing X-ray...";
  clearError();
  currentReport = null;
  reportActions.hidden = true;
  downloadMenu.open = false;
  copyToast.hidden = true;
  window.clearTimeout(toastTimer);
  findingsOutput.replaceChildren();
  impressionOutput.replaceChildren();
  findingsSection.hidden = true;
  impressionSection.hidden = true;
  reportEmpty.textContent = "Upload a chest X-ray and click Generate Report.";
  reportEmpty.hidden = false;
}
