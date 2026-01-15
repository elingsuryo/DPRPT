
/* ================= AUTH ================= */
let authDB;
const authReq = indexedDB.open("AuthDB", 1);

authReq.onupgradeneeded = e => {
  authDB = e.target.result;
  authDB.createObjectStore("users", { keyPath: "username" });
};

authReq.onsuccess = e => {
  authDB = e.target.result;
  createDefaultUser();
};

async function hashPassword(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,"0")).join("");
}

async function createDefaultUser() {
  const tx = authDB.transaction("users","readonly");
  const req = tx.objectStore("users").get("admin");
  req.onsuccess = async () => {
    if (!req.result) {
      const pw = await hashPassword("admin123");
      authDB.transaction("users","readwrite")
        .objectStore("users")
        .add({ username:"admin", password: pw });
    }
  };
}

async function login() {
  const u = loginUsername.value;
  const p = loginPassword.value;
  const req = authDB.transaction("users","readonly")
    .objectStore("users").get(u);

  req.onsuccess = async () => {
    if (!req.result) return loginStatus.innerText="User tidak ditemukan";
    if (await hashPassword(p) === req.result.password) {
      sessionStorage.setItem("login","true");
      loginOverlay.style.display="none";
    } else loginStatus.innerText="Password salah";
  };
}

window.onload = () => {
  loginOverlay.style.display =
    sessionStorage.getItem("login")==="true" ? "none":"flex";
};

/* ================= HELPER ================= */
const formatRupiah = n => "Rp " + parseInt(n).toLocaleString("id-ID");
const formatTanggal = t => new Date(t).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"});

function parseRincianPekerjaan(text){
  return text.trim().split("\n").map(l=>{
    const p=l.split("|").map(x=>x.trim());
    return {no:p[0],uraian:p[1],qty:p[2],satuan:p[3],harga:+p[4],total:+p[5]};
  });
}

function validateInputs(){
  const ids=["nomorSPK","tanggalSPK","namaPPK","namaPenyedia","paketPekerjaan"];
  for(let id of ids){
    if(!document.getElementById(id).value){
      alert(id+" wajib diisi"); return false;
    }
  }
  return true;
}

/* ================= PDF ================= */
async function generatePDF(){
  if(!validateInputs()) return;
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.text("SURAT PERINTAH KERJA (SPK)",105,20,{align:"center"});
  doc.text("Nomor : "+nomorSPK.value,20,40);
  doc.text("Nama PPK : "+namaPPK.value,20,50);
  doc.save("SPK_"+nomorSPK.value.replace(/\//g,"_")+".pdf");
}

/* ================= WORD ================= */
async function generateWord(){
  if(!validateInputs()) return;
  const html = `
  <h2 style="text-align:center">SURAT PERINTAH KERJA (SPK)</h2>
  <p>Nomor : ${nomorSPK.value}</p>
  <p>Nama PPK : ${namaPPK.value}</p>`;
  const blob = new Blob(["\ufeff"+html],{type:"application/msword"});
  const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);
  a.download="SPK_"+nomorSPK.value.replace(/\//g,"_")+".doc";
  a.click();
}
