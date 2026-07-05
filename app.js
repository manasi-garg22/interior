// Simple Interior Cost Calculator - no backend, no login.

/** @type {{ roomType: string, name: string, quantity: number, unit: string, price: number }[]} */
let items = [];

const form = document.getElementById("itemForm");
const roomTypeInput = document.getElementById("roomType");
const roomInput = document.getElementById("roomName");
const qtyInput = document.getElementById("quantity");
const unitInput = document.getElementById("unit");
const priceInput = document.getElementById("price");
const itemsBody = document.getElementById("itemsBody");
const grandTotalEl = document.getElementById("grandTotal");
const emptyMsg = document.getElementById("emptyMsg");
const dateInput = document.getElementById("quoteDate");

// Default the date field to today.
dateInput.valueAsDate = new Date();

function formatCurrency(value) {
  return "\u20B9" + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function render() {
  itemsBody.innerHTML = "";
  let grandTotal = 0;

  items.forEach((item, index) => {
    const lineTotal = item.quantity * item.price;
    grandTotal += lineTotal;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${escapeHtml(item.roomType)}</td>
      <td>${escapeHtml(item.name)}</td>
      <td class="num">${item.quantity}</td>
      <td>${escapeHtml(item.unit)}</td>
      <td class="num">${formatCurrency(item.price)}</td>
      <td class="num">${formatCurrency(lineTotal)}</td>
      <td class="action-col">
        <button class="remove-btn" data-index="${index}">Remove</button>
      </td>
    `;
    itemsBody.appendChild(row);
  });

  grandTotalEl.textContent = formatCurrency(grandTotal);
  emptyMsg.style.display = items.length ? "none" : "block";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const roomType = roomTypeInput.value.trim();
  const name = roomInput.value.trim();
  const quantity = Number.parseFloat(qtyInput.value);
  const unit = unitInput.value.trim();
  const price = Number.parseFloat(priceInput.value);

  if (!roomType || !name || Number.isNaN(quantity) || !unit || Number.isNaN(price)) {
    return;
  }

  items.push({ roomType, name, quantity, unit, price });
  render();

  form.reset();
  qtyInput.value = "1";
  unitInput.value = "Nos";
  roomTypeInput.value = roomType; // keep same room to add multiple items faster
  roomInput.focus();
});

itemsBody.addEventListener("click", (e) => {
  if (e.target.classList.contains("remove-btn")) {
    const index = Number.parseInt(e.target.dataset.index, 10);
    items.splice(index, 1);
    render();
  }
});

document.getElementById("clearAll").addEventListener("click", () => {
  if (items.length && confirm("Remove all items?")) {
    items = [];
    render();
  }
});

document.getElementById("exportPdf").addEventListener("click", exportPdf);

function exportPdf() {
  if (!items.length) {
    alert("Add at least one item before exporting.");
    return;
  }

  const { jsPDF } = globalThis.jspdf;
  const doc = new jsPDF();

  const clientName = document.getElementById("clientName").value.trim() || "Interior Quotation";
  const dateStr = dateInput.value
    ? new Date(dateInput.value).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  // Title
  doc.setFontSize(18);
  doc.setTextColor(15, 76, 129);
  doc.text("Interior Cost Estimate", 14, 20);

  // Client info
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Client / Project: ${clientName}`, 14, 30);
  if (dateStr) {
    doc.text(`Date: ${dateStr}`, 14, 37);
  }

  // Table - grouped by room type with subtotals
  let grandTotal = 0;
  const body = [];

  const groups = {};
  const order = [];
  items.forEach((item) => {
    if (!groups[item.roomType]) {
      groups[item.roomType] = [];
      order.push(item.roomType);
    }
    groups[item.roomType].push(item);
  });

  order.forEach((roomType) => {
    // Group header row
    body.push([
      {
        content: roomType,
        colSpan: 6,
        styles: { fillColor: [222, 232, 243], textColor: [15, 76, 129], fontStyle: "bold" },
      },
    ]);

    let subtotal = 0;
    groups[roomType].forEach((item, i) => {
      const lineTotal = item.quantity * item.price;
      subtotal += lineTotal;
      grandTotal += lineTotal;
      body.push([
        i + 1,
        item.name,
        item.quantity,
        item.unit,
        formatPdfCurrency(item.price),
        formatPdfCurrency(lineTotal),
      ]);
    });

    // Subtotal row
    body.push([
      {
        content: `${roomType} Subtotal`,
        colSpan: 5,
        styles: { halign: "right", fontStyle: "bold", fillColor: [245, 247, 250] },
      },
      { content: formatPdfCurrency(subtotal), styles: { halign: "right", fontStyle: "bold", fillColor: [245, 247, 250] } },
    ]);
  });

  doc.autoTable({
    startY: dateStr ? 44 : 37,
    head: [["#", "Item", "Qty", "Units", "Unit Price", "Total"]],
    body: body,
    foot: [["", "", "", "", "Grand Total", formatPdfCurrency(grandTotal)]],
    theme: "grid",
    headStyles: { fillColor: [15, 76, 129] },
    footStyles: { fillColor: [230, 236, 245], textColor: [15, 76, 129], fontStyle: "bold" },
    columnStyles: {
      0: { halign: "center", cellWidth: 10 },
      2: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right" },
    },
  });

  const safeName = clientName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`${safeName || "interior_estimate"}.pdf`);
}

// jsPDF's default font doesn't render the rupee glyph reliably, so use "Rs."
function formatPdfCurrency(value) {
  return "Rs. " + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

render();
