const MAX_SUGGESTIONS = 8;

/**
 * Loads the car list from searchdata.json next to this file.
 * @returns {Promise<Array<object>>}
 */
async function loadCars() {
  const resp = await fetch(new URL('./searchdata.json', import.meta.url));
  if (!resp.ok) throw new Error(`searchdata.json returned ${resp.status}`);
  const { cars } = await resp.json();
  return Array.isArray(cars) ? cars : [];
}

const fullName = (car) => `${car.brand} ${car.name}`;

/**
 * Returns cars whose name or brand matches the query.
 * Matches at the start of a word rank ahead of matches mid-word.
 * @param {Array<object>} cars
 * @param {string} query
 */
function findMatches(cars, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return cars
    .map((car) => {
      const text = fullName(car).toLowerCase();
      const index = text.indexOf(q);
      if (index < 0) return null;
      const wordStart = index === 0 || text[index - 1] === ' ';
      return { car, rank: wordStart ? 0 : 1 };
    })
    .filter(Boolean)
    .sort((a, b) => a.rank - b.rank || fullName(a.car).localeCompare(fullName(b.car)))
    .map(({ car }) => car);
}

/**
 * Builds an element containing `text` with the `query` part wrapped in <mark>.
 * @param {string} text
 * @param {string} query
 */
function highlight(text, query) {
  const span = document.createElement('span');
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (index < 0 || !query.trim()) {
    span.textContent = text;
    return span;
  }
  const end = index + query.trim().length;
  const mark = document.createElement('mark');
  mark.textContent = text.slice(index, end);
  span.append(text.slice(0, index), mark, text.slice(end));
  return span;
}

const asList = (value) => (Array.isArray(value) ? value.join(', ') : value);

/**
 * Renders the details card for a car. Missing fields are skipped.
 * @param {object} car
 */
function renderCar(car) {
  const card = document.createElement('article');
  card.className = 'search-card';

  const header = document.createElement('div');
  header.className = 'search-card-header';
  const title = document.createElement('h3');
  title.textContent = fullName(car);
  header.append(title);
  if (car.type) {
    const badge = document.createElement('span');
    badge.className = 'search-card-badge';
    badge.textContent = car.type;
    header.append(badge);
  }
  card.append(header);

  const fields = [
    ['Price (ex-showroom)', car.priceRange],
    ['Fuel', asList(car.fuel)],
    ['Transmission', asList(car.transmission)],
    ['Engine', car.engine],
    ['Seating', car.seating && `${car.seating} seats`],
  ];
  const dl = document.createElement('dl');
  fields.filter(([, value]) => value).forEach(([label, value]) => {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    dl.append(dt, dd);
  });
  card.append(dl);

  if (Array.isArray(car.variants) && car.variants.length) {
    const heading = document.createElement('p');
    heading.className = 'search-card-subtitle';
    heading.textContent = 'Variants';
    const list = document.createElement('ul');
    list.className = 'search-card-variants';
    car.variants.forEach((variant) => {
      const li = document.createElement('li');
      li.textContent = variant;
      list.append(li);
    });
    card.append(heading, list);
  }

  return card;
}

function renderMessage(text) {
  const p = document.createElement('p');
  p.className = 'search-message';
  p.textContent = text;
  return p;
}

/**
 * Decorates the search widget.
 * @param {Element} widget The widget element
 */
export default async function decorate(widget) {
  const form = widget.querySelector('.search-form');
  const input = widget.querySelector('.search-input');
  const listbox = widget.querySelector('.search-suggestions');
  const result = widget.querySelector('.search-result');
  if (!form || !input || !listbox || !result) return;

  // keep ids unique if the widget is used more than once on a page
  const uid = `search-${Math.random().toString(36).slice(2, 8)}`;
  input.id = `${uid}-input`;
  listbox.id = `${uid}-suggestions`;
  input.setAttribute('aria-controls', listbox.id);
  widget.querySelector('.search-label')?.setAttribute('for', input.id);

  let cars = [];
  try {
    cars = await loadCars();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('search widget: failed to load data', error);
    result.replaceChildren(renderMessage('Car data could not be loaded. Please try again later.'));
    input.disabled = true;
    return;
  }

  let suggestions = [];
  let activeIndex = -1;

  const closeSuggestions = () => {
    listbox.hidden = true;
    listbox.replaceChildren();
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    suggestions = [];
    activeIndex = -1;
  };

  const setActive = (index) => {
    const options = [...listbox.children];
    options.forEach((option, i) => option.setAttribute('aria-selected', String(i === index)));
    activeIndex = index;
    if (options[index]) {
      input.setAttribute('aria-activedescendant', options[index].id);
      options[index].scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  const showResult = (car) => {
    result.replaceChildren(car
      ? renderCar(car)
      : renderMessage(`No car found for "${input.value.trim()}". Pick one from the suggestions.`));
  };

  const selectCar = (car) => {
    input.value = fullName(car);
    closeSuggestions();
    input.focus();
  };

  const openSuggestions = () => {
    suggestions = findMatches(cars, input.value).slice(0, MAX_SUGGESTIONS);
    if (!suggestions.length) {
      closeSuggestions();
      return;
    }
    listbox.replaceChildren(...suggestions.map((car, i) => {
      const li = document.createElement('li');
      li.id = `${uid}-option-${i}`;
      li.className = 'search-suggestion';
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', 'false');
      li.append(highlight(fullName(car), input.value));
      if (car.type) {
        const type = document.createElement('small');
        type.textContent = car.type;
        li.append(type);
      }
      // mousedown fires before the input blurs, so the click is not lost
      li.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectCar(car);
      });
      return li;
    }));
    listbox.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    activeIndex = -1;
  };

  input.addEventListener('input', openSuggestions);
  input.addEventListener('focus', () => { if (input.value.trim()) openSuggestions(); });
  input.addEventListener('blur', closeSuggestions);

  input.addEventListener('keydown', (e) => {
    if (listbox.hidden) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((activeIndex + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive(activeIndex <= 0 ? suggestions.length - 1 : activeIndex - 1);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectCar(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim().toLowerCase();
    if (!query) {
      result.replaceChildren(renderMessage('Type a car name to search.'));
      return;
    }
    closeSuggestions();
    // exact name first, then fall back to the best partial match
    const exact = cars.find((car) => fullName(car).toLowerCase() === query
      || car.name.toLowerCase() === query);
    showResult(exact || findMatches(cars, query)[0]);
  });
}
