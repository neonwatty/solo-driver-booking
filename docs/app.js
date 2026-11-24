"use strict";

const app = document.querySelector("#app");
const operator = "Cave Creek Car Service";
const driverName = "Alex Morgan";
const suggestedFare = 80;
const defaultTrip = {
  from: "Cave Creek",
  to: "Phoenix Sky Harbor",
  outboundDate: "2026-12-04",
  outboundTime: "06:30",
  returnDate: "2026-12-08",
  returnTime: "19:15",
  flight: "WN 1842",
  meeting: "Terminal 4, south curb",
  passengers: "2",
  luggage: "2",
  tripType: "round",
};

function initialState() {
  return {
    role: "rider",
    riderView: "invitation",
    driverView: "requests",
    invitation: { phone: "4805550142", status: "Pending" },
    trips: [],
    draft: { ...defaultTrip },
    riderTrip: null,
    driverTrip: null,
    selectedLeg: 0,
    phone: null,
    showQr: false,
  };
}

let state = initialState();

function escapeHtml(value) {
  const chars = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return String(value ?? "").replace(/[&<>"']/g, (char) => chars[char]);
}

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function dateLabel(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

function timeLabel(time) {
  return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit",
  });
}

function currentTrip() {
  return state.trips.find((trip) => trip.id === state[`${state.role}Trip`]);
}

function updateRiderView(trip, view) {
  if (state.phone === trip.phone && state.riderTrip === trip.id) {
    state.riderView = view;
  }
}

function button(label, action, style = "", data = "") {
  return `<button type="button" class="button ${style}" data-action="${action}" ${data}>${label}</button>`;
}

function field(label, name, value = "", type = "text", attributes = "required") {
  return `<label class="field">${label}<input type="${type}" name="${name}" value="${escapeHtml(value)}" ${attributes}></label>`;
}

function hero(title, description = "", className = "") {
  return `<section class="hero ${className}">
    <div class="hero-row"><span class="mark" aria-hidden="true">CC</span><span>${operator}</span></div>
    <h1>${title}</h1>${description ? `<p>${description}</p>` : ""}
  </section>`;
}

function contents(html) {
  return `<div class="contents">${html}</div>`;
}

function status(label, style = "") {
  return `<span class="status ${style}">${label}</span>`;
}

function identity() {
  return `<div class="identity"><span class="avatar" aria-hidden="true">AM</span>
    <div><h2>${driverName}</h2><p class="muted">Your private driver</p></div>
  </div>`;
}

function nav(items, selected) {
  return `<nav class="nav" aria-label="${state.role === "rider" ? "Rider" : "Driver"} pages">
    ${items.map(([label, action]) => `<button type="button" data-action="${action}" ${action === selected ? 'aria-current="page"' : ""}>${label}</button>`).join("")}
  </nav>`;
}

function riderNav(selected) {
  return nav([["Request", "booking"], ["My trips", "my-trips"], ["My Drivers", "my-drivers"]], selected);
}

function driverNav(selected) {
  const count = state.trips.filter((trip) => trip.status === "pending").length;
  return nav([["Clients", "clients"], [count ? `Requests (${count})` : "Requests", "requests"], ["Upcoming", "upcoming"]], selected);
}

function renderInvitation() {
  const lastFour = state.invitation.phone.slice(-4);
  return hero("Your driver invited you.", "Book a scheduled ride with the driver you already know.", "hero-invite") + contents(`
    <section class="card">${identity()}</section>
    <form id="verify" class="card stack">
      <div class="stack tight"><h2>Verify your phone</h2><p class="muted">Invitation sent to a number ending in ${escapeHtml(lastFour)}.</p></div>
      ${field("Verification code", "code", "", "text", 'required inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" aria-describedby="demo-code"')}
      <p class="muted" id="demo-code"><small>Use <strong>123456</strong> for this demo.</small></p>
      <p class="notice error" id="verification-error" role="alert" hidden>Enter the six-digit demo code.</p>
      <button type="submit" class="button">Verify and continue</button>
    </form>`);
}

function renderBooking() {
  const d = state.draft;
  const round = d.tripType === "round";
  return hero(`Book with ${driverName.split(" ")[0]}`, "Choose your pickups and send a request to your driver.") + riderNav("booking") + contents(`
    <form class="stack" id="ride-request">
      <fieldset class="card">
        <legend class="label">Trip type</legend>
        <div class="segmented">
          <label><input type="radio" name="tripType" value="one" ${round ? "" : "checked"}><span>One way</span></label>
          <label><input type="radio" name="tripType" value="round" ${round ? "checked" : ""}><span>Round trip</span></label>
        </div>
      </fieldset>
      <section class="card stack"><h2>Outbound pickup</h2>
        ${field("Pickup", "from", d.from, "text", 'required maxlength="100"')}
        ${field("Destination", "to", d.to, "text", 'required maxlength="100"')}
        <div class="split">${field("Date", "outboundDate", d.outboundDate, "date")}${field("Pickup time", "outboundTime", d.outboundTime, "time")}</div>
      </section>
      <fieldset class="card stack" id="return-fields" ${round ? "" : "hidden disabled"}>
        <legend class="label">Return pickup</legend>
        <p class="muted">The pickup and destination are reversed.</p>
        <div class="split">${field("Return date", "returnDate", d.returnDate, "date")}${field("Return pickup time", "returnTime", d.returnTime, "time")}</div>
        <div class="split">${field("Flight number", "flight", d.flight, "text", 'maxlength="16"')}${field("Meeting point", "meeting", d.meeting, "text", 'maxlength="100"')}</div>
      </fieldset>
      <section class="card stack"><h2>Passengers and luggage</h2>
        <div class="split">${field("Passengers", "passengers", d.passengers, "number", 'required min="1" max="4"')}${field("Bags", "luggage", d.luggage, "number", 'required min="0" max="4"')}</div>
      </section>
      <button type="submit" class="button">Send request</button>
    </form>`);
}

function legTitle(index) {
  return index === 0 ? "Outbound" : "Return";
}

function legDetails(leg, index, showFare = false) {
  return `<section class="card stack tight">
    <div class="heading-row"><h2>${legTitle(index)}</h2>${leg.status ? status(leg.status, leg.status === "Cancelled" ? "error" : "") : ""}</div>
    <p><strong>${dateLabel(leg.date)} · ${timeLabel(leg.time)}</strong></p>
    <div class="route"><p>${escapeHtml(leg.from)}</p><p>${escapeHtml(leg.to)}</p></div>
    ${leg.flight ? `<p class="muted"><small>Flight ${escapeHtml(leg.flight)}</small></p>` : ""}
    ${leg.meeting ? `<p class="muted"><small>Meet at ${escapeHtml(leg.meeting)}</small></p>` : ""}
    ${showFare ? `<p class="detail-row"><span class="muted">Fare</span><strong>${money(leg.fare)}</strong></p>` : ""}
  </section>`;
}

function fareTotal(trip) {
  return trip.legs.reduce((cents, leg) => cents + Math.round(leg.fare * 100), 0) / 100;
}

function tripTitle(trip) {
  return trip.legs.length === 2 ? "Airport round trip" : "One-way ride";
}

function renderTrip() {
  const trip = currentTrip();
  if (!trip) return renderMyTrips();
  const headings = {
    pending: ["Awaiting driver approval", "Your driver will review your request and send a quote."],
    declined: ["Request declined", "You can choose new pickup times and send another request."],
    quoted: ["Quote ready", `Review your pickups and pay ${operator} to confirm.`],
    confirmed: [state.riderView === "receipt" ? "Your ride is confirmed." : "Manage trip", ""],
  };
  const [title, description] = headings[trip.status];
  const legs = trip.legs.map((leg, index) => legDetails(leg, index, trip.status === "quoted")).join("");
  return hero(title, description) + riderNav("my-trips") + contents(
    trip.status === "quoted" ? renderCheckout(trip, legs) :
      trip.status === "confirmed" ? renderConfirmed(trip, legs) :
        `${legs}${trip.status === "declined" ? button("Start a fresh request", "book-again") : ""}`,
  );
}

function renderCheckout(trip, legs) {
  const unavailable = trip.paymentIssue === "expired" || trip.paymentIssue === "unavailable";
  const issueLabel = trip.paymentIssue === "expired" ? "Quote expired" : "Pickup no longer available";
  const issue = unavailable
    ? `<div class="notice warn" role="status"><strong>${issueLabel}</strong><p>Ask your driver to confirm the price and pickup times again.</p></div>`
    : trip.paymentIssue === "failed" ? `<div class="notice error" role="alert"><strong>Payment failed</strong><p>Your pickups are awaiting payment. You can try again.</p></div>` : "";
  const action = unavailable ? button("Request an updated quote", "request-requote")
    : trip.paymentIssue === "failed" ? button("Try again", "retry-payment")
      : button(`Pay ${money(fareTotal(trip))}`, "pay");
  return `${issue}${legs}
    <section class="card stack tight"><h2>Payment summary</h2>
      <p class="muted">${operator}</p>
      <div class="detail-row fare-total"><strong>Total</strong><strong>${money(fareTotal(trip))}</strong></div>
      <p class="muted"><small>If your driver cancels a leg, that leg’s fare is refunded.</small></p>
    </section>
    ${action}
    <details class="test-controls"><summary>Simulate a payment issue</summary><div class="actions">
      ${button("Simulate failed payment", "fail-payment", "secondary")}
      ${button("Simulate expired quote", "expire-quote", "secondary")}
      ${button("Simulate unavailable pickup", "unavailable-pickup", "secondary")}
    </div></details>`;
}

function renderConfirmed(trip, legs) {
  const returning = trip.legs[1];
  const receipt = `<section class="card stack tight"><h2>Receipt</h2>
      <p class="muted">${operator}</p>
      <div class="detail-row fare-total"><strong>Paid</strong><strong>${money(fareTotal(trip))}</strong></div>
      ${trip.refund ? `<div class="detail-row"><span>Return fare refunded</span><strong>${money(trip.refund)}</strong></div>` : ""}
    </section>`;
  const proposal = returning?.proposal ? `<div class="notice warn" role="status">
    <strong>Your driver proposed a new return time</strong>
    <p>Confirmed pickup at ${timeLabel(returning.time)}. Proposed pickup at ${timeLabel(returning.proposal)}.</p>
    ${button("Accept new time", "accept-time", "secondary")}</div>` : "";
  return `${proposal}${legs}${receipt}
    ${state.riderView === "receipt" ? button("Manage trip", "manage") : button("Book again", "book-again")}`;
}

function renderMyTrips() {
  const descriptions = { pending: "Awaiting driver approval", declined: "Request declined", quoted: "Quote ready", confirmed: "Confirmed" };
  const riderTrips = state.trips.filter((trip) => trip.phone === state.phone);
  return hero("My trips") + riderNav("my-trips") + contents(riderTrips.length
    ? riderTrips.reverse().map((trip) => `<section class="card stack tight">
        <div class="heading-row"><h2>${tripTitle(trip)}</h2>${status(descriptions[trip.status], trip.status === "declined" ? "error" : trip.status === "pending" ? "warn" : "")}</div>
        <p class="muted">${dateLabel(trip.legs[0].date)} · ${escapeHtml(trip.legs[0].from)}</p>
        ${button("View trip", "rider-trip", "secondary", `data-id="${trip.id}"`)}
      </section>`).join("")
    : `<section class="card empty"><p class="muted">Your requests and bookings will appear here.</p></section>${button("Request a ride", "booking")}`);
}

function renderMyDrivers() {
  return hero("My Drivers") + riderNav("my-drivers") + contents(`
    <section class="card stack">${identity()}${button("Request a ride", "booking")}</section>`);
}

function renderClients() {
  const link = new URL(window.location.href);
  link.hash = "demo-invite";
  const url = escapeHtml(link.href);
  const qr = state.showQr ? window.qrcode(0, "M") : null;
  if (qr) {
    qr.addData(link.href);
    qr.make();
  }
  return hero("Clients", "Invite a rider to book directly with you.") + driverNav("clients") + contents(`
    <form id="invite-client" class="card stack">
      <h2>Invite client</h2>
      ${field("Rider phone number", "phone", "", "tel", 'required autocomplete="tel" inputmode="tel" maxlength="22"')}
      <button class="button" type="submit">Create invitation</button>
    </form>
    <section class="card stack">
      <div class="heading-row"><h2>Invitation</h2>${status(state.invitation.status, state.invitation.status === "Pending" ? "warn" : "")}</div>
      <p class="muted">Phone ending in ${escapeHtml(state.invitation.phone.slice(-4))}</p>
      ${field("Demo invitation link", "link", url, "text", "readonly")}
      <div class="actions">${button("Open as rider", "open-invitation")}${button(state.showQr ? "Hide QR" : "Show demo QR", "toggle-qr", "secondary")}</div>
      ${qr ? `<div class="qr">${qr.createImgTag(5, 18, "QR code for the demo invitation")}
        <p class="muted"><small>The QR opens the sample invitation. Use Open as rider to preview the number entered above.</small></p></div>` : ""}
    </section>`);
}

function scheduleHtml(excludeId = 0) {
  const legs = state.trips.filter((trip) => trip.id !== excludeId && trip.status === "confirmed")
    .flatMap((trip) => trip.legs.filter((leg) => leg.status !== "Cancelled"))
    .sort((left, right) => `${left.date}${left.time}`.localeCompare(`${right.date}${right.time}`));
  return `<section class="card stack tight"><h2>Upcoming pickups</h2>
    ${legs.length ? legs.map((leg) => `<p class="muted">${dateLabel(leg.date)} · ${timeLabel(leg.time)} · ${escapeHtml(leg.from)}</p>`).join("")
      : '<p class="muted">Your schedule has no other confirmed pickups.</p>'}</section>`;
}

function renderRequests() {
  const requests = state.trips.filter((trip) => trip.status === "pending" || trip.status === "quoted");
  return hero("Requests", "Review ride requests and send quotes.") + driverNav("requests") + contents(
    requests.length ? requests.map((trip) => `<section class="card stack tight">
      <div class="heading-row"><h2>${tripTitle(trip)}</h2>${status(trip.status === "pending" ? "New request" : "Quote sent", "warn")}</div>
      <p class="muted">${dateLabel(trip.legs[0].date)} · ${escapeHtml(trip.legs[0].from)}</p>
      ${trip.status === "pending" ? button("Review request", "review-request", "secondary", `data-id="${trip.id}"`) : ""}
    </section>`).join("")
      : '<section class="card empty"><p class="muted">New requests from invited riders will appear here.</p></section>',
  );
}

function renderDriverQuote() {
  const trip = currentTrip();
  if (trip?.status !== "pending") return renderRequests();
  return hero("Review request", `${trip.passengers} passengers · ${trip.luggage} bags`) + driverNav("requests") + contents(`
    ${trip.legs.map((leg, index) => legDetails(leg, index)).join("")}
    ${scheduleHtml(trip.id)}
    <form id="driver-quote" class="card stack"><h2>Set the fare</h2>
      ${trip.legs.map((leg, index) => field(`${legTitle(index)} fare in dollars`, `fare${index}`, leg.fare, "number", 'required min="1" max="9999" step="0.01"')).join("")}
      <button type="submit" class="button">Approve and send quote</button>
      ${button("Decline", "decline", "secondary")}
    </form>`);
}

function renderUpcoming() {
  const rows = state.trips.filter((trip) => trip.status === "confirmed")
    .flatMap((trip) => trip.legs.map((leg, index) => ({ trip, leg, index })));
  rows.sort((left, right) => `${left.leg.date}${left.leg.time}`.localeCompare(`${right.leg.date}${right.leg.time}`));
  return hero("Upcoming", "Manage each confirmed pickup on its own.") + driverNav("upcoming") + contents(
    rows.length ? rows.map(({ trip, leg, index }) => `<div class="stack tight">
      ${legDetails(leg, index)}
      ${leg.status !== "Cancelled" ? button(`Open ${legTitle(index).toLowerCase()} pickup`, "open-leg", "secondary", `data-id="${trip.id}" data-index="${index}"`) : ""}
    </div>`).join("") : '<section class="card empty"><p class="muted">Confirmed rides will appear here after payment.</p></section>',
  );
}

function renderDriverLeg() {
  const trip = currentTrip();
  const index = state.selectedLeg;
  const leg = trip?.legs[index];
  if (!leg) return renderUpcoming();
  const canUpdate = leg.status !== "Cancelled" && leg.status !== "Driver arrived";
  const canChangeReturn = index === 1 && leg.status === "Confirmed";
  const statusAction = leg.status === "Driver en route" ? ["Arrived", "arrived"] : ["En route", "en-route"];
  const nextTime = leg.proposal || (leg.time === "20:30" ? "21:00" : "20:30");
  const change = canChangeReturn ? `<form id="return-change" class="card stack">
    <h2>Propose a new return time</h2>
    ${field("Proposed pickup time", "time", nextTime, "time")}
    <button type="submit" class="button">Propose new time</button>
  </form>${button("Cancel return leg", "review-cancel", "danger")}` : "";
  const cancel = state.driverView === "cancel" && canChangeReturn ? `<section class="notice error stack">
    <h2>Cancel the return?</h2>
    <p>Refund ${money(leg.fare)} to the rider. This applies to the return pickup on ${dateLabel(leg.date)} at ${timeLabel(leg.time)}.</p>
    ${button(`Confirm cancellation and refund ${money(leg.fare)}`, "confirm-cancel", "danger")}
    ${button("Keep return pickup", "keep-return", "secondary")}
  </section>` : "";
  return hero(`${legTitle(index)} pickup`) + driverNav("upcoming") + contents(`
    ${legDetails(leg, index)}
    ${leg.proposal ? `<div class="notice warn" role="status"><strong>Waiting for rider</strong><p>Proposed ${timeLabel(leg.proposal)}. Confirmed at ${timeLabel(leg.time)}.</p></div>` : ""}
    ${cancel || `${canUpdate ? button(...statusAction, "secondary") : ""}${change}`}
    ${button("Back to upcoming", "upcoming", "text")}`);
}

function render(moveFocus = true) {
  if (state.role === "rider") {
    if (state.invitation.status === "Pending") app.innerHTML = renderInvitation();
    else {
      const riderScreens = { booking: renderBooking, "my-trips": renderMyTrips, "my-drivers": renderMyDrivers };
      app.innerHTML = (riderScreens[state.riderView] || renderTrip)();
    }
  } else {
    const driverScreens = { clients: renderClients, requests: renderRequests, quote: renderDriverQuote,
      upcoming: renderUpcoming, leg: renderDriverLeg, cancel: renderDriverLeg };
    app.innerHTML = driverScreens[state.driverView]();
  }
  document.querySelector('[data-action="rider"]').setAttribute("aria-pressed", state.role === "rider");
  document.querySelector('[data-action="driver"]').setAttribute("aria-pressed", state.role === "driver");
  if (moveFocus) {
    app.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}

function submitRequest(form) {
  const data = Object.fromEntries(new FormData(form));
  if (data.tripType === "round" && `${data.returnDate}${data.returnTime}` <= `${data.outboundDate}${data.outboundTime}`) {
    const input = form.elements.returnTime;
    input.setCustomValidity("The return pickup must be after the outbound pickup.");
    input.reportValidity();
    return false;
  }

  const legs = [{ from: data.from, to: data.to, date: data.outboundDate, time: data.outboundTime, fare: suggestedFare }];
  if (data.tripType === "round") {
    legs.push({ from: data.to, to: data.from, date: data.returnDate, time: data.returnTime,
      flight: data.flight, meeting: data.meeting, fare: suggestedFare });
  }
  const trip = { id: state.trips.length + 1, status: "pending", phone: state.phone,
    legs, passengers: data.passengers, luggage: data.luggage };
  state.trips.push(trip);
  state.riderTrip = trip.id;
  state.riderView = "trip";
  state.driverView = "requests";
  return true;
}

function bookAgain(trip) {
  const [outbound, returning] = trip.legs;
  state.draft = { ...defaultTrip, from: outbound.from, to: outbound.to, passengers: trip.passengers,
    luggage: trip.luggage, tripType: returning ? "round" : "one", outboundDate: "", outboundTime: "",
    returnDate: "", returnTime: "", flight: "", meeting: returning?.meeting || "" };
  state.riderView = "booking";
}

document.addEventListener("change", (event) => {
  if (event.target.name !== "tripType") return;
  const fields = document.querySelector("#return-fields");
  fields.hidden = event.target.value === "one";
  fields.disabled = fields.hidden;
  fields.querySelector('[name="returnTime"]').setCustomValidity("");
});

document.addEventListener("input", (event) => {
  if (!event.target.form) return;
  if (event.target.name === "phone") event.target.setCustomValidity("");
  const returnTime = event.target.form.elements.returnTime;
  if (returnTime) returnTime.setCustomValidity("");
  const code = document.querySelector("#verification-error");
  if (event.target.name === "code" && code) code.hidden = true;
});

document.addEventListener("submit", (event) => {
  const form = event.target;
  event.preventDefault();
  const data = new FormData(form);
  const trip = currentTrip();
  switch (form.id) {
    case "verify":
      if (data.get("code") !== "123456") {
        document.querySelector("#verification-error").hidden = false;
        return;
      }
      state.invitation.status = "Accepted";
      state.phone = state.invitation.phone;
      state.riderView = "booking";
      break;
    case "ride-request":
      if (!submitRequest(form)) return;
      break;
    case "invite-client": {
      const phone = data.get("phone").replace(/\D/g, "");
      if (phone.length < 7 || phone.length > 15) {
        form.elements.phone.setCustomValidity("Enter a valid phone number.");
        form.elements.phone.reportValidity();
        return;
      }
      state.invitation = { phone, status: "Pending" };
      state.phone = null;
      state.riderTrip = null;
      state.draft = { ...defaultTrip };
      state.riderView = "invitation";
      state.showQr = false;
      break;
    }
    case "driver-quote":
      trip.legs.forEach((leg, index) => { leg.fare = Number(data.get(`fare${index}`)); });
      trip.status = "quoted";
      delete trip.paymentIssue;
      state.driverView = "requests";
      updateRiderView(trip, "trip");
      break;
    case "return-change":
      trip.legs[1].proposal = data.get("time");
      updateRiderView(trip, "manage");
      break;
    default:
      return;
  }
  render();
});

document.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-action]");
  if (!target) return;
  const action = target.dataset.action;
  if (target.dataset.id) state[`${state.role}Trip`] = Number(target.dataset.id);
  if (target.dataset.index) state.selectedLeg = Number(target.dataset.index);
  const trip = currentTrip();
  if (["booking", "my-drivers", "my-trips"].includes(action)) state.riderView = action;
  else if (["clients", "requests", "upcoming"].includes(action)) state.driverView = action;
  else switch (action) {
    case "rider":
    case "driver":
      state.role = action;
      break;
    case "restart":
      state = initialState();
      break;
    case "open-invitation":
      state.role = "rider";
      break;
    case "toggle-qr":
      state.showQr = !state.showQr;
      break;
    case "rider-trip":
      state.riderView = trip.status === "confirmed" ? "manage" : "trip";
      break;
    case "review-request":
      state.driverView = "quote";
      break;
    case "decline":
      trip.status = "declined";
      state.driverView = "requests";
      break;
    case "fail-payment":
      trip.paymentIssue = "failed";
      break;
    case "retry-payment":
      delete trip.paymentIssue;
      break;
    case "expire-quote":
      trip.paymentIssue = "expired";
      break;
    case "unavailable-pickup":
      trip.paymentIssue = "unavailable";
      break;
    case "request-requote":
      trip.status = "pending";
      delete trip.paymentIssue;
      state.driverView = "requests";
      break;
    case "pay":
      trip.status = "confirmed";
      trip.legs.forEach((leg) => { leg.status = "Confirmed"; });
      state.riderView = "receipt";
      state.driverView = "upcoming";
      break;
    case "manage":
      state.riderView = "manage";
      break;
    case "book-again":
      bookAgain(trip);
      break;
    case "open-leg":
    case "keep-return":
      state.driverView = "leg";
      break;
    case "accept-time":
      trip.legs[1].time = trip.legs[1].proposal;
      delete trip.legs[1].proposal;
      break;
    case "review-cancel":
      state.driverView = "cancel";
      break;
    case "confirm-cancel":
      trip.legs[1].status = "Cancelled";
      delete trip.legs[1].proposal;
      trip.refund = trip.legs[1].fare;
      state.driverView = "upcoming";
      updateRiderView(trip, "manage");
      break;
    case "en-route":
    case "arrived":
      trip.legs[state.selectedLeg].status = action === "en-route" ? "Driver en route" : "Driver arrived";
      updateRiderView(trip, "manage");
      break;
    default:
      return;
  }
  render();
});

render(false);
