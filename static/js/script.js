const imageInput = document.getElementById("xray-image");
const imagePreview = document.getElementById("image-preview");
const previewFrame = document.getElementById("preview-frame");
const generateButton = document.getElementById("generate-button");
const clearButton = document.getElementById("clear-button");
const loadingIndicator = document.getElementById("loading-indicator");
const errorMessage = document.getElementById("error-message");
const reportEmpty = document.getElementById("report-empty");
const findingsSection = document.getElementById("findings-section");
const impressionSection = document.getElementById("impression-section");
const findingsOutput = document.getElementById("findings-output");
const impressionOutput = document.getElementById("impression-output");
let previewUrl = null;

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

generateButton.addEventListener("click", async () => {
  const file = imageInput.files[0];
  if (!file) { showError("Please select an X-ray image first."); return; }
  const formData = new FormData();
  formData.append("image", file);
  setLoading(true);
  clearError();
  try {
    const response = await fetch("/generate-report", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "Unable to generate a report.");
    displayReport(result.report);
  } catch (error) {
    showError(error.message || "A network error occurred. Please try again.");
  } finally { setLoading(false); }
});

clearButton.addEventListener("click", resetForm);

function displayReport(report) {
  if (!report || !Array.isArray(report.findings) || !Array.isArray(report.impression)) {
    showError("The AI returned an unexpected report format. Please try again.");
    return;
  }
  renderBulletList(findingsOutput, report.findings);
  renderBulletList(impressionOutput, report.impression);
  findingsSection.hidden = false;
  impressionSection.hidden = false;
  reportEmpty.hidden = true;
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
function setLoading(isLoading) {
  loadingIndicator.hidden = !isLoading;
  generateButton.disabled = isLoading || !imageInput.files.length;
  generateButton.classList.toggle("is-loading", isLoading);
}
function showError(message) { errorMessage.textContent = message; errorMessage.hidden = false; }
function clearError() { errorMessage.textContent = ""; errorMessage.hidden = true; }
function resetForm() {
  imageInput.value = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = null;
  imagePreview.removeAttribute("src");
  imagePreview.hidden = true;
  previewFrame.classList.remove("has-image");
  generateButton.disabled = true;
  loadingIndicator.hidden = true;
  clearError();
  findingsOutput.replaceChildren();
  impressionOutput.replaceChildren();
  findingsSection.hidden = true;
  impressionSection.hidden = true;
  reportEmpty.textContent = "Upload a chest X-ray and click Generate Report.";
  reportEmpty.hidden = false;
}
