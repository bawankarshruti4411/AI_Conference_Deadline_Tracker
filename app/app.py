from flask import Flask, render_template, jsonify, request
import json

from ai_agent import run_agent

app = Flask(__name__)


def load_conferences():
    with open("data/conferences.json", "r", encoding="utf-8") as file:
        return json.load(file)


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/conferences")
def get_conferences():
    try:
        return jsonify(load_conferences())
    except Exception as error:
        return jsonify({"error": str(error)}), 500


@app.route("/api/agent")
def agent_search():
    interests = request.args.get("interests", "").strip()
    location = request.args.get("location", "Any").strip()

    if not interests:
        return jsonify({
            "success": False,
            "error": "Research interests are required."
        }), 400

    try:
        result = run_agent(interests, location)
        return jsonify({
            "success": True,
            "result": result
        })
    except Exception as error:
        print("\nAgent Error:", error)
        return jsonify({
            "success": False,
            "error": str(error)
        }), 500


if __name__ == "__main__":
    app.run(debug=True)
