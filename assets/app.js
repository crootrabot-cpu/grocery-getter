const demoItems = ["bananas", "milk", "eggs", "spinach", "pasta", "strawberries"];

const library = {
  bananas: { file: "assets/illustrations/bananas.svg", note: "Produce section.", aliases: ["banana"] },
  milk: { file: "assets/illustrations/milk.svg", note: "Cold dairy case.", aliases: [] },
  eggs: { file: "assets/illustrations/eggs.svg", note: "Dairy or refrigerated wall.", aliases: ["egg"] },
  spinach: { file: "assets/illustrations/spinach.svg", note: "Leafy greens section.", aliases: [] },
  pasta: { file: "assets/illustrations/pasta.svg", note: "Dry goods aisle.", aliases: ["spaghetti"] },
  strawberries: { file: "assets/illustrations/strawberries.svg", note: "Produce section.", aliases: ["strawberry"] },
  bread: { file: "assets/illustrations/bread.svg", note: "Bakery or bread aisle.", aliases: [] },
  apples: { file: "assets/illustrations/apples.svg", note: "Produce section.", aliases: ["apple"] },
  chicken: { file: "assets/illustrations/chicken.svg", note: "Meat section.", aliases: [] },
  yogurt: { file: "assets/illustrations/yogurt.svg", note: "Dairy case.", aliases: [] },
  coffee: { file: "assets/illustrations/coffee.svg", note: "Pantry aisle.", aliases: [] },
  rice: { file: "assets/illustrations/rice.svg", note: "Pantry aisle.", aliases: [] },
};

const aliasLookup = Object.entries(library).reduce((acc, [key, value]) => {
  acc[key] = key;
  value.aliases.forEach((alias) => { acc[alias] = key; });
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

function normalizeItem(raw) {
  return raw.trim().replace(/^[-*•]\s*/, "").toLowerCase();
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

function categoryFor(item) {
  if (["spinach", "bananas", "apples", "strawberries"].includes(item)) return "produce";
  if (["milk", "eggs", "yogurt"].includes(item)) return "dairy";
  if (["chicken"].includes(item)) return "protein";
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

function getItemArt(item) {
  const key = resolveKey(item);
  const entry = library[key];
  if (entry) {
    return { src: entry.file, note: entry.note, label: titleize(item) };
  }
  return {
    src: fallbackDataUri(item),
    note: "Generated fallback art.",
    label: titleize(item),
  };
}

function renderListMarkup(items, emptyText) {
  if (!items.length) return `<li>${emptyText}</li>`;
  return items.map((item) => {
    const art = getItemArt(item);
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

function renderCard() {
  renderLists();
  const total = state.queue.length + state.grabbed.length;
  progressPill.textContent = `${state.grabbed.length} / ${total} grabbed`;

  if (!state.queue.length) {
    shoppingStage.hidden = total === 0;
    cardImage.src = fallbackDataUri("done");
    cardImage.alt = "Trip complete";
    cardItemName.textContent = total ? "Trip complete" : "No items yet";
    cardItemNote.textContent = total ? "You cleared the list. Nice." : "Add a few grocery items, then tap Shop.";
    resetCardTransform();
    return;
  }

  shoppingStage.hidden = false;
  const nextItem = state.queue[0];
  const art = getItemArt(nextItem);
  cardImage.src = art.src;
  cardImage.alt = art.label;
  cardItemName.textContent = art.label;
  cardItemNote.textContent = art.note;
  resetCardTransform();
}

function startShopping(items) {
  state.queue = [...items];
  state.grabbed = [];
  renderCard();
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
