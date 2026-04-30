const demoItems = ["bananas", "milk", "eggs", "spinach", "pasta", "strawberries"];

const artMap = {
  bananas: { emoji: "🍌", note: "Bright yellow bunch. Usually near the produce wall." },
  milk: { emoji: "🥛", note: "Cold dairy case. Grab the right size before you move on." },
  eggs: { emoji: "🥚", note: "Fragile. Quick visual reminder so you do not forget them." },
  spinach: { emoji: "🥬", note: "Leafy greens section. Fresh bag or clamshell." },
  pasta: { emoji: "🍝", note: "Dry goods aisle. Easy to miss on a fast run." },
  strawberries: { emoji: "🍓", note: "Fresh produce. Check color before tossing them in." },
  bread: { emoji: "🍞", note: "Bakery or bread aisle. Soft grab near the end of the trip." },
  apples: { emoji: "🍎", note: "Produce section. Quick visual helps you avoid the wrong variety." },
  chicken: { emoji: "🍗", note: "Meat section. Keep it cold and grab it late in the run." },
  yogurt: { emoji: "🥣", note: "Dairy case. Scan flavors fast and move." },
  coffee: { emoji: "☕", note: "Aisle staple. Good example of a dry-goods swipe card." },
  rice: { emoji: "🍚", note: "Pantry shelf. Heavy item, often easy to skip accidentally." },
};

const input = document.getElementById("grocery-input");
const demoFillButton = document.getElementById("demo-fill");
const shopButton = document.getElementById("shop-button");
const clearButton = document.getElementById("clear-button");
const shoppingStage = document.getElementById("shopping-stage");
const swipeCard = document.getElementById("swipe-card");
const cardVisual = document.getElementById("card-visual");
const cardItemName = document.getElementById("card-item-name");
const cardItemNote = document.getElementById("card-item-note");
const progressPill = document.getElementById("progress-pill");
const remainingList = document.getElementById("remaining-list");
const grabbedList = document.getElementById("grabbed-list");
const remainingCount = document.getElementById("remaining-count");
const grabbedCount = document.getElementById("grabbed-count");
const grabbedButton = document.getElementById("grabbed-button");
const skipButton = document.getElementById("skip-button");

const state = {
  queue: [],
  grabbed: [],
};

function normalizeItem(raw) {
  return raw.trim().replace(/^[-*•]\s*/, "").toLowerCase();
}

function titleize(text) {
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseInput(value) {
  return value
    .split(/[\n,]/)
    .map(normalizeItem)
    .filter(Boolean);
}

function getItemArt(item) {
  const found = artMap[item];
  if (found) return found;
  return { emoji: "🛒", note: `Illustration placeholder for ${titleize(item)}. Add richer custom art later.` };
}

function renderLists() {
  remainingCount.textContent = String(state.queue.length);
  grabbedCount.textContent = String(state.grabbed.length);

  remainingList.className = `item-list${state.queue.length ? "" : " empty-list"}`;
  grabbedList.className = `item-list${state.grabbed.length ? "" : " empty-list"}`;

  remainingList.innerHTML = state.queue.length
    ? state.queue.map((item) => `<li>${titleize(item)}</li>`).join("")
    : "<li>Add items and tap Shop.</li>";

  grabbedList.innerHTML = state.grabbed.length
    ? state.grabbed.map((item) => `<li>${titleize(item)}</li>`).join("")
    : "<li>Nothing grabbed yet.</li>";
}

function renderCard() {
  renderLists();

  const total = state.queue.length + state.grabbed.length;
  progressPill.textContent = `${state.grabbed.length} / ${total} grabbed`;

  if (!state.queue.length) {
    shoppingStage.hidden = total === 0;
    cardVisual.textContent = "✅";
    cardItemName.textContent = total ? "Trip complete" : "No items yet";
    cardItemNote.textContent = total
      ? "You cleared the list. Nice."
      : "Add a few grocery items, then tap Shop.";
    grabbedButton.disabled = true;
    skipButton.disabled = true;
    swipeCard.style.transform = "translateX(0px) rotate(0deg)";
    return;
  }

  shoppingStage.hidden = false;
  grabbedButton.disabled = false;
  skipButton.disabled = false;

  const nextItem = state.queue[0];
  const art = getItemArt(nextItem);
  cardVisual.textContent = art.emoji;
  cardItemName.textContent = titleize(nextItem);
  cardItemNote.textContent = art.note;
  swipeCard.style.transform = "translateX(0px) rotate(0deg)";
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
  if (state.queue.length <= 1) return;
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

grabbedButton.addEventListener("click", markGrabbed);
skipButton.addEventListener("click", skipItem);

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
  const rotation = currentOffsetX / 20;
  swipeCard.style.transform = `translateX(${currentOffsetX}px) rotate(${rotation}deg)`;
});

function finishSwipe(event) {
  if (!dragging) return;
  dragging = false;
  swipeCard.classList.remove("is-dragging");
  swipeCard.releasePointerCapture?.(event.pointerId);

  if (currentOffsetX > 120) {
    markGrabbed();
    return;
  }

  if (currentOffsetX < -120) {
    skipItem();
    return;
  }

  swipeCard.style.transform = "translateX(0px) rotate(0deg)";
}

swipeCard.addEventListener("pointerup", finishSwipe);
swipeCard.addEventListener("pointercancel", finishSwipe);

renderLists();
