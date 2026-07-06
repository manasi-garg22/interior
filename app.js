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
const remarksInput = document.getElementById("remarks");

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
  const remarks = remarksInput.value.trim();

  // Brand header
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand mark
  doc.setFillColor(15, 76, 129);
  doc.roundedRect(14, 12, 12, 12, 2, 2, "F");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.setFont(undefined, "bold");
  doc.text("OM", 20, 19.5, { align: "center" });

  // Brand name + tagline
  doc.setFontSize(20);
  doc.setTextColor(15, 76, 129);
  doc.setFont(undefined, "bold");
  doc.text("OM Arch Designs", 29, 18);
  doc.setFontSize(8.5);
  doc.setTextColor(120, 120, 120);
  doc.setFont(undefined, "normal");
  doc.text("ARCHITECTURE & INTERIOR SOLUTIONS", 29, 23);

  // Divider line
  doc.setDrawColor(15, 76, 129);
  doc.setLineWidth(0.5);
  doc.line(14, 27, pageWidth - 14, 27);

  // Document title (smaller)
  doc.setFontSize(12);
  doc.setTextColor(55, 65, 81);
  doc.setFont(undefined, "bold");
  doc.text("Interior Cost Estimate", 14, 35);
  doc.setFont(undefined, "normal");

  // Client info
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text(`Client / Project: ${clientName}`, 14, 43);
  if (dateStr) {
    doc.text(`Date: ${dateStr}`, 14, 50);
  }

  let tableStartY = dateStr ? 57 : 50;

  if (remarks) {
    const remarksTopY = tableStartY;
    const remarksLines = doc.splitTextToSize(remarks, pageWidth - 42);

    doc.setFont(undefined, "bold");
    doc.text("Remarks:", 14, remarksTopY);
    doc.setFont(undefined, "normal");
    doc.text(remarksLines, 34, remarksTopY);

    tableStartY = remarksTopY + remarksLines.length * 6 + 6;
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
    startY: tableStartY,
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

  // ----- Terms, specifications and conditions -----
  addTermsAndConditions(doc);

  const safeName = clientName.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
  doc.save(`${safeName || "interior_estimate"}.pdf`);
}

// Appends payment terms, specifications, exclusions and T&C to the PDF.
function addTermsAndConditions(doc) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const marginBottom = 18;
  const maxWidth = pageWidth - marginX * 2;

  let y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 50;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - marginBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const sectionHeading = (text) => {
    ensureSpace(14);
    doc.setFontSize(13);
    doc.setTextColor(15, 76, 129);
    doc.setFont(undefined, "bold");
    doc.text(text, marginX, y);
    y += 3;
    doc.setDrawColor(15, 76, 129);
    doc.setLineWidth(0.4);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 6;
  };

  const subHeading = (text) => {
    ensureSpace(9);
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, "bold");
    doc.text(text, marginX, y);
    y += 6;
  };

  const bullets = (lines) => {
    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    doc.setFont(undefined, "normal");
    lines.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, maxWidth - 6);
      ensureSpace(wrapped.length * 5 + 1);
      doc.text("\u2022", marginX, y);
      doc.text(wrapped, marginX + 5, y);
      y += wrapped.length * 5 + 1.5;
    });
    y += 3;
  };

  // Payment Terms (as a small table)
  sectionHeading("Payment Terms");
  doc.autoTable({
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [["Stage", "Percentage"]],
    body: [
      ["Advance Payment", "10%"],
      ["Material Procurement", "30%"],
      ["Structure Completion", "20%"],
      ["Laminate Work", "20%"],
      ["Handle & Lock Installation", "15%"],
      ["Final Finishing & Handover", "5%"],
    ],
    theme: "grid",
    headStyles: { fillColor: [15, 76, 129] },
    columnStyles: { 1: { halign: "right", cellWidth: 40 } },
    styles: { fontSize: 10 },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Furniture Specifications
  sectionHeading("Furniture Specifications");
  subHeading("Kitchen");
  bullets([
    "Waterproof Plywood (710 Grade) - Rs. 80-85 Range",
    "Tandem Basket - Eigos / Godrej (if required)",
  ]);
  subHeading("Other Furniture");
  bullets([
    "MR Plywood 303 - Rs. 60-65 Range",
    "Inner Liner (Off White) - Rs. 450 Range",
    "Laminate - Rs. 1800 Range",
    "Acrylic Finish (if required) - Rs. 3800 Range",
    "Cupboard Configuration: 1 Cupboard + 4 Drawers",
    "Additional Drawer - Rs. 2000 per Drawer",
    "Handles - Rs. 200-250 Range",
    "Sofa Fabric - Rs. 450 Range",
    "Sofa Material - Refresh Prime",
    "Soft Close Hinges - Rs. 90 per Set",
    "Door Lock (Jali Door) - Rs. 1500 Range",
  ]);
  subHeading("Colour");
  bullets([
    "Interior only (in above specified work area) - Asian Royale / Berger Paints",
  ]);
  subHeading("Electrical Accessories");
  bullets([
    "Wiring: Anchor / RR",
    "Lights: Panasonic (Approx. Rs. 400 Range)",
    "Switches: Anchor / Fybros",
  ]);

  // Exclusions
  sectionHeading("Exclusions");
  bullets([
    "AC electrical work is not included.",
    "Wall texture and rustic finishes will be charged extra.",
    "Deco / PU / Polish finishes will be charged extra.",
    "Decorative items such as curtains, fans, mattresses, hanging lights, etc. are not included.",
    "Any work or materials not specifically mentioned above will be charged separately upon mutual agreement.",
  ]);

  // Terms & Conditions
  sectionHeading("Terms & Conditions");
  bullets([
    "All dimensions are approximate and subject to site requirements.",
    "Final measurements and billing will be completed after project completion.",
    "Electricity points required for use during execution shall be provided by the client at no additional cost.",
    "The contractor shall not be responsible for delays caused by payment issues or unavoidable circumstances.",
  ]);
}

// jsPDF's default font doesn't render the rupee glyph reliably, so use "Rs."
function formatPdfCurrency(value) {
  return "Rs. " + value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

render();
