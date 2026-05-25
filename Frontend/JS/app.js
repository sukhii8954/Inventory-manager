/**
Applying frontend logic here
 *
 * Responsibilities:
 *  1. Dynamically add/remove item rows in the purchase form
 *  2. Validate all inputs before submission
 *  3. Save data to localStorage (will be swapped for API calls when backend is ready)
 *  4. Render inventory table with search + filter
 *  5. Handle Edit (modal) and Delete (confirm modal) operations
 */

const API_URL = "http://localhost:5000/api/items";
const ITEM_TYPES = ["Electronics", "Furniture", "Clothing", "Stationery", "Kitchen", "Sports", "Other"];

const ITEM_SUGGESTIONS = {
  Electronics:  ["Laptop", "Monitor", "Keyboard", "Mouse", "Printer", "Scanner", "Webcam", "Headphones", "Speaker", "Tablet", "Phone", "Charger", "USB Hub", "Hard Drive", "SSD"],
  Furniture:    ["Office Chair", "Desk", "Bookshelf", "Cabinet", "Table", "Sofa", "Wardrobe", "Bed Frame", "Drawer", "Shelf Unit"],
  Clothing:     ["T-Shirt", "Jeans", "Jacket", "Shoes", "Socks", "Sweater", "Shorts", "Cap", "Belt", "Gloves"],
  Stationery:   ["Pen", "Pencil", "Notebook", "Stapler", "Scissors", "Tape", "Marker", "Highlighter", "Folder", "Binder"],
  Kitchen:      ["Microwave", "Kettle", "Toaster", "Blender", "Knife Set", "Cutting Board", "Plates", "Bowls", "Cups", "Pan"],
  Sports:       ["Football", "Basketball", "Tennis Racket", "Yoga Mat", "Dumbbells", "Jump Rope", "Cycling Helmet", "Water Bottle", "Gym Bag", "Resistance Bands"],
  Other:        ["Box", "Bag", "Container", "Package", "Miscellaneous Item"]
};
// let inventoryRecords = loadFromStorage();

// Here It tracks which record index is being targeted by the delete modal
let pendingDeleteIndex = null;


// 1.  DOM REFERENCES

const purchaseForm = document.getElementById("purchaseForm");
const purchaseIdInput = document.getElementById("purchaseId");
const purchaseDateInput = document.getElementById("purchaseDate");
const itemsContainer = document.getElementById("itemsContainer");
const addItemBtn = document.getElementById("addItemBtn");
const resetBtn = document.getElementById("resetBtn");
const submitBtn = document.getElementById("submitBtn");

const tableBody = document.getElementById("tableBody");
const searchInput = document.getElementById("searchInput");
const filterType = document.getElementById("filterType");

const editModal = document.getElementById("editModal");
const deleteModal = document.getElementById("deleteModal");

// tracks which item is being deleted
let pendingDeleteId = null;
// holds all records fetched from backend
let inventoryRecords = [];

// It set today's date as default
purchaseDateInput.valueAsDate = new Date();

// Auto-generate Purchase ID like PO-2026-001, PO-2026-002...
function generatePurchaseId() {
  const year = new Date().getFullYear();
  const count = inventoryRecords.length + 1;
  const padded = String(count).padStart(3, "0");
  purchaseIdInput.value = `PO-${year}-${padded}`;
}


// 2.  ITEM ROW BUILDER

/**
 * createItemRow(index)
 * Building one item row block with Name, Type, Date, Stock fields.
 * index --> used to label the row ("Item #1", "Item #2", …)
 */
function createItemRow(index) {
  const div = document.createElement("div");
  div.className = "item-row";
  div.dataset.itemIndex = index;

  const typeOptions = ITEM_TYPES
    .map(t => `<option value="${t}">${t}</option>`)
    .join("");

  div.innerHTML = `
    <div class="item-row-header">
      <span class="item-number">Item #${index}</span>
      ${index > 1
        ? `<button type="button" class="btn-remove-item" onclick="removeItemRow(this)">✕ Remove</button>`
        : ""}
    </div>
    <div class="form-row">
      <div class="form-group" style="position:relative">
        <label>Item Name <span class="req">*</span></label>
        <input type="text" name="itemName" placeholder="e.g. Office Chair" autocomplete="off" />
        <div class="suggestions-box" style="display:none"></div>
        <span class="error-msg"></span>
      </div>
      <div class="form-group">
        <label>Item Type <span class="req">*</span></label>
        <select name="itemType">
          <option value="" disabled selected>Select type…</option>
          ${typeOptions}
        </select>
        <span class="error-msg"></span>
      </div>
    </div>
    <div class="form-row" style="margin-top:12px">
      <div class="form-group checkbox-group" style="justify-content:center;padding-top:22px">
        <label class="checkbox-label">
          <input type="checkbox" name="inStock" checked />
          <span class="custom-checkbox"></span>
          In Stock
        </label>
      </div>
    </div>
  `;

  // wire up suggestion logic after building HTML
  const nameInput    = div.querySelector("[name='itemName']");
  const typeSelect   = div.querySelector("[name='itemType']");
  const suggestBox   = div.querySelector(".suggestions-box");

  // show suggestions when typing in name field
  nameInput.addEventListener("input", () => {
    const query       = nameInput.value.trim().toLowerCase();
    const type        = typeSelect.value;
    const suggestions = ITEM_SUGGESTIONS[type] || Object.values(ITEM_SUGGESTIONS).flat();

    const matches = suggestions.filter(s => s.toLowerCase().includes(query));

    if (!query || matches.length === 0) {
      suggestBox.style.display = "none";
      return;
    }

    suggestBox.innerHTML = matches
      .map(s => `<div class="suggestion-item">${s}</div>`)
      .join("");
    suggestBox.style.display = "block";
  });

  // when type changes, clear suggestions
  typeSelect.addEventListener("change", () => {
    suggestBox.style.display = "none";
    nameInput.value = "";
    nameInput.focus();
  });

  // click a suggestion to fill the input
  suggestBox.addEventListener("click", (e) => {
    if (e.target.classList.contains("suggestion-item")) {
      nameInput.value        = e.target.textContent;
      suggestBox.style.display = "none";
    }
  });

  // hide suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!div.contains(e.target)) {
      suggestBox.style.display = "none";
    }
  });

  return div;
}


/** Here the logic is to remove a specific item row (only shown when index > 1) */
function removeItemRow(btn) {
  const row = btn.closest(".item-row");
  row.style.animation = "none";
  row.style.opacity = "0";
  row.style.transform = "scale(0.97)";
  row.style.transition = "0.15s ease";
  setTimeout(() => {
    row.remove();
    renumberRows();
  }, 150);
}

/** After removal, here it will re-label rows as Item #1, #2, … */
function renumberRows() {
  document.querySelectorAll(".item-row").forEach((row, i) => {
    row.dataset.itemIndex = i + 1;
    const label = row.querySelector(".item-number");
    if (label) label.textContent = `Item #${i + 1}`;
  });
}


// Seed with first row on page load
generatePurchaseId();

/** Public helper called by the "+ Add Item" button */
function addItemRow() {
  const current = itemsContainer.querySelectorAll(".item-row").length;
  itemsContainer.appendChild(createItemRow(current + 1));
}

addItemRow();
addItemBtn.addEventListener("click", addItemRow);

// 3.  VALIDATION HELPERS

/**
 * showError(input, msg)
 * Highlights an input in red and displays a message below it.
 */
function showError(input, msg) {
  input.style.borderColor = "var(--danger)";
  const errEl = input.parentElement.querySelector(".error-msg");
  if (errEl) errEl.textContent = msg;
}

/**
 * clearError(input)
 * Removes the red border and clears the error message.
 */
function clearError(input) {
  input.style.borderColor = "";
  const errEl = input.parentElement.querySelector(".error-msg");
  if (errEl) errEl.textContent = "";
}

/**
 * Runs checks on every field and collects validated data.
 */
function validateForm() {  // it will return in data in boolean form
  let valid = true;

  // -- Purchase Date --
  clearError(purchaseDateInput);
  if (!purchaseDateInput.value) {
    showError(purchaseDateInput, "Purchase date is required.");
    valid = false;
  }

  // -- Items --
  const itemRows = itemsContainer.querySelectorAll(".item-row");
  const items = [];

  itemRows.forEach((row) => {
    const nameInput = row.querySelector("[name='itemName']");
    const typeSelect = row.querySelector("[name='itemType']");
    const stockInput = row.querySelector("[name='inStock']");

    clearError(nameInput);
    clearError(typeSelect);

    let rowValid = true;

    if (!nameInput.value.trim()) {
      showError(nameInput, "Item name is required.");
      valid = false;
      rowValid = false;
    }

    if (!typeSelect.value) {
      showError(typeSelect, "Please select a type.");
      valid = false;
      rowValid = false;
    }

    if (rowValid) {
      items.push({
        item_name: nameInput.value.trim(),
        type_name: typeSelect.value,
        in_stock: stockInput.checked,
      });
    }
  });

  return { valid, items };
}



// 4.  FORM SUBMISSION  LOGIC


purchaseForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const { valid, items } = validateForm();
  if (!valid) {
    showToast("Please fix the errors above.", "error");
    return;
  }

  // Show loading state
  submitBtn.querySelector(".btn-text").style.display = "none";
  submitBtn.querySelector(".btn-loader").style.display = "inline";
  submitBtn.disabled = true;


  // ************ saving items to local storage *****************
  // Simulate a short async delay (will be replaced by real fetch() to backend)
  // await delay(600);

  // Save all items to our in-memory store
  //   items.forEach(item => inventoryRecords.push(item));
  //   saveToStorage(inventoryRecords);

  //   // Reset UI
  //   submitBtn.querySelector(".btn-text").style.display = "inline";
  //   submitBtn.querySelector(".btn-loader").style.display = "none";
  //   submitBtn.disabled = false;

  //   showToast(`✓ ${items.length} item(s) saved successfully!`, "success");
  //   resetForm();
  //   renderTable();


  // *** Fetching data from Database **** 
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        purchase_id: purchaseIdInput.value.trim(),
        purchase_date: purchaseDateInput.value,
        items
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to save");
    }

    showToast(`✓ ${items.length} item(s) saved successfully!`, "success");
    resetForm();
    await loadAndRender();   // refresh table from backend

  } catch (error) {
    showToast(`Error: ${error.message}`, "error");
  } finally {
    submitBtn.querySelector(".btn-text").style.display = "inline";
    submitBtn.querySelector(".btn-loader").style.display = "none";
    submitBtn.disabled = false;
  }

});

resetBtn.addEventListener("click", resetForm);

function resetForm() {
  purchaseForm.reset();
  purchaseDateInput.valueAsDate = new Date();
  itemsContainer.innerHTML = "";
  addItemRow();
  generatePurchaseId();
  // Clear any lingering errors
  document.querySelectorAll(".error-msg").forEach(el => el.textContent = "");
  document.querySelectorAll("input, select").forEach(el => el.style.borderColor = "");
}


// Loading from backend to get the response here

async function loadAndRender() {
  try {
    const response = await fetch(API_URL);
    const result = await response.json();

    if (!response.ok) throw new Error(result.message);

    inventoryRecords = result.data;  // store globally
    generatePurchaseId();            // update ID based on count
    renderTable();                   // draw the table

  } catch (error) {
    showToast(`Failed to load items: ${error.message}`, "error");
  }
}


// Table Will render here now

/** renderTable(records?) — renders filtered/searched rows into <tbody> */

function renderTable() {
  const query = searchInput.value.trim().toLowerCase();
  const type = filterType.value;

  let filtered = inventoryRecords.filter(r => {
    const matchSearch = !query ||
      r.item_name.toLowerCase().includes(query) ||
      r.purchase_id.toLowerCase().includes(query);
    const matchType = !type || r.type_name === type;
    return matchSearch && matchType;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr class="empty-row"><td colspan="6">No records found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = filtered.map((record) => {
    const stockBadge = record.in_stock
      ? `<span class="badge badge-yes">● In Stock</span>`
      : `<span class="badge badge-no">○ Out of Stock</span>`;

    return `
      <tr>
        <td>${escapeHtml(record.purchase_id)}</td>
        <td>${escapeHtml(record.item_name)}</td>
        <td><span class="type-chip">${escapeHtml(record.type_name)}</span></td>
        <td>${formatDate(record.purchase_date)}</td>
        <td>${stockBadge}</td>
        <td>
          <div class="action-btns">
            <button class="btn-edit"   onclick="openEditModal(${record.id})">✏ Edit</button>
            <button class="btn-delete" onclick="openDeleteModal(${record.id}, '${escapeHtml(record.item_name)}')">✕ Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// Live search + filter

searchInput.addEventListener("input", () => renderTable());
filterType.addEventListener("change", () => renderTable());


// 6.  EDIT MODAL


function openEditModal(id) {
  const record = inventoryRecords.find(r => r.id === id);
  if (!record) return;

  document.getElementById("editIndex").value = id;
  document.getElementById("editName").value = record.item_name;
  document.getElementById("editType").value = record.type_name;
  document.getElementById("editDate").value = record.purchase_date.split("T")[0];
  document.getElementById("editStock").checked = record.in_stock;

  // Clear any previous modal errors
  document.getElementById("err-editName").textContent = "";
  document.getElementById("err-editDate").textContent = "";
  document.getElementById("editName").style.borderColor = "";
  document.getElementById("editDate").style.borderColor = "";

  editModal.style.display = "flex";  // directly override the inline style
}

function closeEditModal() {
  editModal.style.display = "none";
}

document.getElementById("modalClose").addEventListener("click", closeEditModal);
document.getElementById("cancelEdit").addEventListener("click", closeEditModal);

// Close modal when clicking the backdrop
editModal.addEventListener("click", (e) => {
  if (e.target === editModal) closeEditModal();
});

document.getElementById("saveEdit").addEventListener("click", async () => {
  const id = document.getElementById("editIndex").value;
  const nameInput = document.getElementById("editName");
  const dateInput = document.getElementById("editDate");
  let valid = true;

  // Validate
  document.getElementById("err-editName").textContent = "";
  document.getElementById("err-editDate").textContent = "";
  nameInput.style.borderColor = "";
  dateInput.style.borderColor = "";

  if (!nameInput.value.trim()) {
    nameInput.style.borderColor = "var(--danger)";
    document.getElementById("err-editName").textContent = "Item name is required.";
    valid = false;
  }
  if (!dateInput.value) {
    dateInput.style.borderColor = "var(--danger)";
    document.getElementById("err-editDate").textContent = "Date is required.";
    valid = false;
  }
  if (!valid) return;

  // ******* Update record in local storage ******

  // inventoryRecords[index] = {
  //   ...inventoryRecords[index],
  //   itemName: nameInput.value.trim(),
  //   itemType: document.getElementById("editType").value,
  //   purchaseDate: dateInput.value,
  //   inStock: document.getElementById("editStock").checked,
  // };

  // saveToStorage(inventoryRecords);
  // closeEditModal();
  // renderTable();
  // showToast("✓ Item updated successfully!", "success");

  //  ****** Using Fetch to direct interact with backend *****

  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        item_name: nameInput.value.trim(),
        type_name: document.getElementById("editType").value,
        purchase_date: dateInput.value,
        in_stock: document.getElementById("editStock").checked
      })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message);

    closeEditModal();
    await loadAndRender();
    showToast("✓ Item updated successfully!", "success");

  } catch (error) {
    showToast(`Error: ${error.message}`, "error");
  }
});



// 7.  DELETE MODAL


// ─────────────────────────────────────────────
function openDeleteModal(id, itemName) {
  pendingDeleteId = id;
  document.getElementById("deleteItemName").textContent = itemName;
  deleteModal.style.display = "flex";
}

function closeDeleteModal() {
  deleteModal.style.display = "none";
  pendingDeleteId = null;
}

document.getElementById("deleteModalClose").addEventListener("click", closeDeleteModal);
document.getElementById("cancelDelete").addEventListener("click", closeDeleteModal);

deleteModal.addEventListener("click", (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

document.getElementById("confirmDelete").addEventListener("click", async() => {
  if (pendingDeleteId === null) return;

  // ***** for local storage *******

  // inventoryRecords.splice(pendingDeleteIndex, 1);
  // saveToStorage(inventoryRecords);
  // closeDeleteModal();
  // renderTable();
  // showToast("Item deleted.", "error");


  //  ***** for Interacting with Backend and Database *******
  try {
    const response = await fetch(`${API_URL}/${pendingDeleteId}`, {
      method: "DELETE"
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message);

    closeDeleteModal();
    await loadAndRender();
    showToast("Item deleted.", "error");

  } catch (error) {
    showToast(`Error: ${error.message}`, "error");
  }
});


// 8.  UTILITY FUNCTIONS


/** Show a brief toast notification */
function showToast(message, type = "") {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  setTimeout(() => { toast.className = "toast"; }, 3200);
}

/** Simple async delay helper */
// function delay(ms) {
//   return new Promise(resolve => setTimeout(resolve, ms));
// }

/** Format YYYY-MM-DD → readable date */
function formatDate(dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

/** Prevent XSS by escaping HTML special chars */
function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function init() {
  await loadAndRender();
  generatePurchaseId();
}

init();

// /** Load inventory array from localStorage */
// function loadFromStorage() {
//   try {
//     return JSON.parse(localStorage.getItem("inventoryRecords")) || [];
//   } catch {
//     return [];
//   }
// }

// /** Persist inventory array to localStorage */
// function saveToStorage(data) {
//   localStorage.setItem("inventoryRecords", JSON.stringify(data));
// }
