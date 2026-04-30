from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urlencode
from urllib.request import Request, urlopen

WIKIMEDIA_API = "https://commons.wikimedia.org/w/api.php"
USER_AGENT = "GroceryGetterPhotoAgent/1.0 (+https://github.com/crootrabot-cpu/grocery-getter)"
DEFAULT_ITEMS = [
    "bananas",
    "milk",
    "eggs",
    "spinach",
    "pasta",
    "strawberries",
    "bread",
    "apples",
    "chicken breast",
    "yogurt",
    "coffee",
    "rice",
]
SEARCH_OVERRIDES = {
    "bananas": ["bananas food", "bananas grocery store", "banana fruit"],
    "milk": ["whole milk aisle", "milk carton", "milk bottle"],
    "eggs": ["egg carton grocery", "eggs carton", "chicken eggs"],
    "spinach": ["fresh spinach leaves", "spinach leaves", "spinach bunch"],
    "pasta": ["pasta package", "spaghetti package", "dry pasta"],
    "strawberries": ["strawberries in plastic bin", "strawberries food", "fresh strawberries"],
    "bread": ["sliced bread", "bread loaf", "bread loaf grocery"],
    "apples": ["apple fruit grocery", "red apples", "apples fruit"],
    "chicken breast": ["raw chicken breast", "chicken breast package", "fresh chicken breast"],
    "yogurt": ["yogurt container", "plain yogurt", "yogurt cup"],
    "coffee": ["coffee beans bag", "ground coffee bag", "coffee grocery"],
    "rice": ["bag of rice", "white rice bag", "rice bag grocery"],
}

NEGATIVE_TITLE_TERMS = {
    "store",
    "grocery",
    "building",
    "district",
    "historic",
    "street",
    "warehouse",
    "truck",
    "restaurant",
    "school",
    "inn",
    "campus",
    "mall",
    "banke",
    "farm",
    "harvest",
    "pot",
    "boiled",
    "curry",
    "carrots",
    "onions",
}


def normalize_item(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip().lower())



def slugify_item(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", normalize_item(value))
    return slug.strip("-")



def build_search_terms(item: str) -> list[str]:
    normalized = normalize_item(item)
    override = SEARCH_OVERRIDES.get(normalized)
    if override:
        return override + [normalized]
    return [
        f"{normalized} grocery item",
        f"{normalized} grocery store",
        f"{normalized} food",
        normalized,
    ]



def upsert_manifest_entry(manifest: dict, item: str, entry: dict) -> None:
    manifest[normalize_item(item)] = entry



def score_candidate(item: str, title: str) -> int:
    normalized_item = normalize_item(item)
    title_lc = title.lower()
    item_tokens = [token for token in re.split(r"[^a-z0-9]+", normalized_item) if token]
    score = 0
    for token in item_tokens:
        if token in title_lc:
            score += 6
    if normalized_item in title_lc:
        score += 10
    if any(token in title_lc for token in ("food", "fruit", "fresh", "bag", "carton", "container", "cup", "beans", "breast", "aisle", "package")):
        score += 3
    if "leaves" in title_lc:
        score += 4
    if "kale" in title_lc:
        score -= 5
    if any(term in title_lc for term in NEGATIVE_TITLE_TERMS):
        score -= 8
    if title_lc.endswith(".png"):
        score -= 2
    if "clip art" in title_lc:
        score -= 12
    return score



def load_manifest(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text())



def save_manifest(path: Path, manifest: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")



def wikimedia_candidates(query: str, item: str) -> list[dict]:
    params = {
        "action": "query",
        "generator": "search",
        "gsrsearch": query,
        "gsrnamespace": 6,
        "prop": "imageinfo",
        "iiprop": "url",
        "format": "json",
        "gsrlimit": 5,
    }
    request = Request(f"{WIKIMEDIA_API}?{urlencode(params)}", headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=30) as response:
        payload = json.load(response)
    pages = payload.get("query", {}).get("pages", {})
    candidates = []
    for page in pages.values():
        info = (page.get("imageinfo") or [{}])[0]
        url = info.get("url")
        title = page.get("title", "")
        if not url:
            continue
        if not re.search(r"\.(jpg|jpeg|png|webp)$", url, flags=re.I):
            continue
        candidates.append({"title": title, "url": url, "score": score_candidate(item, title)})
    return sorted(candidates, key=lambda candidate: candidate['score'], reverse=True)



def download_binary(url: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    request = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(request, timeout=60) as response:
        destination.write_bytes(response.read())



def local_src_for(destination: Path, project_root: Path) -> str:
    return destination.relative_to(project_root).as_posix()



def fetch_photo_for_item(item: str, photos_dir: Path, project_root: Path) -> dict:
    errors = []
    slug = slugify_item(item)
    for query in build_search_terms(item):
        try:
            candidates = wikimedia_candidates(query, item=item)
        except Exception as exc:  # pragma: no cover - network path
            errors.append(f"{query}: {exc}")
            continue
        if not candidates:
            continue
        best = candidates[0]
        extension = Path(best["url"]).suffix.lower() or ".jpg"
        destination = photos_dir / f"{slug}{extension}"
        download_binary(best["url"], destination)
        return {
            "src": local_src_for(destination, project_root),
            "source": "wikimedia",
            "title": best["title"],
            "query": query,
            "remote_url": best["url"],
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
    raise RuntimeError(f"no grocery photo found for {item}: {'; '.join(errors)}")



def refresh_items(items: Iterable[str], manifest_path: Path, photos_dir: Path, project_root: Path) -> dict:
    manifest = load_manifest(manifest_path)
    for item in items:
        record = fetch_photo_for_item(item, photos_dir=photos_dir, project_root=project_root)
        upsert_manifest_entry(manifest, item, record)
    save_manifest(manifest_path, manifest)
    return manifest



def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and cache grocery photos into a local manifest.")
    parser.add_argument("items", nargs="*", help="Grocery items to fetch. Defaults to a starter grocery set.")
    parser.add_argument("--manifest", default="assets/photos/manifest.json")
    parser.add_argument("--photos-dir", default="assets/photos")
    return parser.parse_args(argv)



def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    project_root = Path(__file__).resolve().parents[1]
    manifest_path = project_root / args.manifest
    photos_dir = project_root / args.photos_dir
    items = args.items or DEFAULT_ITEMS
    manifest = refresh_items(items, manifest_path=manifest_path, photos_dir=photos_dir, project_root=project_root)
    print(json.dumps({"items": items, "manifest_entries": len(manifest), "manifest": args.manifest}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
