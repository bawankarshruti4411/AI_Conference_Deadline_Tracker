import os
import json
import re
from datetime import date

from dotenv import load_dotenv
from groq import Groq
from tavily import TavilyClient

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
TAVILY_API_KEY = os.getenv("TAVILY_API_KEY")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY is missing from .env")

if not TAVILY_API_KEY:
    raise ValueError("TAVILY_API_KEY is missing from .env")

groq_client = Groq(api_key=GROQ_API_KEY)
tavily_client = TavilyClient(api_key=TAVILY_API_KEY)


def search_conferences(research_interest, location="Any"):
    location_text = ""
    if location != "Any":
        location_text = f" Prefer conferences in {location}."

    query = f"""
    Find upcoming academic and research conferences related to:
    {research_interest}

    {location_text}

    Focus on computer science, artificial intelligence,
    machine learning, data science, cybersecurity and related
    academic conferences.

    Prefer official conference websites and official organizer pages.

    Find:
    - conference name
    - organizer
    - location
    - conference dates
    - paper submission deadline
    - official website

    Exclude events that have already ended.
    Current date: {date.today().isoformat()}
    """

    response = tavily_client.search(
        query=query,
        search_depth="advanced",
        max_results=8
    )

    return response.get("results", [])


def extract_json(text):
    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    text = re.sub(r"```json\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"```\s*$", "", text).strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:
        try:
            return json.loads(text[start:end + 1])
        except json.JSONDecodeError:
            pass

    return {
        "summary": "The AI agent returned an unreadable response.",
        "conferences": []
    }


def analyze_conferences(research_interest, search_results, location="Any"):
    conference_text = ""

    for index, result in enumerate(search_results, start=1):
        conference_text += f"""
SOURCE {index}

Title:
{result.get("title", "")}

URL:
{result.get("url", "")}

Content:
{result.get("content", "")}

-----------------------------------
"""

    prompt = f"""
You are an academic conference recommendation agent.

Current date:
{date.today().isoformat()}

User's research interests:
{research_interest}

Preferred location:
{location}

Analyze the web search results and identify the most relevant
UPCOMING academic conferences.

IMPORTANT:
- Do not invent conference information.
- Use only information supported by the supplied sources.
- Prefer official conference websites.
- Do not include conferences that have already ended.
- If a deadline cannot be verified, use "Not verified".
- If a field is unavailable, use "Not available".
- Keep explanations short and useful.
- Return ONLY valid JSON.
- Do not use Markdown.
- Do not add commentary outside the JSON.

Return this exact structure:

{{
  "summary": "One short sentence summarizing the recommendations.",
  "conferences": [
    {{
      "name": "Conference name",
      "short_name": "Short name",
      "organizer": "Organizer",
      "location": "City, Country or Online",
      "conference_dates": "Conference dates",
      "deadline": "Submission deadline",
      "deadline_status": "Upcoming / Soon / Passed / Not verified",
      "days_left": 0,
      "relevance": 0,
      "why_match": "One or two short sentences.",
      "topics": ["Topic 1", "Topic 2", "Topic 3"],
      "website": "Official website URL",
      "source_url": "Source URL"
    }}
  ]
}}

Relevance must be an integer from 0 to 100.
Only return conferences with relevance >= 50.
Return at most 8 conferences.

WEB SEARCH RESULTS:
{conference_text}
"""

    try:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise academic conference research assistant. Always return valid JSON."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1,
            response_format={"type": "json_object"}
        )
    except Exception:
        response = groq_client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=[
                {
                    "role": "system",
                    "content": "You are a precise academic conference research assistant."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.1
        )

    raw_response = response.choices[0].message.content
    return extract_json(raw_response)


def run_agent(research_interest, location="Any"):
    print("\n" + "=" * 60)
    print("CONFERENCE DEADLINE AGENT")
    print("=" * 60)
    print("\nResearch Interest:", research_interest)
    print("Preferred Location:", location)
    print("\nSearching with Tavily...")

    search_results = search_conferences(research_interest, location)

    print(f"Found {len(search_results)} web search results.")
    print("\nAnalyzing results with Groq...")

    analysis = analyze_conferences(
        research_interest,
        search_results,
        location
    )

    print(
        f"Generated {len(analysis.get('conferences', []))} recommendations."
    )

    return analysis


if __name__ == "__main__":
    interest = input("Enter your research interests: ")
    result = run_agent(interest)
    print(json.dumps(result, indent=2, ensure_ascii=False))
