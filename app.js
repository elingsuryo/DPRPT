/* =========================================================
   AUTH + LOGIN (STABLE LOCALHOST FIX)
   ========================================================= */

let authDB = null;

/* --- FORCE OVERLAY DEFAULT STATE --- */
const loginOverlay = document.getElementById("loginOverlay");

/* IndexedDB Init */
const authReq = indexedDB.open("AuthDB", 1);

authReq.onupgradeneeded = (e) => {
  const db = e.target.result;
  if (!db.objectStoreNames.contains("users")) {
    db.createObjectStore("users", { keyPath: "username" });
  }
};

authReq.onsuccess = (e) => {
  authDB = e.target.result;
  createDefaultUser().then(checkLogin);
};

authReq.onerror = () => {
  console.error("Gagal membuka IndexedDB");
};

/* --- LOGIN STATE HANDLER (SINGLE SOURCE OF TRUTH) --- */
function checkLogin() {
  const isLogin = sessionStorage.getItem("login") === "true";
  loginOverlay.style.display = isLogin ? "none" : "flex";
}

/* --- HASH PASSWORD --- */
async function hashPassword(text) {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* --- CREATE DEFAULT USER --- */
async function createDefaultUser() {
  return new Promise((resolve) => {
    const tx = authDB.transaction("users", "readonly");
    const store = tx.objectStore("users");
    const req = store.get("admin");

    req.onsuccess = async () => {
      if (!req.result) {
        const pw = await hashPassword("admin123");
        const tx2 = authDB.transaction("users", "readwrite");
        tx2.objectStore("users").add({
          username: "admin",
          password: pw,
        });
        console.log("User admin dibuat");
      }
      resolve();
    };
  });
}

/* --- LOGIN FUNCTION --- */
async function login() {
  if (!authDB) {
    alert("Database belum siap, refresh halaman");
    return;
  }

  const username = document.getElementById("loginUsername").value.trim();
  const password = document.getElementById("loginPassword").value;
  const status = document.getElementById("loginStatus");

  status.innerText = "";

  const tx = authDB.transaction("users", "readonly");
  const store = tx.objectStore("users");
  const req = store.get(username);

  req.onsuccess = async () => {
    if (!req.result) {
      status.innerText = "User tidak ditemukan";
      return;
    }

    const hash = await hashPassword(password);
    if (hash === req.result.password) {
      sessionStorage.setItem("login", "true");
      checkLogin();
    } else {
      status.innerText = "Password salah";
    }
  };
}

/* =========================================================
   HELPER FUNCTIONS
   ========================================================= */

function formatRupiah(angka) {
  return "Rp " + parseInt(angka || 0).toLocaleString("id-ID");
}

function formatTanggal(tanggal) {
  if (!tanggal) return "";
  const bulan = [
    "Januari","Februari","Maret","April","Mei","Juni",
    "Juli","Agustus","September","Oktober","November","Desember"
  ];
  const d = new Date(tanggal);
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function parseRincianPekerjaan(text) {
  if (!text) return [];
  return text.trim().split("\n").map((line) => {
    const p = line.split("|").map((x) => x.trim());
    return {
      no: p[0] || "",
      uraian: p[1] || "",
      qty: p[2] || "",
      satuan: p[3] || "",
      harga: parseInt(p[4]) || 0,
      total: parseInt(p[5]) || 0,
    };
  }).filter(i => i.no);
}

function validateInputs() {
  const required = [
    "nomorSPK","tanggalSPK","namaPPK","namaPenyedia",
    "paketPekerjaan","nomorDPA","tanggalDPA","nilaiKontrak"
  ];
  for (let id of required) {
    const el = document.getElementById(id);
    if (!el || !el.value.trim()) {
      alert("Field wajib diisi");
      el?.focus();
      return false;
    }
  }
  return true;
}

/* =========================================================
   PDF GENERATOR (SAFE)
   ========================================================= */

async function generatePDF() {
  if (!validateInputs()) return;

  if (!window.jspdf) {
    alert("jsPDF belum termuat");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text("SURAT PERINTAH KERJA (SPK)", 105, 20, { align: "center" });

  doc.setFontSize(10);
  doc.text("Nomor SPK : " + nomorSPK.value, 20, 40);
  doc.text("Nama PPK : " + namaPPK.value, 20, 50);

  doc.save("SPK_" + nomorSPK.value.replace(/\//g, "_") + ".pdf");
}

/* =========================================================
   WORD GENERATOR (SAFE)
   ========================================================= */

async function generateWord() {
  if (!validateInputs()) return;

  const html = `
    <h2 style="text-align:center">SURAT PERINTAH KERJA (SPK)</h2>
    <p>Nomor SPK : ${nomorSPK.value}</p>
    <p>Nama PPK : ${namaPPK.value}</p>
  `;

  const blob = new Blob(["\ufeff", html], {
    type: "application/msword",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "SPK_" + nomorSPK.value.replace(/\//g, "_") + ".doc";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
