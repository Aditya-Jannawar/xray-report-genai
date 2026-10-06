# AI-Based Chest X-Ray Report Generation Using Vision-Language Models

An educational BTech final-year research prototype. It accepts a chest X-ray and requests an AI drafted findings and impression using a vision-language model through the Groq API. The app uses Flask with a plain HTML, CSS, and JavaScript interface.

## Technology stack

Python 3.11+, Flask, Groq Python SDK, Qwen3.8-27B, HTML, CSS, vanilla JavaScript, Pillow, python-dotenv, and ReportLab (reserved for possible future PDF generation).

## Project structure

```text
xray-report-generator/
├── app.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
├── templates/index.html
├── static/css/style.css
├── static/js/script.js
└── uploads/.gitkeep
```

## Setup

Create a virtual environment:

```bash
python -m venv venv
```

Windows activation:

```powershell
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` in the project folder and replace its placeholder with your Groq API key. Keep `.env` private; the key is read by Flask and never sent to the frontend.

Run the application:

```bash
python app.py
```

Open http://127.0.0.1:5000 in your browser.

## Current limitations

This is an early prototype and has not been clinically or scientifically validated. Report quality and availability depend on model access and the Groq API. Images are sent to the configured API for processing and are not saved by this app. PDF generation, evaluation datasets, persistent storage, and user accounts are not implemented. Model output may be incomplete or incorrect.

## Medical disclaimer

"This application is an educational and research-oriented prototype. AI-generated reports are not medically validated and must not be used for clinical diagnosis, treatment, or medical decision-making."
