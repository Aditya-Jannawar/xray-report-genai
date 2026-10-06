"""Minimal Flask app for an educational chest X-ray report prototype."""
import base64
import io
import json
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from groq import Groq
from PIL import Image, UnidentifiedImageError

load_dotenv()
app = Flask(__name__)
MODEL = "qwen/qwen3.8-27b"
api_key = os.getenv("GROQ_API_KEY")
client = Groq(api_key=api_key) if api_key else None


@app.get("/")
def index():
    return render_template("index.html")


@app.post("/generate-report")
def generate_report():
    image_file = request.files.get("image")
    if image_file is None or not image_file.filename:
        return jsonify(success=False, error="Please select an X-ray image to upload."), 400
    extension = image_file.filename.rsplit(".", 1)[-1].lower() if "." in image_file.filename else ""
    if extension not in {"jpg", "jpeg", "png"}:
        return jsonify(success=False, error="Unsupported file type. Please upload a JPG, JPEG, or PNG image."), 400

    try:
        image_bytes = image_file.read()
        with Image.open(io.BytesIO(image_bytes)) as image:
            if image.format not in {"JPEG", "PNG"}:
                return jsonify(success=False, error="The uploaded file is not a valid JPG or PNG image."), 400
            image.verify()
    except (UnidentifiedImageError, OSError, ValueError):
        return jsonify(success=False, error="The uploaded file could not be read as a valid image."), 400

    if client is None:
        return jsonify(success=False, error="GROQ_API_KEY is not configured. Add it to your local .env file."), 503

    # Send the image directly to the API; the application does not save it locally.
    mime_type = "image/png" if extension == "png" else "image/jpeg"
    image_url = f"data:{mime_type};base64,{base64.b64encode(image_bytes).decode('utf-8')}"
    try:
        prompt = prompt = """You are a vision-language model being used in an educational and research-oriented prototype for chest X-ray report generation.

Analyze ONLY the visual information present in the provided X-ray image.

Generate a concise, structured radiology-style report.

Return ONLY valid JSON using exactly this structure:

{
  "findings": ["..."],
  "impression": ["..."]
}

Do not return Markdown, headings, bullet symbols, commentary, explanations, or disclaimers outside the JSON.

FINDINGS:
- List only observations that are reasonably supported by the image.
- Describe visible anatomical findings, including their location, appearance, and distribution when relevant.
- Mention important normal findings only when they help contextualize an abnormality or are clinically relevant.
- Do not invent patient information or infer age, sex, symptoms, clinical history, laboratory results, previous examinations, or treatment history.
- Do not use the uploaded filename, metadata, surrounding application text, or external information to determine findings.
- If image quality or coverage is insufficient for reliable assessment, explicitly state the limitation in the findings.

IMPRESSION:
- Provide a concise summary of the most important visual findings.
- Distinguish observed findings from clinical interpretation.
- Do not make a definitive disease diagnosis solely from the image.
- When appropriate, use cautious terminology such as "compatible with", "suggestive of", "suspicious for", or "may represent".
- Do not provide treatment recommendations or medical advice.
- Do not claim certainty when the image does not support it.

STRICT EVIDENCE RULES:

1. Only describe findings that can be supported by the current image.

2. Do not make comparative or temporal claims such as:
   - new
   - worsening
   - improved
   - resolved
   - increased
   - decreased
   - stable
   unless a prior image or explicit comparison information is provided.

3. Do not invent patient age, sex, symptoms, clinical history, laboratory results, previous examinations, or treatment history.

4. When an abnormal opacity is present, describe the visible abnormality first, including its location, approximate appearance, and distribution, before suggesting a possible interpretation.

5. Do not convert an uncertain visual observation into a definitive diagnosis.

6. Do not use unusual, speculative, or non-standard medical terminology. If uncertain, describe the visual finding instead of inventing a diagnosis.

7. Do not produce contradictory findings. For example, if focal consolidation is identified, do not also state that the lungs are completely clear of consolidation.

8. Do not repeat the same finding in multiple ways.

9. Keep the report concise and clinically structured.

10. The impression should contain only the most important findings.

11. Do not infer findings from the filename, metadata, image source, or any information other than the visual content of the provided image.

12. If a finding cannot be assessed reliably from the provided image, explicitly acknowledge the limitation rather than guessing.

13. Do not infer secondary findings such as volume loss, mediastinal shift, mass effect, or associated atelectasis unless the visual
    evidence for that finding is clearly present in the image.

14. Prefer directly observable findings over speculative secondary interpretations. When a finding is uncertain, omit it or state
    the uncertainty rather than presenting it as an established finding.

The output is for an educational and research prototype and is not a clinical diagnosis. Do not include this disclaimer inside the JSON response."""


        response = client.chat.completions.create(
            model=MODEL,
            messages=[{"role": "user", "content": [
                {"type": "text", "text": prompt},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]}],
            response_format={"type": "json_object"},
            reasoning_format="hidden",
        )
        response_text = response.choices[0].message.content
        if not response_text:
            raise ValueError("The model returned an empty response.")
        report = json.loads(response_text)
        if not isinstance(report, dict) or set(report) != {"findings", "impression"}:
            raise ValueError("The model response did not contain the expected report fields.")
        for section in ("findings", "impression"):
            if not isinstance(report[section], list) or not all(
                isinstance(item, str) and item.strip() for item in report[section]
            ):
                raise ValueError(f"The model returned an invalid {section} section.")
            report[section] = [item.strip() for item in report[section]]
        return jsonify(success=True, report=report)
    except (json.JSONDecodeError, ValueError):
        app.logger.exception("Groq returned an invalid report structure")
        return jsonify(success=False, error="The AI returned an unexpected report format. Please try again."), 502
    except Exception:
        app.logger.exception("Groq report generation failed")
        return jsonify(success=False, error="Report generation failed. Check the API configuration and try again."), 502


if __name__ == "__main__":
    app.run(debug=True)
