const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const multer = require("multer");
const fs = require("fs");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// 1. ตรวจสอบและสร้างโฟลเดอร์ uploads
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. ตรวจสอบและสร้างโฟลเดอร์ data สำหรับเก็บไฟล์ SQLite
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 3. ตั้งค่าการจัดเก็บไฟล์ด้วย Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage });

app.use("/uploads", express.static(uploadDir));

// 4. เชื่อมต่อฐานข้อมูล SQLite
const dbPath = path.join(dataDir, "products.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("❌ เชื่อมต่อ SQLite ไม่สำเร็จ:", err.message);
  } else {
    console.log("✅ เชื่อมต่อ SQLite Database สำเร็จที่:", dbPath);
  }
});

// 5. ตรวจสอบและสร้างตารางพร้อมคอลัมน์อย่างปลอดภัย
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    producer TEXT,
    price REAL,
    category TEXT,
    contact TEXT,
    image_path TEXT
  )`);

  db.all("PRAGMA table_info(products)", [], (err, columns) => {
    if (err || !columns) return;
    const existingCols = columns.map((c) => c.name);
    const columnsToAdd = ["producer", "category", "contact", "image_path"];

    columnsToAdd.forEach((col) => {
      if (!existingCols.includes(col)) {
        db.run(`ALTER TABLE products ADD COLUMN ${col} TEXT`, () => {});
      }
    });
  });
});

// GET ทั้งหมด
app.get("/api/products", (req, res) => {
  const sql = "SELECT * FROM products";
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// GET 1 ตัว
app.get("/api/products/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM products WHERE id = ?";
  db.get(sql, [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์" });
    res.json(row);
  });
});

// POST (เพิ่มสินค้าใหม่)
app.post("/api/products", upload.single("image"), (req, res) => {
  const { name, producer, price, category, contact } = req.body;

  if (!name || !producer || !price || !category) {
    return res.status(400).json({
      error: "กรุณาระบุ name, producer, price, category ให้ครบถ้วน",
    });
  }

  const image_path = req.file ? `/uploads/${req.file.filename}` : null;

  const sql = `INSERT INTO products (name, producer, price, category, contact, image_path) VALUES (?, ?, ?, ?, ?, ?)`;
  const params = [
    name,
    producer,
    Number(price),
    category,
    contact || null,
    image_path,
  ];

  db.run(sql, params, function (err) {
    if (err) {
      console.error("❌ บันทึกลง Database ไม่สำเร็จ:", err.message);
      return res.status(500).json({ error: err.message });
    }
    res.status(201).json({
      id: this.lastID,
      name,
      producer,
      price: Number(price),
      category,
      contact: contact || null,
      image_path: image_path,
    });
  });
});

// PUT (แก้ไขสินค้า)
app.put("/api/products/:id", (req, res) => {
  const id = parseInt(req.params.id);
  const { name, producer, price, category, contact } = req.body;

  if (!name || !producer || !price || !category) {
    return res.status(400).json({ error: "ข้อมูลไม่ครบ" });
  }

  const sql = `
    UPDATE products
    SET name = ?, producer = ?, price = ?, category = ?, contact = ?
    WHERE id = ?
  `;
  const params = [name, producer, Number(price), category, contact || null, id];

  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์" });

    db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });
});

// DELETE (ลบสินค้า)
app.delete("/api/products/:id", (req, res) => {
  const id = req.params.id;

  db.get("SELECT * FROM products WHERE id = ?", [id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "ไม่พบผลิตภัณฑ์" });

    if (row.image_path) {
      const filePath = path.join(__dirname, row.image_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ ลบไฟล์: ${row.image_path}`);
      }
    }

    db.run("DELETE FROM products WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "ลบสำเร็จ", deleted: row });
    });
  });
});

// กำหนด PORT เพื่อรองรับ Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});