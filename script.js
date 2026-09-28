// ดึง Element จาก DOM
const productsContainer = document.getElementById("products-container");
const addProductForm = document.getElementById("add-product-form");

// 1. ฟังก์ชันดึงและแสดงรายการสินค้าทั้งหมด
async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    if (!response.ok) return;

    const products = await response.json();
    productsContainer.innerHTML = ""; 

    products.forEach((product) => {
      const card = document.createElement("article");
      card.className = "card";
      
      // 🎯 แก้ไขส่วน template card ตามสไลด์ 35
      card.innerHTML = `
        ${
          product.image_path
            ? `<div class="card-image">
                <img src="${product.image_path}" alt="${product.name}">
               </div>`
            : `<div class="card-image no-image">
                <span>📷 ไม่มีรูปภาพ</span>
               </div>`
        }
        <div class="card-content">
          <div class="card-header">
            <h3>${product.name}</h3>
            <span class="category-badge">${product.category}</span>
          </div>
          <p class="producer">👥 ${product.producer}</p>
          ${product.contact ? `<p class="contact">📞 ${product.contact}</p>` : ""}
          <div class="card-footer">
            <span class="price">฿ ${Number(product.price).toLocaleString()}</span>
            <div class="card-actions">
              <button class="edit-btn" data-id="${product.id}">✏️ แก้ไข</button>
              <button class="delete-btn" data-id="${product.id}">🗑️ ลบ</button>
            </div>
          </div>
        </div>
      `;
      productsContainer.appendChild(card);
    });

    // 🎯 เพิ่ม attachEditHandlers(); ต่อจาก attachDeleteHandlers(); ตามสไลด์ 36
    attachDeleteHandlers();
    attachEditHandlers();

  } catch (error) {
    productsContainer.innerHTML = `<p style="color:red;">Error: ${error.message}</p>`;
  }
}

// 2. Event Listener สำหรับการส่งฟอร์มเพิ่มสินค้าใหม่
addProductForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData();
  formData.append("name", document.getElementById("product-name").value);
  formData.append("producer", document.getElementById("product-producer").value);
  formData.append("price", document.getElementById("product-price").value);
  formData.append("category", document.getElementById("product-category").value);
  formData.append("contact", document.getElementById("product-contact").value);

  const fileInput = document.getElementById("product-image");
  if (fileInput && fileInput.files[0]) {
    formData.append("image", fileInput.files[0]);
  }

  try {
    const response = await fetch("/api/products", {
      method: "POST",
      body: formData,
    });

    const resText = await response.text();
    let resData;
    try {
      resData = JSON.parse(resText);
    } catch (e) {
      resData = null;
    }

    if (!response.ok) {
      const errorMsg = (resData && resData.error) ? resData.error : `ส่งข้อมูลไม่สำเร็จ (${response.status})`;
      throw new Error(errorMsg);
    }

    addProductForm.reset();
    loadProducts();
    alert("✅ เพิ่มผลิตภัณฑ์สำเร็จ");
  } catch (error) {
    alert("❌ " + error.message);
  }
});

// ฟังก์ชันผูก Event ปุ่มลบ
function attachDeleteHandlers() {
  document.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      if (confirm("คุณต้องการลบรายการนี้ใช่หรือไม่?")) {
        try {
          const response = await fetch(`/api/products/${id}`, { method: "DELETE" });
          if (response.ok) {
            loadProducts();
          } else {
            alert("ไม่สามารถลบรายการได้");
          }
        } catch (error) {
          console.error("เกิดข้อผิดพลาดในการลบ:", error);
        }
      }
    });
  });
}

// ============================================
// Edit Modal Elements
// ============================================
const modal = document.getElementById("edit-modal");
const closeBtn = document.getElementById("modal-close");
const cancelBtn = document.getElementById("cancel-btn");
const editForm = document.getElementById("edit-form");

// ============================================
// Open/Close Modal
// ============================================
function openEditModal(product) {
  document.getElementById("edit-id").value = product.id;
  document.getElementById("edit-name").value = product.name;
  document.getElementById("edit-producer").value = product.producer;
  document.getElementById("edit-price").value = product.price;
  document.getElementById("edit-category").value = product.category;
  document.getElementById("edit-contact").value = product.contact || "";

  modal.classList.remove("hidden");
}

function closeEditModal() {
  modal.classList.add("hidden");
  editForm.reset();
}

closeBtn.addEventListener("click", closeEditModal);
cancelBtn.addEventListener("click", closeEditModal);

modal.addEventListener("click", (event) => {
  if (event.target === modal) {
    closeEditModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !modal.classList.contains("hidden")) {
    closeEditModal();
  }
});

// ============================================
// Submit Edit Form
// ============================================
editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const id = document.getElementById("edit-id").value;
  const updatedData = {
    name: document.getElementById("edit-name").value,
    producer: document.getElementById("edit-producer").value,
    price: Number(document.getElementById("edit-price").value),
    category: document.getElementById("edit-category").value,
    contact: document.getElementById("edit-contact").value || null
  };

  try {
    const response = await fetch(`/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "แก้ไขไม่สำเร็จ");
    }

    closeEditModal();
    loadProducts();
    alert("✅ บันทึกสำเร็จ");

  } catch (error) {
    alert("❌ " + error.message);
  }
});

// ============================================
// Attach Edit Handlers (call after render)
// ============================================
function attachEditHandlers() {
  document.querySelectorAll(".edit-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;

      try {
        const response = await fetch(`/api/products/${id}`);
        const product = await response.json();

        openEditModal(product);
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูลเพื่อแก้ไข:", error);
      }
    });
  });
}

// โหลดข้อมูลสินค้าทันทีเมื่อเปิดหน้าเว็บ
loadProducts();