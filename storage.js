const Database = require("better-sqlite3");
const path = require("path");

// เชื่อมต่อฐานข้อมูล
const dbPath = path.join(__dirname, "data", "products.db");
const db = new Database(dbPath);

// สร้างตารางพร้อมคอลัมน์ทั้งหมดที่จำเป็น
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    producer TEXT,
    category TEXT,
    contact TEXT,
    image_path TEXT
  )
`);

// ----------------------------------------------------
// READ ALL
// ----------------------------------------------------
function loadProducts() {
  const stmt = db.prepare("SELECT * FROM products ORDER BY id DESC");
  return stmt.all();
}

// ----------------------------------------------------
// READ ONE
// ----------------------------------------------------
function getProductById(id) {
  const stmt = db.prepare("SELECT * FROM products WHERE id = ?");
  return stmt.get(id);
}

// ----------------------------------------------------
// CREATE
// ----------------------------------------------------
function addProduct(product) {
  const stmt = db.prepare(`
    INSERT INTO products (name, producer, price, category, contact, image_path)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    product.name,
    product.producer || null,
    product.price,
    product.category || null,
    product.contact || null,
    product.image_path || null
  );

  return getProductById(result.lastInsertRowid);
}

// ----------------------------------------------------
// DELETE
// ----------------------------------------------------
function deleteProduct(id) {
  const stmt = db.prepare("DELETE FROM products WHERE id = ?");
  const result = stmt.run(id);
  return result.changes > 0;
}

// ----------------------------------------------------
// UPDATE (เพิ่มตามสไลด์ 37)
// ----------------------------------------------------
function updateProduct(id, data) {
  const stmt = db.prepare(`
    UPDATE products
    SET name = ?, producer = ?, price = ?, category = ?, contact = ?
    WHERE id = ?
  `);

  const result = stmt.run(
    data.name,
    data.producer,
    data.price,
    data.category,
    data.contact,
    id
  );

  if (result.changes === 0) return null;
  return getProductById(id);
}

// ----------------------------------------------------
// EXPORTS (เพิ่ม updateProduct ตามสไลด์ 38)
// ----------------------------------------------------
module.exports = {
  loadProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};