import { activeFilterCount, connectControls, connectDropdown, matchesItem } from './shared/filters.js';

const CLUSTER_DISTANCE = 40;
const FIT_MAX_ZOOM = 13;
const MAX_ZOOM = 18;
const FIT_PADDING = 48;
const FAN_RADIUS = 28;
const PIN_SIZE = 44;
const PIN_TIP = [22, 35]; // where the drawn pin's point sits in its 44px button
const CARD_GAP = 12;
const VIEWPORT_MARGIN = 16;
const BOTTOM_SHEET = '(max-width: 599px)';
const MAP_INTERACTIONS = ['dragging', 'scrollWheelZoom', 'doubleClickZoom', 'touchZoom', 'boxZoom', 'keyboard'];

const { L } = globalThis;
const shell = document.querySelector('[data-map-shell]');
const canvas = shell.querySelector('[data-map]');
const form = shell.querySelector('[data-filter-form]');
const list = document.querySelector('[data-case-list]');
const dialog = shell.querySelector('[data-map-dialog]');
const message = shell.querySelector('[data-map-message]');
const pinTemplate = document.querySelector('[data-pin-template]');

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

function createMap() {
  const map = L.map(canvas, { zoomControl: false, maxZoom: MAX_ZOOM, center: [20, 0], zoom: 2 });
  L.tileLayer(canvas.dataset.tileUrl, { maxZoom: MAX_ZOOM, attribution: canvas.dataset.tileAttribution }).addTo(map);
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');
  return map;
}

function divMarker(latlng, element) {
  return L.marker(latlng, {
    // The button inside is the control, so Leaflet's own wrapper stays out of the tab order.
    keyboard: false,
    icon: L.divIcon({
      className: 'map-marker',
      html: element,
      iconSize: [PIN_SIZE, PIN_SIZE],
      iconAnchor: PIN_TIP,
    }),
  });
}

/**
 * Merges until no two groups sit within CLUSTER_DISTANCE. Comparing group centres rather than
 * stopping after one pass matters: a cluster is drawn at the average of its pins, so it can
 * drift onto a neighbour, and overlapping buttons are hard to hit.
 */
function groupByDistance(items, map, zoom) {
  const groups = items.map((item) => ({ members: [item], centre: map.project(item.latlng, zoom) }));
  for (let i = 0; i < groups.length; i += 1) {
    for (let j = i + 1; j < groups.length; j += 1) {
      if (groups[i].centre.distanceTo(groups[j].centre) <= CLUSTER_DISTANCE) {
        const [a, b] = [groups[i], groups[j]];
        const total = a.members.length + b.members.length;
        a.centre = a.centre.multiplyBy(a.members.length).add(b.centre.multiplyBy(b.members.length)).divideBy(total);
        a.members.push(...b.members);
        groups.splice(j, 1);
        // The merged group has moved, so everything has to be compared with it again.
        i = -1;
        break;
      }
    }
  }
  return groups.map((group) => group.members);
}

function setUpDialog(map) {
  const titleEl = dialog.querySelector('[data-card-title]');
  const metaEl = dialog.querySelector('[data-card-meta]');
  const imageEl = dialog.querySelector('[data-card-image]');
  const linkEl = dialog.querySelector('[data-card-link]');
  const linkNameEl = dialog.querySelector('[data-card-link-name]');
  const pinEl = dialog.querySelector('.map-pin--active');
  let activeItem = null;
  let savedScroll = 0;
  let pressedOnBackdrop = false;

  const metaRow = (label, value) => {
    const row = document.createElement('div');
    const term = document.createElement('dt');
    const detail = document.createElement('dd');
    term.textContent = label;
    detail.textContent = value;
    row.append(term, ' ', detail);
    return row;
  };

  const fill = (item) => {
    titleEl.textContent = item.title;
    metaEl.replaceChildren(
      ...[
        ['Designed by', item.architect],
        ['Year Completed', item.yearCompleted],
        ['Location note', item.locationNote],
      ]
        .filter(([, value]) => value)
        .map(([label, value]) => metaRow(label, value)),
    );
    linkEl.href = item.url;
    linkNameEl.textContent = ` ${item.title}`;
    imageEl.hidden = !item.image;
    if (item.image) {
      imageEl.srcset = item.image.srcset;
      imageEl.sizes = '(max-width: 599px) 100vw, 342px';
      imageEl.src = item.image.src;
    }
  };

  const tipOnScreen = (item) => {
    const box = canvas.getBoundingClientRect();
    const point = map.latLngToContainerPoint(item.marker.getLatLng());
    return { x: box.left + point.x, y: box.top + point.y };
  };

  const panSoTipIsAt = (tip, x, y) => map.panBy([tip.x - x, tip.y - y], { animate: false });

  // On a phone the sheet covers the lower part of the screen, so the map scrolls to the top
  // and the marker moves into what's left.
  const placeForSheet = (item, card) => {
    window.scrollTo(0, window.scrollY + canvas.getBoundingClientRect().top);
    const visibleHeight = window.innerHeight - card.height;
    panSoTipIsAt(tipOnScreen(item), document.documentElement.clientWidth / 2, visibleHeight * 0.6);
  };

  const placeBeside = (item, card) => {
    const viewport = { width: document.documentElement.clientWidth, height: window.innerHeight };
    let tip = tipOnScreen(item);
    const room = (x) => ({
      right: x + PIN_SIZE / 2 + CARD_GAP + card.width <= viewport.width - VIEWPORT_MARGIN,
      left: x - PIN_SIZE / 2 - CARD_GAP - card.width >= VIEWPORT_MARGIN,
    });
    // Too central for the card to fit on either side: slide the marker over to make room.
    if (!room(tip.x).right && !room(tip.x).left) {
      panSoTipIsAt(tip, VIEWPORT_MARGIN + PIN_SIZE, tip.y);
      tip = tipOnScreen(item);
    }
    const x = room(tip.x).right
      ? tip.x + PIN_SIZE / 2 + CARD_GAP
      : tip.x - PIN_SIZE / 2 - CARD_GAP - card.width;
    // Level with the marker unless that would leave the screen, then against the nearer edge.
    const y = Math.min(
      Math.max(tip.y - card.height / 2, VIEWPORT_MARGIN),
      viewport.height - card.height - VIEWPORT_MARGIN,
    );
    dialog.style.setProperty('--card-x', `${x}px`);
    dialog.style.setProperty('--card-y', `${Math.max(y, VIEWPORT_MARGIN)}px`);
  };

  const place = () => {
    const card = dialog.getBoundingClientRect();
    if (matchMedia(BOTTOM_SHEET).matches) placeForSheet(activeItem, card);
    else placeBeside(activeItem, card);
    const tip = tipOnScreen(activeItem);
    pinEl.style.setProperty('--pin-x', `${tip.x - PIN_TIP[0]}px`);
    pinEl.style.setProperty('--pin-y', `${tip.y - PIN_TIP[1]}px`);
  };

  dialog.addEventListener('mousedown', (event) => {
    pressedOnBackdrop = event.target === dialog;
  });
  // A click on ::backdrop reports the dialog as its target. Checking where the press began
  // stops a text selection dragged out of the card from closing it.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog && pressedOnBackdrop) dialog.close();
  });
  dialog.addEventListener('close', () => {
    MAP_INTERACTIONS.forEach((name) => map[name]?.enable());
    window.scrollTo(0, savedScroll);
    // Named explicitly because Safari doesn't focus a button on click, so the browser's own
    // focus return can't be relied on to land here.
    activeItem?.button.focus();
    activeItem = null;
  });
  window.addEventListener('resize', () => {
    if (dialog.open) place();
  });

  return {
    open(item) {
      if (dialog.open) return;
      activeItem = item;
      savedScroll = window.scrollY;
      fill(item);
      MAP_INTERACTIONS.forEach((name) => map[name]?.disable());
      dialog.showModal();
      place();
    },
  };
}

function setUpMapButtons(map) {
  const fullscreen = shell.querySelector('[data-fullscreen]');
  const locate = shell.querySelector('[data-locate]');

  // iPhones have no fullscreen API for ordinary elements.
  if (document.fullscreenEnabled) {
    fullscreen.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else shell.requestFullscreen();
    });
    document.addEventListener('fullscreenchange', () => {
      const on = document.fullscreenElement === shell;
      fullscreen.setAttribute('aria-pressed', String(on));
      fullscreen.setAttribute('aria-label', on ? 'Exit fullscreen' : 'Enter fullscreen');
      map.invalidateSize();
    });
  } else {
    fullscreen.hidden = true;
  }

  if ('geolocation' in navigator) {
    let youAreHere;
    locate.addEventListener('click', () => {
      message.hidden = false;
      message.textContent = 'Finding your location';
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          message.hidden = true;
          const latlng = [coords.latitude, coords.longitude];
          youAreHere?.remove();
          youAreHere = L.circleMarker(latlng, { radius: 7, weight: 2, interactive: false }).addTo(map);
          map.setView(latlng, FIT_MAX_ZOOM, { animate: !prefersReducedMotion() });
        },
        () => {
          message.textContent = 'Your location isn’t available';
        },
      );
    });
  } else {
    locate.hidden = true;
  }
}

function init() {
  const map = createMap();
  const cardDialog = setUpDialog(map);
  const fields = JSON.parse(form.dataset.fields);
  const count = form.querySelector('[data-count]');
  const filterCount = form.querySelector('[data-filter-count]');
  const layer = L.layerGroup().addTo(map);

  const items = [...list.children].map((element) => {
    const data = JSON.parse(element.dataset.item);
    const button = pinTemplate.content.firstElementChild.cloneNode(true);
    const latlng = L.latLng(data.coordinates);
    const item = { ...data, element, button, latlng, marker: divMarker(latlng, button) };
    button.setAttribute('aria-label', `${data.title}, ${data.city}`);
    button.addEventListener('click', () => cardDialog.open(item));
    // Tabbing to a marker outside the view makes the browser scroll Leaflet's container,
    // which would knock every tile out of position.
    button.addEventListener('focus', () => {
      map.getContainer().scrollTo(0, 0);
      if (!dialog.open) map.panInside(item.marker.getLatLng(), { padding: [PIN_SIZE, PIN_SIZE] });
    });
    return item;
  });
  let visible = items;

  const clusterMarker = (group) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'map-cluster';
    button.textContent = group.length;
    button.setAttribute('aria-label', `${group.length} case studies, zoom in`);
    button.addEventListener('click', () => {
      const before = map.getZoom();
      map.fitBounds(L.latLngBounds(group.map((item) => item.latlng)), {
        padding: [FIT_PADDING * 2, FIT_PADDING * 2],
        maxZoom: MAX_ZOOM,
      });
      // Padding can stop the fit from zooming at all, which would strand the cluster.
      if (map.getBoundsZoom(L.latLngBounds(group.map((item) => item.latlng))) <= before) map.setZoom(before + 1);
    });
    const centre = group.reduce((sum, item) => [sum[0] + item.latlng.lat, sum[1] + item.latlng.lng], [0, 0]);
    return divMarker([centre[0] / group.length, centre[1] / group.length], button);
  };

  const drawMarkers = () => {
    const zoom = map.getZoom();
    layer.clearLayers();
    for (const group of groupByDistance(visible, map, zoom)) {
      if (group.length === 1) {
        group[0].marker.setLatLng(group[0].latlng);
        layer.addLayer(group[0].marker);
      } else if (zoom < MAX_ZOOM) {
        layer.addLayer(clusterMarker(group));
      } else {
        // Zooming can't separate cases at the same address, so they fan out around it.
        const centre = map.project(group[0].latlng, zoom);
        group.forEach((item, index) => {
          const angle = (2 * Math.PI * index) / group.length;
          const offset = L.point(Math.cos(angle) * FAN_RADIUS, Math.sin(angle) * FAN_RADIUS);
          item.marker.setLatLng(map.unproject(centre.add(offset), zoom));
          layer.addLayer(item.marker);
        });
      }
    }
  };

  const render = (state) => {
    visible = items.filter((item) => {
      const matches = matchesItem(item, state, fields);
      item.element.hidden = !matches;
      return matches;
    });
    count.textContent = `${visible.length} of ${items.length} case ${items.length === 1 ? 'study' : 'studies'}`;
    const active = activeFilterCount(state);
    filterCount.textContent = active > 0 ? `(${active})` : '';
    drawMarkers();
  };

  map.on('zoomend', drawMarkers);
  connectControls({ form, fields, onChange: render });
  connectDropdown(form.querySelector('[data-filter-menu]'));
  setUpMapButtons(map);

  const toFit = visible.length > 0 ? visible : items;
  if (toFit.length > 0) {
    map.fitBounds(L.latLngBounds(toFit.map((item) => item.latlng)), {
      padding: [FIT_PADDING, FIT_PADDING],
      maxZoom: FIT_MAX_ZOOM,
      animate: false,
    });
  }
}

// If the CDN can't be reached the page still works: the list of case studies shows instead.
if (L) init();
else document.documentElement.classList.add('map-unavailable');
