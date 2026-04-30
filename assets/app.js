const demoItems = ["bananas", "milk", "eggs", "spinach", "pasta", "strawberries"];

const illustrationLibrary = {
  bananas: { file: "assets/illustrations/bananas.svg", note: "Fallback art while a photo loads.", aliases: ["banana"] },
  milk: { file: "assets/illustrations/milk.svg", note: "Fallback art while a photo loads.", aliases: [] },
  eggs: { file: "assets/illustrations/eggs.svg", note: "Fallback art while a photo loads.", aliases: ["egg"] },
  spinach: { file: "assets/illustrations/spinach.svg", note: "Fallback art while a photo loads.", aliases: [] },
  pasta: { file: "assets/illustrations/pasta.svg", note: "Fallback art while a photo loads.", aliases: ["spaghetti"] },
  strawberries: { file: "assets/illustrations/strawberries.svg", note: "Fallback art while a photo loads.", aliases: ["strawberry"] },
  bread: { file: "assets/illustrations/bread.svg", note: "Fallback art while a photo loads.", aliases: [] },
  apples: { file: "assets/illustrations/apples.svg", note: "Fallback art while a photo loads.", aliases: ["apple"] },
  chicken: { file: "assets/illustrations/chicken.svg", note: "Fallback art while a photo loads.", aliases: [] },
  'chicken breast': { file: "assets/illustrations/chicken.svg", note: "Fallback art while a photo loads.", aliases: [] },
  yogurt: { file: "assets/illustrations/yogurt.svg", note: "Fallback art while a photo loads.", aliases: [] },
  coffee: { file: "assets/illustrations/coffee.svg", note: "Fallback art while a photo loads.", aliases: [] },
  rice: { file: "assets/illustrations/rice.svg", note: "Fallback art while a photo loads.", aliases: [] },
};

const searchOverrides = {
  bananas: ["bananas food", "bananas grocery store", "banana fruit"],
  milk: ["whole milk aisle", "milk carton", "milk bottle"],
  eggs: ["egg carton grocery", "eggs carton", "chicken eggs"],
  spinach: ["fresh spinach leaves", "spinach leaves", "spinach bunch"],
  pasta: ["pasta package", "spaghetti package", "dry pasta"],
  strawberries: ["strawberries in plastic bin", "strawberries food", "fresh strawberries"],
  bread: ["sliced bread", "bread loaf", "bread loaf grocery"],
  apples: ["apple fruit grocery", "red apples", "apples fruit"],
  'chicken breast': ["raw chicken breast", "chicken breast package", "fresh chicken breast"],
  yogurt: ["yogurt container", "plain yogurt", "yogurt cup"],
  coffee: ["coffee beans bag", "ground coffee bag", "coffee grocery"],
  rice: ["bag of rice", "white rice bag", "rice bag grocery"],
};

const negativeTitleTerms = [
  "store", "grocery", "building", "district", "historic", "street", "warehouse", "truck", "restaurant",
  "school", "inn", "campus", "mall", "banke", "farm", "harvest", "pot", "boiled", "curry", "carrots", "onions",
];

const aliasLookup = Object.entries(illustrationLibrary).reduce((acc, [key, value]) => {
  acc[key] = key;
  (value.aliases || []).forEach((alias) => { acc[alias] = key; });
  return acc;
}, {});

const input = document.getElementById("grocery-input");
const demoFillButton = document.getElementById("demo-fill");
const shopButton = document.getElementById("shop-button");
const clearButton = document.getElementById("clear-button");
const shoppingStage = document.getElementById("shopping-stage");
const swipeCard = document.getElementById("swipe-card");
const cardImage = document.getElementById("card-image");
const cardItemName = document.getElementById("card-item-name");
const cardItemNote = document.getElementById("card-item-note");
const progressPill = document.getElementById("progress-pill");
const remainingList = document.getElementById("remaining-list");
const grabbedList = document.getElementById("grabbed-list");
const remainingCount = document.getElementById("remaining-count");
const grabbedCount = document.getElementById("grabbed-count");

const state = { queue: [], grabbed: [] };
let photoManifest = {};
let cardRequestNonce = 0;
const inFlightPhotoRequests = new Map();
const localPhotoCache = loadPhotoCache();

function normalizeItem(raw) {
  return raw.trim().replace(/^[-*•]\s*/, "").replace(/\s+/g, " ").toLowerCase();
}

function titleize(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseInput(value) {
  return value.split(/[\n,]/).map(normalizeItem).filter(Boolean);
}

function resolveKey(item) {
  const cleaned = item.replace(/s$/, "");
  return aliasLookup[item] || aliasLookup[cleaned] || item;
}

function loadPhotoCache() {
  try {
    const raw = window.localStorage.getItem("grocery-getter-photo-cache");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistPhotoCache() {
  try {
    window.localStorage.setItem("grocery-getter-photo-cache", JSON.stringify(localPhotoCache));
  } catch {
    // ignore quota / privacy mode failures
  }
}

function categoryFor(item) {
  if (["spinach", "bananas", "apples", "strawberries"].includes(item)) return "produce";
  if (["milk", "eggs", "yogurt"].includes(item)) return "dairy";
  if (["chicken", "chicken breast"].includes(item)) return "protein";
  return "pantry";
}

function fallbackDataUri(item) {
  const title = titleize(item);
  const category = categoryFor(item);
  const themes = {
    produce: ["#e7ffe8", "#4fcb75", "#1d6b34", "leaf"],
    dairy: ["#eaf5ff", "#7abfff", "#24537d", "drop"],
    protein: ["#fff0ea", "#dd8d63", "#7b3b25", "arc"],
    pantry: ["#fff6e6", "#efc56a", "#7a5b1d", "grain"],
  };
  const [bg, accent, dark, motif] = themes[category];
  const motifSvg = {
    leaf: '<path d="M262 110c-72 24-121 101-102 169 18 66 93 115 162 94 58-17 91-67 91-124 0-82-72-165-151-139z" fill="#4fcb75" opacity="0.22"/>',
    drop: '<path d="M256 118c56 70 94 118 94 174 0 58-42 106-94 106s-94-48-94-106c0-56 38-104 94-174z" fill="#7abfff" opacity="0.20"/>',
    arc: '<path d="M132 286c0-74 54-124 124-124s124 50 124 124-54 124-124 124-124-50-124-124z" fill="#dd8d63" opacity="0.22"/>',
    grain: '<path d="M158 338c28-84 79-154 98-154s70 70 98 154" fill="none" stroke="#efc56a" stroke-width="20" stroke-linecap="round" opacity="0.35"/>',
  }[motif];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="56" fill="${bg}"/>${motifSvg}<circle cx="256" cy="232" r="108" fill="${accent}" opacity="0.28"/><text x="256" y="280" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="168" font-weight="800" fill="${dark}">${title[0]}</text><text x="256" y="412" text-anchor="middle" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700" fill="${dark}">${title}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function scoreCandidate(item, title) {
  const normalizedItem = normalizeItem(item);
  const titleLc = title.toLowerCase();
  const itemTokens = normalizedItem.split(/[^a-z0-9]+/).filter(Boolean);
  let score = 0;

  itemTokens.forEach((token) => {
    if (titleLc.includes(token)) score += 6;
  });

  if (titleLc.includes(normalizedItem)) score += 10;
  if (["food", "fruit", "fresh", "bag", "carton", "container", "cup", "beans", "breast", "aisle", "package"].some((token) => titleLc.includes(token))) score += 3;
  if (titleLc.includes("leaves")) score += 4;
  if (titleLc.includes("kale")) score -= 5;
  if (negativeTitleTerms.some((term) => titleLc.includes(term))) score -= 8;
  if (titleLc.endsWith(".png")) score -= 2;
  if (titleLc.includes("clip art")) score -= 12;

  return score;
}

function buildSearchTerms(item) {
  const normalized = normalizeItem(item);
  if (searchOverrides[normalized]) return [...searchOverrides[normalized], normalized];
  return [
    `${normalized} grocery item`,
    `${normalized} grocery store`,
    `${normalized} food`,
    normalized,
  ];
}

function getIllustration(item) {
  const key = resolveKey(item);
  const entry = illustrationLibrary[key];
  if (entry) {
    return { src: entry.file, note: entry.note, label: titleize(item), kind: "fallback" };
  }
  return {
    src: fallbackDataUri(item),
    note: "Fallback art while a photo loads.",
    label: titleize(item),
    kind: "fallback",
  };
}

function getKnownPhoto(item) {
  const key = resolveKey(item);
  const fromManifest = photoManifest[key] || photoManifest[item];
  if (fromManifest?.src) {
    return { src: fromManifest.src, note: "Cached grocery photo.", label: titleize(item), kind: "photo" };
  }
  const fromCache = localPhotoCache[key] || localPhotoCache[item];
  if (fromCache?.src) {
    return { src: fromCache.src, note: fromCache.note || "Live grocery photo.", label: titleize(item), kind: "photo" };
  }
  return null;
}

function getImmediateArt(item) {
  return getKnownPhoto(item) || getIllustration(item);
}

async function loadPhotoManifest() {
  try {
    const response = await fetch("assets/photos/manifest.json", { cache: "no-cache" });
    if (!response.ok) return;
    photoManifest = await response.json();
    renderLists();
    renderCard();
  } catch {
    photoManifest = {};
  }
}

async function searchWikimediaPhoto(item) {
  const queries = buildSearchTerms(item);
  for (const query of queries) {
    const params = new URLSearchParams({
      origin: "*",
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrnamespace: "6",
      prop: "imageinfo",
      iiprop: "url",
      format: "json",
      gsrlimit: "5",
    });
    try {
      const response = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
      if (!response.ok) continue;
      const payload = await response.json();
      const pages = Object.values(payload?.query?.pages || {});
      const candidates = pages
        .map((page) => {
          const url = page?.imageinfo?.[0]?.url;
          const title = page?.title || "";
          return { title, url, score: scoreCandidate(item, title) };
        })
        .filter((candidate) => candidate.url && /\.(jpg|jpeg|png|webp)$/i.test(candidate.url))
        .sort((a, b) => b.score - a.score);
      if (candidates.length) {
        return {
          src: candidates[0].url,
          note: "Live grocery photo.",
          label: titleize(item),
          kind: "photo",
        };
      }
    } catch {
      // try next query
    }
  }
  return null;
}

async function ensurePhoto(item) {
  const key = resolveKey(item);
  if (getKnownPhoto(item)) return getKnownPhoto(item);
  if (inFlightPhotoRequests.has(key)) return inFlightPhotoRequests.get(key);

  const promise = searchWikimediaPhoto(item)
    .then((art) => {
      if (art) {
        localPhotoCache[key] = art;
        persistPhotoCache();
      }
      return art;
    })
    .finally(() => {
      inFlightPhotoRequests.delete(key);
    });

  inFlightPhotoRequests.set(key, promise);
  return promise;
}

function renderListMarkup(items, emptyText) {
  if (!items.length) return `<li>${emptyText}</li>`;
  return items.map((item) => {
    const art = getImmediateArt(item);
    return `<li class="list-item-row"><img src="${art.src}" alt="" class="list-thumb" /><span>${titleize(item)}</span></li>`;
  }).join("");
}

function renderLists() {
  remainingCount.textContent = String(state.queue.length);
  grabbedCount.textContent = String(state.grabbed.length);

  remainingList.className = `item-list${state.queue.length ? "" : " empty-list"}`;
  grabbedList.className = `item-list${state.grabbed.length ? "" : " empty-list"}`;

  remainingList.innerHTML = renderListMarkup(state.queue, "Add items and tap Shop.");
  grabbedList.innerHTML = renderListMarkup(state.grabbed, "Nothing grabbed yet.");
}

function resetCardTransform() {
  swipeCard.style.transform = "translateX(0px) rotate(0deg)";
  swipeCard.style.opacity = "1";
}

function setCardArt(art, noteOverride = null) {
  cardImage.src = art.src;
  cardImage.alt = art.label;
  cardItemName.textContent = art.label;
  cardItemNote.textContent = noteOverride || art.note;
}

function renderCard() {
  renderLists();
  const total = state.queue.length + state.grabbed.length;
  progressPill.textContent = `${state.grabbed.length} / ${total} grabbed`;

  if (!state.queue.length) {
    shoppingStage.hidden = total === 0;
    setCardArt({ src: fallbackDataUri("done"), label: "Trip complete", note: total ? "You cleared the list. Nice." : "Add a few grocery items, then tap Shop." }, total ? "You cleared the list. Nice." : "Add a few grocery items, then tap Shop.");
    resetCardTransform();
    return;
  }

  shoppingStage.hidden = false;
  const nextItem = state.queue[0];
  const art = getImmediateArt(nextItem);
  setCardArt(art, art.kind === "photo" ? art.note : "Finding a real grocery photo…");
  resetCardTransform();

  if (art.kind !== "photo") {
    const requestNonce = ++cardRequestNonce;
    ensurePhoto(nextItem).then((photoArt) => {
      if (!photoArt) return;
      renderLists();
      if (requestNonce !== cardRequestNonce) return;
      if (state.queue[0] !== nextItem) return;
      setCardArt(photoArt);
    });
  }
}

function startShopping(items) {
  state.queue = [...items];
  state.grabbed = [];
  renderCard();
}

function autoStartDemoIfRequested() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "1") return;
  input.value = demoItems.join(", ");
  startShopping(demoItems);
}

function markGrabbed() {
  if (!state.queue.length) return;
  state.grabbed.push(state.queue.shift());
  renderCard();
}

function skipItem() {
  if (!state.queue.length) return;
  const first = state.queue.shift();
  state.queue.push(first);
  renderCard();
}

demoFillButton.addEventListener("click", () => {
  input.value = demoItems.join(", ");
});

shopButton.addEventListener("click", () => {
  const items = parseInput(input.value);
  if (!items.length) {
    input.focus();
    return;
  }
  startShopping(items);
  shoppingStage.scrollIntoView({ behavior: "smooth", block: "start" });
});

clearButton.addEventListener("click", () => {
  input.value = "";
  state.queue = [];
  state.grabbed = [];
  shoppingStage.hidden = true;
  renderLists();
});

let pointerStartX = 0;
let currentOffsetX = 0;
let dragging = false;

swipeCard.addEventListener("pointerdown", (event) => {
  if (!state.queue.length) return;
  dragging = true;
  pointerStartX = event.clientX;
  currentOffsetX = 0;
  swipeCard.classList.add("is-dragging");
  swipeCard.setPointerCapture(event.pointerId);
});

swipeCard.addEventListener("pointermove", (event) => {
  if (!dragging) return;
  currentOffsetX = event.clientX - pointerStartX;
  const rotation = currentOffsetX / 18;
  swipeCard.style.transform = `translateX(${currentOffsetX}px) rotate(${rotation}deg)`;
  swipeCard.style.opacity = String(Math.max(0.78, 1 - Math.abs(currentOffsetX) / 560));
});

function finishSwipe(event) {
  if (!dragging) return;
  dragging = false;
  swipeCard.classList.remove("is-dragging");
  swipeCard.releasePointerCapture?.(event.pointerId);

  if (currentOffsetX > 110) {
    markGrabbed();
    return;
  }

  if (currentOffsetX < -110) {
    skipItem();
    return;
  }

  resetCardTransform();
}

swipeCard.addEventListener("pointerup", finishSwipe);
swipeCard.addEventListener("pointercancel", finishSwipe);

renderLists();
autoStartDemoIfRequested();
loadPhotoManifest();
