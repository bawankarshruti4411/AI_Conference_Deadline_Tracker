let agentConferences = [];
let hasSearched = false;

const form = document.getElementById("searchForm");
const interestsInput = document.getElementById("interests");
const locationSelect = document.getElementById("location");
const deadlineSelect = document.getElementById("deadline");
const searchBtn = document.getElementById("searchBtn");
const results = document.getElementById("conferenceResults");
const resultText = document.getElementById("resultText");
const agentSummary = document.getElementById("agentSummary");
const summaryText = document.getElementById("summaryText");
const sortSelect = document.getElementById("sortSelect");
const clearFilters = document.getElementById("clearFilters");
const sidebarLocation = document.getElementById("sidebarLocation");

const themeBtn = document.getElementById("themeBtn");
const navHome = document.getElementById("navHome");
const homeLink = document.getElementById("homeLink");
const navMyList = document.getElementById("navMyList");
const myListOverlay = document.getElementById("myListOverlay");
const closeMyList = document.getElementById("closeMyList");
const myListBody = document.getElementById("myListBody");
const listCount = document.getElementById("listCount");

const TRACKED_KEY = "trackedConferences";
const THEME_KEY = "confero-theme";

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* ---------------- Search ---------------- */

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await runAgentSearch();
});

async function runAgentSearch() {
    const interests = interestsInput.value.trim();
    const location = locationSelect.value;
    const deadline = Number(deadlineSelect.value);

    if (!interests) {
        showError("Please enter your research interests.");
        interestsInput.focus();
        return;
    }

    setLoadingState();

    try {
        const url =
            `/api/agent?interests=${encodeURIComponent(interests)}` +
            `&location=${encodeURIComponent(location)}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(
                data.error || "The AI agent could not complete the search."
            );
        }

        const agentResult = normalizeAgentResult(data.result);

        let conferences = filterByDeadline(
            agentResult.conferences || [],
            deadline
        );

        agentConferences = conferences;
        hasSearched = true;

        summaryText.textContent =
            agentResult.summary ||
            `Found ${conferences.length} conferences matching your interests.`;

        agentSummary.classList.remove("hidden");
        resultText.textContent =
            `${conferences.length} relevant conference${conferences.length === 1 ? "" : "s"} found`;

        renderConferences(conferences);

    } catch (error) {
        console.error("Agent Error:", error);
        showError(error.message);
    } finally {
        stopLoadingState();
    }
}

function normalizeAgentResult(result) {
    if (!result || typeof result !== "object") {
        return { summary: "", conferences: [] };
    }

    return {
        summary: result.summary || "",
        conferences: Array.isArray(result.conferences)
            ? result.conferences
            : []
    };
}

function filterByDeadline(conferences, maxDays) {
    return conferences.filter((conference) => {
        const days = Number(conference.days_left);
        if (Number.isNaN(days)) return true;
        return days <= maxDays;
    });
}

/* ---------------- Rendering ---------------- */

function renderConferences(conferences) {
    if (!conferences || conferences.length === 0) {
        results.innerHTML = `
            <div class="empty-card">
                <svg class="icon state-icon"><use href="#icon-inbox"/></svg>
                <h3>No matching conferences found</h3>
                <p>
                    Try expanding your deadline range or changing your
                    research interests.
                </p>
            </div>
        `;
        return;
    }

    results.innerHTML = conferences
        .map((conference, index) =>
            createConferenceCard(conference, index)
        )
        .join("");
}

results.addEventListener("click", (event) => {
    const button = event.target.closest("[data-track-index]");
    if (!button) return;
    trackConference(Number(button.dataset.trackIndex));
});

function isTracked(name) {
    return getTracked().some(item => item.name === name);
}

function createConferenceCard(conference, index) {
    const relevance = Number(conference.relevance) || 0;

    const relevanceClass =
        relevance >= 80 ? "" :
        relevance >= 60 ? "medium" :
        "low";

    const deadlineStatus = getDeadlineStatus(conference);

    const topics = Array.isArray(conference.topics)
        ? conference.topics
        : [];

    const topicHTML = topics
        .slice(0, 4)
        .map(topic =>
            `<span class="topic-tag">${escapeHtml(topic)}</span>`
        )
        .join("");

    const website = safeUrl(conference.website);
    const tracked = isTracked(conference.name);

    return `
        <article class="conference-card ${relevanceClass}">
            <div class="card-top">
                <div class="conference-title-area">
                    <div class="card-number">${index + 1}</div>
                    <div>
                        <div class="conference-title">
                            ${escapeHtml(conference.name || "Conference")}
                        </div>
                        ${
                            conference.short_name
                                ? `<div class="conference-short">
                                    ${escapeHtml(conference.short_name)}
                                   </div>`
                                : ""
                        }
                    </div>
                </div>

                <span class="match-badge ${relevanceClass}">
                    ${relevance}% match
                </span>
            </div>

            ${topicHTML ? `<div class="topic-tags">${topicHTML}</div>` : ""}

            <div class="card-detail">
                <svg class="icon"><use href="#icon-building"/></svg>
                <div>
                    Organized by
                    <strong>${escapeHtml(conference.organizer || "Not available")}</strong>
                </div>
            </div>

            <div class="card-detail">
                <svg class="icon"><use href="#icon-pin"/></svg>
                <div>
                    Location
                    <strong>${escapeHtml(conference.location || "Not available")}</strong>
                </div>
            </div>

            <div class="card-detail">
                <svg class="icon"><use href="#icon-calendar"/></svg>
                <div>
                    Conference dates
                    <strong>${escapeHtml(conference.conference_dates || "Not available")}</strong>
                </div>
            </div>

            <div class="deadline-box">
                <div>
                    <span class="deadline-label">Submission deadline</span>
                    <strong class="deadline-date">
                        ${escapeHtml(conference.deadline || "Not verified")}
                    </strong>
                </div>
                <span class="deadline-status ${deadlineStatus.className}">
                    ${deadlineStatus.label}
                </span>
            </div>

            <p class="why-match">
                ${escapeHtml(
                    conference.why_match ||
                    "This conference matches your research interests."
                )}
            </p>

            <div class="card-actions">
                ${
                    website
                        ? `<a class="card-action website-btn"
                              href="${website}"
                              target="_blank"
                              rel="noopener noreferrer">
                              <svg class="icon"><use href="#icon-external"/></svg>
                              Visit website
                           </a>`
                        : `<button class="card-action website-btn" disabled type="button">
                              Website unavailable
                           </button>`
                }

                <button class="card-action track-btn ${tracked ? "tracked" : ""}"
                        type="button"
                        data-track-index="${index}">
                    <svg class="icon"><use href="#icon-bookmark"/></svg>
                    ${tracked ? "Saved" : "Save"}
                </button>
            </div>
        </article>
    `;
}

function getDeadlineStatus(conference) {
    const days = Number(conference.days_left);

    if (Number.isNaN(days)) {
        return {
            label: conference.deadline_status || "Verify",
            className: ""
        };
    }

    if (days < 0) {
        return { label: "Passed", className: "passed" };
    }

    if (days <= 30) {
        return { label: `${days} days left`, className: "soon" };
    }

    return { label: `${days} days left`, className: "" };
}

function safeUrl(url) {
    if (!url) return "";

    const candidates = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(url)
        ? [url]
        : [`https://${url}`, url];

    for (const candidate of candidates) {
        try {
            const parsed = new URL(candidate);

            if (
                parsed.protocol !== "http:" &&
                parsed.protocol !== "https:"
            ) {
                continue;
            }

            return escapeHtml(parsed.href);
        } catch {
            continue;
        }
    }

    return "";
}

/* ---------------- My List (save/track) ---------------- */

function getTracked() {
    try {
        return JSON.parse(localStorage.getItem(TRACKED_KEY) || "[]");
    } catch {
        return [];
    }
}

function setTracked(list) {
    localStorage.setItem(TRACKED_KEY, JSON.stringify(list));
    updateListCount();
}

function updateListCount() {
    const count = getTracked().length;
    listCount.textContent = String(count);
    listCount.classList.toggle("hidden", count === 0);
}

function trackConference(index) {
    const conference = agentConferences[index];
    if (!conference) return;

    const tracked = getTracked();
    const already = tracked.findIndex(item => item.name === conference.name);

    if (already === -1) {
        tracked.push({
            name: conference.name,
            organizer: conference.organizer,
            location: conference.location,
            deadline: conference.deadline,
            website: conference.website,
            trackedAt: new Date().toISOString()
        });
        setTracked(tracked);
    } else {
        tracked.splice(already, 1);
        setTracked(tracked);
    }

    renderConferences(agentConferences);
}

function untrackByName(name) {
    const tracked = getTracked().filter(item => item.name !== name);
    setTracked(tracked);
    renderMyList();
    renderConferences(agentConferences);
}

function renderMyList() {
    const tracked = getTracked();

    if (tracked.length === 0) {
        myListBody.innerHTML = `
            <div class="list-empty">
                <svg class="icon"><use href="#icon-bookmark"/></svg>
                <h3>Your list is empty</h3>
                <p>Save conferences from your search results to keep track of their deadlines here.</p>
            </div>
        `;
        return;
    }

    myListBody.innerHTML = tracked
        .slice()
        .reverse()
        .map(item => {
            const website = safeUrl(item.website);
            return `
                <div class="list-item">
                    <div class="list-item-info">
                        <strong>${escapeHtml(item.name || "Conference")}</strong>
                        <span>${escapeHtml(item.deadline || "Deadline not verified")}${item.location ? " · " + escapeHtml(item.location) : ""}</span>
                    </div>
                    <div class="list-item-actions">
                        ${
                            website
                                ? `<a href="${website}" target="_blank" rel="noopener noreferrer" title="Visit website">
                                      <svg class="icon"><use href="#icon-external"/></svg>
                                   </a>`
                                : ""
                        }
                        <button type="button" title="Remove" data-untrack-name="${escapeHtml(item.name || "")}">
                            <svg class="icon"><use href="#icon-trash"/></svg>
                        </button>
                    </div>
                </div>
            `;
        })
        .join("");
}

myListBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-untrack-name]");
    if (!button) return;
    untrackByName(button.dataset.untrackName);
});

function openMyList() {
    renderMyList();
    myListOverlay.classList.add("open");
}

function closeMyListModal() {
    myListOverlay.classList.remove("open");
}

navMyList.addEventListener("click", openMyList);
closeMyList.addEventListener("click", closeMyListModal);
myListOverlay.addEventListener("click", (event) => {
    if (event.target === myListOverlay) closeMyListModal();
});
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && myListOverlay.classList.contains("open")) {
        closeMyListModal();
    }
});

/* ---------------- Sorting ---------------- */

sortSelect.addEventListener("change", () => {
    if (!hasSearched) return;

    const sorted = [...agentConferences];

    if (sortSelect.value === "relevance") {
        sorted.sort(
            (a, b) =>
                Number(b.relevance || 0) -
                Number(a.relevance || 0)
        );
    } else if (sortSelect.value === "deadline") {
        sorted.sort(
            (a, b) =>
                Number(a.days_left ?? 9999) -
                Number(b.days_left ?? 9999)
        );
    } else if (sortSelect.value === "name") {
        sorted.sort(
            (a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || "")
                )
        );
    }

    agentConferences = sorted;
    renderConferences(sorted);
});

/* ---------------- Filters ---------------- */

clearFilters.addEventListener("click", () => {
    document.querySelectorAll(".topic-filter").forEach(
        checkbox => checkbox.checked = false
    );

    sidebarLocation.value = "Any";
    locationSelect.value = "Any";
    interestsInput.value = "";

    agentConferences = [];
    hasSearched = false;
    agentSummary.classList.add("hidden");
    resultText.textContent =
        "Enter your interests to discover relevant conferences.";

    results.innerHTML = `
        <div class="welcome-card">
            <svg class="icon state-icon"><use href="#icon-search"/></svg>
            <h3>Your personalized recommendations will appear here</h3>
            <p>
                Tell the agent what you're researching, and it will
                search the web and analyze relevant conferences for you.
            </p>
        </div>
    `;
});

// Keep the hero-form location and sidebar location selects in sync
sidebarLocation.addEventListener("change", () => {
    locationSelect.value = sidebarLocation.value;
});
locationSelect.addEventListener("change", () => {
    sidebarLocation.value = locationSelect.value;
});

document.querySelectorAll(".quick-tags button").forEach(button => {
    button.addEventListener("click", () => {
        interestsInput.value = button.dataset.interest;
        runAgentSearch();
    });
});

document.querySelectorAll(".topic-filter").forEach(checkbox => {
    checkbox.addEventListener("change", () => {
        const selected = Array.from(
            document.querySelectorAll(".topic-filter:checked")
        ).map(item => item.value);

        if (selected.length) {
            interestsInput.value = selected.join(", ");
        }
    });
});

/* ---------------- Loading / error states ---------------- */

function setLoadingState() {
    searchBtn.classList.add("loading");
    searchBtn.innerHTML = `
        <span class="loader-small"></span>
        <span>Searching…</span>
    `;

    resultText.textContent =
        "The agent is searching the web and analyzing conferences.";

    agentSummary.classList.add("hidden");

    results.innerHTML = `
        <div class="loading-card">
            <div class="loader"></div>
            <h3>The agent is working…</h3>
            <p>
                Tavily is finding conferences and Groq is analyzing
                their relevance.
            </p>
        </div>
    `;
}

function stopLoadingState() {
    searchBtn.classList.remove("loading");

    searchBtn.innerHTML = `
        <svg class="icon"><use href="#icon-search"/></svg>
        <span>Find conferences</span>
    `;
}

function showError(message) {
    resultText.textContent =
        "The agent could not complete the search.";

    agentSummary.classList.add("hidden");

    results.innerHTML = `
        <div class="error-card">
            <svg class="icon state-icon"><use href="#icon-alert"/></svg>
            <h3>Something went wrong</h3>
            <p>${escapeHtml(message)}</p>
        </div>
    `;
}

/* ---------------- Theme ---------------- */

function applyTheme(theme) {
    document.body.classList.toggle("dark-mode", theme === "dark");
}

function initTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    const prefersDark = window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = stored || (prefersDark ? "dark" : "light");
    applyTheme(theme);
}

themeBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
});

/* ---------------- Nav ---------------- */

function scrollHome(event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
}
navHome.addEventListener("click", scrollHome);
homeLink.addEventListener("click", scrollHome);

/* ---------------- Init ---------------- */

initTheme();
updateListCount();
