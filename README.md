# Grocery Getter

Static HTML/CSS/JS prototype for a swipe-first grocery list experience.

## Concept
Say or type what's on your list, tap **Shop**, then swipe right as you grab each item. The app is now **photo-first**: seeded grocery items use cached real photos, and unknown items try a live Wikimedia Commons photo lookup in the browser.

## Photo system
- **Local cache:** `assets/photos/manifest.json`
- **Downloaded seed photos:** `assets/photos/`
- **Photo agent script:** `scripts/grocery_photo_agent.py`
- **Client behavior:** card prefers cached local grocery photos, then live-fetches a real photo, then falls back only if needed

## Refresh grocery photos
```bash
python3 scripts/grocery_photo_agent.py bananas milk eggs spinach pasta strawberries
```

That script updates `assets/photos/manifest.json` and downloads local photo assets for the requested grocery items.

## Reality
- Static prototype
- No speech-to-text yet
- No backend
- No real store map yet
- Real grocery photos are curated/cached for common items; live lookup is best-effort for unknowns
