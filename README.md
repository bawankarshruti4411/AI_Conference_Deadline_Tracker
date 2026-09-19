# Conference Deadline Agent

An Agentic AI project that searches for academic conferences using Tavily and analyzes/recommends them using Groq.

## Architecture

User → Flask API → Tavily Web Search → Groq Analysis → Structured JSON → JavaScript Conference Cards

## Features

- Research-interest based conference discovery
- Preferred location filter
- Deadline range filter
- Groq-powered relevance analysis
- Tavily web search
- Structured AI response instead of a large Markdown paragraph
- Relevance sorting
- Deadline sorting
- Topic filters
- Quick-search buttons
- Official conference website links
- Track conference using browser localStorage
- Responsive dashboard UI
- Loading and error states

## Setup

Create a virtual environment:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create `.env` from `.env.example` and add your own API keys:

```text
GROQ_API_KEY=your_key
TAVILY_API_KEY=your_key
```

Run:

```powershell
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

## Important

Do not commit `.env` or API keys to GitHub. The supplied project contains `.env.example`, not real API credentials.
