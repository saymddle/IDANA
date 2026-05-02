#!/usr/bin/env python3
"""
IDANA — Flavor Bible PDF Parser  (v1.7)
========================================
Usage:
  python idana_parser.py "The Flavor Bible.pdf" --dry-run
  python idana_parser.py "The Flavor Bible.pdf"
  python idana_parser.py "The Flavor Bible.pdf" --neo4j --uri bolt://localhost:7687 --user neo4j --password yourpassword
"""

import argparse
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

NORMALIZATION = {
    "evoo":                 "extra-virgin olive oil",
    "parmigiano-reggiano":  "parmesan",
    "heavy whipping cream": "heavy cream",
}

SCORE_DEFAULT  = 1.0
SCORE_REPEAT   = 0.2
SCORE_EMPHASIS = 0.3

KNOWN_EARLY_INGREDIENTS = {
    "ABSINTHE", "ACAI", "AÇAÍ", "ACHIOTE", "AGAVE", "AIOLI",
    "ALLSPICE", "ALMOND", "ALMONDS", "ANCHOVY", "ANCHOVIES",
    "ANISE", "APPLE", "APPLES", "APRICOT", "ARTICHOKE", "ARTICHOKES",
    "ARUGULA", "ASPARAGUS", "AVOCADO", "AVOCADOS",
}

NON_FOOD_HEADERS = {
    "AROMA", "ASTRINGENCY", "BITTERNESS", "FLAVOR", "MOUTHFEEL",
    "SALTINESS", "SOURNESS", "SWEETNESS", "TEXTURE", "UMAMI",
    "VOLUME", "WEIGHT", "TASTE", "SEASON", "FUNCTION",
    "TECHNIQUE", "TECHNIQUES", "BALANCE", "RICHNESS",
    "APPETIZERS", "DESSERTS", "BREAKFAST", "BRUNCH", "LUNCH",
    "DINNER", "STARTERS", "MAINS", "SIDES",
    "AUTUMN", "WINTER", "SPRING", "SUMMER", "FALL",
    "NOTE", "NOTES", "TIPS", "TIP", "PREFACE", "INDEX", "CONTENTS",
    "INTRODUCTION", "CHAPTER", "APPENDIX", "ACKNOWLEDGMENTS",
    "MEAT", "BREAD", "FRUIT", "VEGETABLES", "HERBS", "SPICES",
    "NUTS", "GRAINS", "FISH", "DC", "NYC", "LA",
}

METADATA_LABELS = {
    "season", "taste", "weight", "volume", "function", "technique",
    "techniques", "aroma", "mouthfeel", "texture", "flavor affinities",
    "botanical relatives", "tips", "tip", "note", "notes",
    "weather", "dishes", "avoid", "flavor", "balance",
}

DESCRIPTOR_VALUES = {
    "light", "medium", "heavy", "loud", "quiet", "moderate",
    "mild", "bold", "subtle", "intense", "delicate",
    "sweet", "sour", "bitter", "salty", "savory", "umami",
    "astringent", "cooling", "warming", "pungent", "rich",
    "autumn", "winter", "spring", "summer", "fall",
    "bake", "broil", "roast", "sauté", "steam", "stew",
    "grill", "raw", "blanch", "simmer", "fry", "poach",
}

STANDALONE_QUALIFIERS = {
    "juice", "zest", "peel", "rind", "extract", "powder", "paste",
    "puree", "purée", "syrup", "stock", "broth", "sauce", "oil",
    "vinegar", "butter", "cream", "milk", "flour", "sugar",
    "unsalted", "salted", "dried", "fresh", "frozen", "canned",
    "whole", "ground", "crushed", "minced", "chopped", "sliced",
    "toasted", "smoked", "pickled", "roasted", "grilled", "fried",
    "grated", "shredded", "diced", "halved", "peeled",
    "green", "red", "white", "black", "dark", "light",
    "dry", "wet", "hot", "cold", "warm",
    "breakfast", "dinner", "lunch", "cultivated",
    # Sub-type words that are never standalone pairings
    "wild", "domestic", "goat", "brown", "nut", "pie",
    "wine", "beer", "spirits", "liqueur", "liqueurs",
    "raw", "cooked", "baked", "candied", "cured",
}

STAR_CHARS = {"★", "\u2605", "\u2606", "*"}

SENTENCE_STARTERS = (
    "add ", "use ", "seek ", "avoid ", "serve ", "pair ",
    "note:", "tip:", "combine ", "mix ", "try ", "generally ",
    "when ", "if ", "to make", "for best",
    "this ", "these ", "those ", "it ", "its ", "they ", "their ",
    "i ", "i'", "the ", "a ", "an ",
    "sugar ", "salt ", "pepper ",
    "that ", "so ", "but ", "because ",
)

WHOLE_LINE_COMPOUNDS = {
    "ras el hanout": "ras el hanout",
    "ras el": "ras el hanout",
    "el hanout": "ras el hanout",
    "fleur de sel": "fleur de sel",
    "herbes de provence": "herbes de provence",
    "bouquet garni": "bouquet garni",
}

REJECT_TOKENS = {
    "ras", "el", "hanout",
    "affinities", "affinty",
    "botanical", "relatives",
    "farallon", "doumani", "terra",
    "citronelle", "minibar",
    # Truncated sub-type fragments
    "dry white",
}

# Second words that indicate a token is a prose fragment, not an ingredient
PROSE_SECOND_WORDS = {
    "you", "make", "combination", "have", "use", "add",
    "is", "are", "was", "were", "will", "would", "can",
    "could", "should", "get", "do", "did",
}


def normalize(name: str) -> str:
    key = name.strip().lower()
    return NORMALIZATION.get(key, name.strip())


def clean_header(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"^[\*\•\·\-\(]+\s*", "", s)
    s = re.sub(r"\s*[\)]+\s*$", "", s)
    s = re.sub(r"\s*[:\.,]+$", "", s)
    return s.strip()


def contains_star(text: str) -> bool:
    return any(c in text for c in STAR_CHARS)


def is_valid_ingredient_header(raw: str, charts_started: bool) -> tuple[bool, str]:
    cleaned = clean_header(raw)

    if len(cleaned) < 2:
        return False, ""
    if not any(c.isalpha() for c in cleaned):
        return False, ""
    if "\t" in raw:
        return False, ""
    if any(c.isdigit() for c in cleaned):
        return False, ""
    if len(cleaned) > 42:
        return False, ""
    if re.search(r"[\(\)]", cleaned):
        return False, ""

    BAD_PATTERNS = [
        r"^chapter\b", r"^preface\b", r"^contents\b", r"^index\b",
        r"^acknowledgment", r"^about\s+the\b", r"^also\s+by\b",
        r"^introduction\b", r"^appendix\b",
        r"^—", r"^\u2014",
        r"isbn", r"^copyright", r"^all\s+rights",
        r"^printed\s+in", r"^flavor affinities",
        r"^seek\b", r"^add\b", r"^use\b",
    ]
    lower = cleaned.lower()
    for pat in BAD_PATTERNS:
        if re.search(pat, lower):
            return False, ""

    if cleaned.upper() in NON_FOOD_HEADERS:
        return False, ""

    alpha_only = re.sub(r"[^a-zA-Z]", "", cleaned)
    if not alpha_only:
        return False, ""
    upper_count = sum(1 for c in alpha_only if c.isupper())
    ratio = upper_count / len(alpha_only)

    if not charts_started:
        return (cleaned.upper() in KNOWN_EARLY_INGREDIENTS and ratio >= 0.85), cleaned

    return (ratio >= 0.85 and len(alpha_only) >= 2), cleaned


def is_emphasis(token: str) -> bool:
    alpha = re.sub(r"[^a-zA-Z]", "", token)
    if not alpha:
        return False
    return alpha.isupper()


def clean_pairing_line(line: str) -> list[str]:
    """Extract food pairing names. Splits ONLY on commas/semicolons — never on spaces."""
    stripped = line.strip()

    # Whole-line compound match
    whole = stripped.lower().strip(".,;:")
    if whole in WHOLE_LINE_COMPOUNDS:
        return [WHOLE_LINE_COMPOUNDS[whole]]

    # Metadata label lines
    if stripped.rstrip(":").lower() in METADATA_LABELS:
        return []

    # Pure descriptor values
    if stripped.lower() in DESCRIPTOR_VALUES:
        return []

    # Hyphenated descriptor / season ranges (e.g. "spring–early autumn")
    if re.match(r"^[a-z]+([\u2013\u2014\-][a-z\s]+)+$", stripped.lower()):
        return []

    # Flavor Affinities and + combination lines
    if re.search(r"flavor affinities", stripped, re.IGNORECASE):
        return []
    if re.search(r"\baffinities\b", stripped, re.IGNORECASE):
        return []
    if "+" in stripped:
        return []

    # ANY line containing a ★ variant
    if contains_star(stripped):
        return []

    # Quote / attribution lines
    if re.search(r"(—|–|\u2014|\u2013)\s*[A-Z]", stripped):
        return []
    if stripped.startswith(('"', "\u201c", "'")):
        return []

    # Lines ending with period = sentences/tips
    if stripped.endswith(".") and len(stripped.split()) > 2:
        return []

    # Sentence-starter check — lowercased before comparison
    lower_stripped = stripped.lower()
    if any(lower_stripped.startswith(s) for s in SENTENCE_STARTERS):
        return []

    # "esp." qualifier lines — drop entire line
    if re.match(r"^esp\.?\s+\w", stripped, re.IGNORECASE):
        return []

    # Too many words = prose
    if len(stripped.split()) > 7:
        return []

    # Clean the line
    line = re.sub(r"^\s*[\-\*\•\·]\s*", "", stripped)
    line = re.sub(r"\(.*?\)", "", line)
    line = re.sub(r"\t+", " ", line).strip()
    line = re.sub(r"^:\s*", "", line).strip()

    if not line:
        return []

    # Split ONLY on commas and semicolons — never on spaces
    tokens = re.split(r"[,;]", line)

    results = []
    for token in tokens:
        token = token.strip().strip("\"'\u2013\u2014\u201c\u201d").strip()
        token = token.rstrip(":").strip()

        if not token or len(token) < 2:
            continue
        if re.match(r"^\d+$", token):
            continue
        if len(token) > 50:
            continue

        # Stopwords
        if token.lower() in {
            "and", "or", "with", "to", "for", "the", "a", "an",
            "of", "in", "at", "by", "as", "is", "it", "its",
            "esp", "i.e", "e.g", "etc", "also", "esp.",
        }:
            continue

        # Descriptor values
        if token.lower() in DESCRIPTOR_VALUES:
            continue

        # Metadata labels
        if token.lower() in METADATA_LABELS:
            continue

        # Standalone qualifiers
        if token.lower() in STANDALONE_QUALIFIERS:
            continue

        # Known noise tokens
        if token.lower() in REJECT_TOKENS:
            continue

        # Tokens containing any ★ variant
        if contains_star(token):
            continue

        # ALL CAPS multi-word tokens (restaurant/section headers)
        token_alpha = re.sub(r"[^a-zA-Z]", "", token)
        if token_alpha and token_alpha.isupper() and len(token.split()) >= 2:
            continue

        # "X: Y" colon subcategory patterns — reformat to "category value"
        # e.g. "wine: red" → "red wine", "nuts: cashews" → "cashews", "lemon: juice" → skip
        if ":" in token:
            parts = token.split(":", 1)
            category = parts[0].strip().lower()
            value = parts[1].strip() if len(parts) > 1 else ""
            if not value:
                continue  # bare colon — skip
            value_lower = value.lower()
            # Categories where value + category forms a real compound: "red wine", "apple tea"
            # For these, ignore standalone check on value (color adjectives are valid here)
            COMPOUND_CATEGORIES = {"wine", "wines", "tea", "crust", "pepper", "vinegar", "mustard"}
            if category in COMPOUND_CATEGORIES:
                token = f"{value} {category}"  # "red wine", "pastry crust", "balsamic vinegar"
            elif value_lower in STANDALONE_QUALIFIERS:
                continue  # value alone is meaningless (juice, powder, etc.) → skip
            else:
                token = value  # just keep the value: "cashews", "Camembert"

        # TOKEN-LEVEL prose fragment check
        # Catches prose embedded mid-line after a comma e.g.:
        # "walnuts, when I make an apple tart, calvados"
        token_words = token.split()
        # Any token 4+ words is prose — real ingredient names are 1-3 words max
        if len(token_words) >= 4:
            continue
        if len(token_words) >= 2:
            if token_words[0][0].isupper() and token_words[1].lower() in PROSE_SECOND_WORDS:
                continue
            if token_words[0].lower() in {"the", "a", "an", "i", "we", "they", "that", "so", "when", "where"}:
                continue

        # TOKEN-LEVEL esp. check
        if re.match(r"^esp\.?\s+", token, re.IGNORECASE):
            continue

        # TOKEN-LEVEL "ras el" two-word fragment
        if token.lower() in {"ras el", "el hanout"}:
            continue

        results.append(token)

    return results


def extract_text_from_pdf(pdf_path: Path) -> list[str]:
    try:
        from pypdf import PdfReader
    except ImportError:
        print("ERROR: pypdf not installed. Run: pip install pypdf")
        sys.exit(1)

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    print(f"  PDF loaded: {total_pages} pages")

    all_lines = []
    for i, page in enumerate(reader.pages):
        if i % 50 == 0:
            print(f"  Extracting text... page {i+1}/{total_pages}", end="\r")
        text = page.extract_text() or ""
        all_lines.extend(text.splitlines())

    print(f"\n  Extracted {len(all_lines):,} lines of text")
    return all_lines


def parse_structure(lines: list[str]) -> dict:
    ingredients: dict[str, dict] = {}
    pairing_counts: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    current_ingredient = None
    charts_started = False
    skipped_lines = 0

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        valid, cleaned_name = is_valid_ingredient_header(stripped, charts_started)

        if valid:
            norm_lower = cleaned_name.lower()
            candidate = NORMALIZATION.get(norm_lower, cleaned_name)

            if not charts_started:
                charts_started = True
                print(f"  Chart section starts at: '{candidate}' "
                      f"(skipped {skipped_lines:,} front-matter lines)")

            current_ingredient = candidate
            if current_ingredient not in ingredients:
                ingredients[current_ingredient] = {}
        else:
            if not charts_started:
                skipped_lines += 1
                continue
            if current_ingredient is None:
                continue

            pairing_names = clean_pairing_line(stripped)
            for raw_name in pairing_names:
                # Skip if pairing is the same as or a close variant of the ingredient
                ing_lower = current_ingredient.lower().rstrip("s")  # stem: "apples"→"apple"
                name_lower = raw_name.lower().rstrip("s")
                if name_lower == ing_lower or raw_name.lower() == current_ingredient.lower():
                    continue

                # Check emphasis on raw_name BEFORE lowercasing
                emphasis = is_emphasis(raw_name)
                # Reject ALL CAPS multi-word tokens (restaurant names, section headers)
                # Single ALL CAPS = legitimate emphasis marker within the pairing list
                if emphasis and len(raw_name.split()) >= 2:
                    continue

                canonical = normalize(raw_name).lower()
                pairing_counts[current_ingredient][canonical] += 1

                if canonical not in ingredients[current_ingredient]:
                    ingredients[current_ingredient][canonical] = {
                        "name": canonical,
                        "emphasis": emphasis,
                    }
                elif emphasis:
                    ingredients[current_ingredient][canonical]["emphasis"] = True

    for ing, pairings in ingredients.items():
        for canonical, data in pairings.items():
            data["count"] = pairing_counts[ing][canonical]

    return ingredients


def build_edges(ingredients: dict) -> tuple:
    node_set = set()
    edge_map: dict = {}

    for ingredient, pairings in ingredients.items():
        node_set.add(ingredient)
        for canonical, data in pairings.items():
            node_set.add(canonical)

            score = SCORE_DEFAULT
            if data["count"] > 1:
                score += SCORE_REPEAT
            if data["emphasis"]:
                score += SCORE_EMPHASIS

            key = frozenset([ingredient, canonical])
            if key not in edge_map:
                edge_map[key] = {
                    "ingredient_1": ingredient,
                    "ingredient_2": canonical,
                    "score": round(score, 2),
                    "source": "bible",
                    "emphasis": data["emphasis"],
                }
            else:
                edge_map[key]["score"] = round(max(edge_map[key]["score"], score), 2)
                if data["emphasis"]:
                    edge_map[key]["emphasis"] = True

    return node_set, list(edge_map.values())


def insert_neo4j(node_set: set, edge_list: list, uri: str, user: str, password: str):
    try:
        from neo4j import GraphDatabase
    except ImportError:
        print("ERROR: neo4j driver not installed. Run: pip install neo4j")
        sys.exit(1)

    driver = GraphDatabase.driver(uri, auth=(user, password))
    print(f"\n  Connecting to Neo4j at {uri}...")

    with driver.session() as session:
        session.run("""
            CREATE CONSTRAINT ingredient_name IF NOT EXISTS
            FOR (i:Ingredient) REQUIRE i.name IS UNIQUE
        """)
        nodes = [{"name": n} for n in node_set]
        batch_size = 500
        for i in range(0, len(nodes), batch_size):
            batch = nodes[i:i+batch_size]
            session.run("""
                UNWIND $batch AS row
                MERGE (i:Ingredient {name: row.name})
                ON CREATE SET i.source = 'bible'
            """, batch=batch)
            print(f"  Nodes: {min(i+batch_size, len(nodes))}/{len(nodes)}", end="\r")
        print(f"\n  {len(nodes):,} ingredient nodes inserted")

        for i in range(0, len(edge_list), batch_size):
            batch = edge_list[i:i+batch_size]
            session.run("""
                UNWIND $batch AS row
                MATCH (a:Ingredient {name: row.ingredient_1})
                MATCH (b:Ingredient {name: row.ingredient_2})
                MERGE (a)-[r:PAIRS_WITH]-(b)
                ON CREATE SET r.score = row.score, r.source = row.source, r.emphasis = row.emphasis
                ON MATCH SET r.score = CASE WHEN row.score > r.score THEN row.score ELSE r.score END
            """, batch=batch)
            print(f"  Edges: {min(i+batch_size, len(edge_list))}/{len(edge_list)}", end="\r")
        print(f"\n  {len(edge_list):,} PAIRS_WITH relationships inserted")

    driver.close()


def main():
    parser = argparse.ArgumentParser(description="IDANA — Flavor Bible PDF Parser v1.7")
    parser.add_argument("pdf", nargs="?", help="Path to The Flavor Bible PDF")
    parser.add_argument("--load-json", metavar="FILE", help="Skip PDF parsing; load nodes/edges from a saved JSON file")
    parser.add_argument("--output", default="idana_flavor_data.json")
    parser.add_argument("--neo4j",    action="store_true")
    parser.add_argument("--uri",      default="bolt://localhost:7687")
    parser.add_argument("--user",     default="neo4j")
    parser.add_argument("--password", default="")
    parser.add_argument("--dry-run",  action="store_true")
    args = parser.parse_args()

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  IDANA — Flavor Bible Parser  (v1.7)")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    # ── Load-from-JSON shortcut ──────────────────────────────────────────────
    if args.load_json:
        json_path = Path(args.load_json)
        if not json_path.exists():
            print(f"ERROR: File not found: {json_path}")
            sys.exit(1)
        print(f"Loading graph from {json_path}...")
        with open(json_path, encoding="utf-8") as f:
            data = json.load(f)
        node_set = set(data["nodes"])
        edge_list = data["edges"]
        scores = [e["score"] for e in edge_list]
        print(f"  {len(node_set):,} nodes, {len(edge_list):,} edges loaded")
        print(f"  Emphasized: {sum(1 for e in edge_list if e.get('emphasis')):,}")
        print(f"  Score range: {min(scores):.1f} – {max(scores):.1f}")
        if args.neo4j:
            print("\nInserting into Neo4j...")
            insert_neo4j(node_set, edge_list, args.uri, args.user, args.password)
        print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print("  Done. IDANA flavor graph ready.")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        return

    # ── Full PDF parse ───────────────────────────────────────────────────────
    if not args.pdf:
        print("ERROR: provide a PDF path or use --load-json")
        sys.exit(1)

    pdf_path = Path(args.pdf)
    if not pdf_path.exists():
        print(f"ERROR: File not found: {pdf_path}")
        sys.exit(1)

    print("STEP 1 — Extracting text from PDF...")
    lines = extract_text_from_pdf(pdf_path)

    print("\nSTEP 2-3 — Detecting headers and pairings...")
    ingredients = parse_structure(lines)
    print(f"  Found {len(ingredients):,} ingredient entries")

    if args.dry_run:
        print(f"\n── DRY RUN: First 30 ingredients ──")
        for i, (ing, pairings) in enumerate(list(ingredients.items())[:30]):
            print(f"\n  [{i+1}] {ing}  ({len(pairings)} pairings)")
            for canonical, data in list(pairings.items())[:6]:
                flag = " ★" if data["emphasis"] else ""
                print(f"       → {canonical}{flag}  (x{data['count']})")
            if len(pairings) > 6:
                print(f"       ... and {len(pairings)-6} more")
        print("\n── End dry run ──\n")
        return

    print("\nSTEP 4 — Building edges...")
    node_set, edge_list = build_edges(ingredients)
    scores = [e["score"] for e in edge_list]
    print(f"  {len(node_set):,} unique ingredient nodes")
    print(f"  {len(edge_list):,} unique PAIRS_WITH edges")
    print(f"  Emphasized: {sum(1 for e in edge_list if e['emphasis']):,}")
    print(f"  Score range: {min(scores):.1f} – {max(scores):.1f}")

    print(f"\nSTEP 5a — Writing JSON to {args.output}...")
    output = {
        "meta": {
            "source": "The Flavor Bible",
            "parser": "IDANA v1.7",
            "normalization": NORMALIZATION,
            "scoring": {
                "default": SCORE_DEFAULT,
                "repeat": SCORE_REPEAT,
                "emphasis": SCORE_EMPHASIS,
            },
        },
        "stats": {"ingredients": len(node_set), "edges": len(edge_list)},
        "nodes": sorted(list(node_set)),
        "edges": edge_list,
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    print(f"  Saved → {args.output}")

    if args.neo4j:
        print("\nSTEP 5b — Inserting into Neo4j...")
        insert_neo4j(node_set, edge_list, args.uri, args.user, args.password)

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print("  Done. IDANA flavor graph ready.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")


if __name__ == "__main__":
    main()