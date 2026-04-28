"""
Lightweight crisis scoring system — NO spaCy (Vercel safe)
"""

# ─── Urgency Keywords with Weights ────────────────────────────────────────────
URGENCY_KEYWORDS = {
    "critical": {
        "score": 4,
        "words": [
            "emergency", "critical", "immediate", "dying", "fire",
            "flood", "urgent", "sos", "trapped", "unconscious",
            "bleeding", "collapse"
        ]
    },
    "high": {
        "score": 3,
        "words": [
            "medical", "injured", "sick", "hospital", "ambulance",
            "rescue", "stranded", "danger", "attack"
        ]
    },
    "medium": {
        "score": 2,
        "words": [
            "food", "water", "shelter", "hungry", "cold",
            "missing", "supply", "shortage"
        ]
    },
    "low": {
        "score": 1,
        "words": ["help", "need", "assist", "support", "request"]
    }
}

# ─── Category Keywords ────────────────────────────────────────────────────────
CATEGORY_KEYWORDS = {
    "Medical": ["medical", "hospital", "injured", "ambulance", "sick",
                "insulin", "bleeding", "dying", "unconscious"],
    "Food": ["food", "hungry", "meal", "water", "supply", "ration"],
    "Evacuation": ["evacuate", "trapped", "rescue", "stranded", "flood", "fire"],
    "Logistics": ["route", "transport", "deliver", "move", "truck", "debris"],
    "Shelter": ["shelter", "cot", "blanket", "housing", "camp"]
}

TIME_WORDS = {"hour", "hours", "day", "days", "night"}


def simple_lemma(word: str) -> str:
    """Very small stemmer to reduce word forms."""
    for suffix in ("ing", "ed", "es", "s", "ly"):
        if word.endswith(suffix) and len(word) > len(suffix) + 2:
            return word[:-len(suffix)]
    return word


def score_incident(description: str) -> dict:
    """
    Analyze crisis text and return urgency score + category.
    Vercel-safe (no ML models).
    """

    if not description or not description.strip():
        return {"urgency_score": 1, "category": "General"}

    lower_desc = description.lower().strip()
    words = lower_desc.split()

    # Apply simple stemming
    lemmas = [simple_lemma(w.strip(".,!?;:")) for w in words]
    tokens = set(words + lemmas)

    total_score = 0
    category_hits = {cat: 0 for cat in CATEGORY_KEYWORDS}

    for token in tokens:
        # Urgency scoring
        for level in URGENCY_KEYWORDS.values():
            if token in level["words"]:
                total_score += level["score"]

        # Category scoring
        for category, keywords in CATEGORY_KEYWORDS.items():
            if token in keywords:
                category_hits[category] += 1

        # Bonus: time sensitivity
        if token in TIME_WORDS:
            total_score += 1

        # Bonus: numeric urgency
        try:
            if float(token) > 10:
                total_score += 1
        except ValueError:
            pass

    final_score = max(1, min(10, total_score))

    best_category = max(category_hits, key=category_hits.get)
    category = best_category if category_hits[best_category] > 0 else "General"

    return {
        "urgency_score": final_score,
        "category": category
    }