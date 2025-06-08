const appId = "ae5d7dce-1c12-4c53-b201-5a2d7c5b5411";
const apiKey = "V2-b1wGR-Nj1SR-0MhEx-QWCHT-Mllly-cZnc9-PHCAK-r1f85";

// 🔄 ดึงข้อมูลจากตาราง
async function fetchFromTable(table, filter = {}) {
  const response = await fetch(`https://api.appsheet.com/api/v2/apps/${appId}/tables/${table}/Find`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ApplicationAccessKey": apiKey
    },
    body: JSON.stringify({ filter })
  });

  const data = await response.json();
  return data;
}

// 📌 โหลดแผนก
async function loadDepartments() {
  const list = await fetchFromTable("Department");
  const select = document.querySelector("[name='หน่วยงาน']");
  select.innerHTML = '<option value="">-- เลือกแผนก --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item.DeptCode}">${item.DeptName}</option>`;
  });
}

// 📌 โหลดเครื่องจักรตามแผนก
async function loadMachines(deptCode) {
  const select = document.querySelector("[name='รหัสเครื่อง']");
  select.innerHTML = '<option value="">⏳ กำลังโหลด...</option>';

  if (!deptCode) {
    select.innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
    return;
  }

  const list = await fetchFromTable("MachineMaster", { DeptCode: deptCode });

  select.innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
  list.forEach(item => {
    const code = item["รหัสเครื่อง"];
    const name = item["รายชื่อเครื่องจักร"];
    const option = document.createElement("option");

    option.value = code; // ✅ ส่งเฉพาะรหัสเครื่องไปบันทึก
    option.textContent = `${code} - ${name}`; // ✅ แสดงชื่อแบบเต็ม
    select.appendChild(option);
  });
}


// 📌 โหลดชนิดงาน
async function loadJobTypes() {
  const list = await fetchFromTable("MachineJobType");
  const select = document.querySelector("[name='ชนิดงาน']");
  select.innerHTML = '<option value="">-- เลือกชนิดงาน --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item['รหัสงาน']}">${item['ชนิดงาน']}</option>`;
  });
}

// 📌 สร้างเลขที่ใบแจ้งซ่อมอัตโนมัติ
async function fetchAutoRequestNumber() {
  const rows = await fetchFromTable("Machinesymptom");
  const input = document.querySelector("[name='เลขที่ใบแจ้งซ่อม']");

  if (rows.length > 0) {
    const max = rows
      .map(r => r["เลขที่ใบแจ้งซ่อม"])
      .filter(Boolean)
      .sort()
      .pop();

    const nextNum = max ? parseInt(max.replace(/[^\d]/g, ""), 10) + 1 : 1;
    input.value = String(nextNum).padStart(7, "0");
  } else {
    input.value = "0000001";
  }
}

async function fetchAutoRequestNumber() {
  const rows = await fetchFromTable("Machinesymptom");
  const input = document.querySelector("[name='เลขที่ใบแจ้งซ่อม']");

  let newCode = "0000001";
  if (rows.length > 0) {
    const max = rows
      .map(r => r["เลขที่ใบแจ้งซ่อม"])
      .filter(Boolean)
      .sort()
      .pop();

    const nextNum = max ? parseInt(max.replace(/[^\d]/g, ""), 10) + 1 : 1;
    newCode = String(nextNum).padStart(7, "0");
  }

  input.value = newCode;
  generateQRCode(newCode); // 🔄 สร้าง QR Code
}
function generateQRCode(text) {
  const container = document.getElementById("qrcode");
  container.innerHTML = ""; // ล้างของเดิมก่อน
  new QRCode(container, {
    text: text,
    width: 128,
    height: 128,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.H
  });
}


// 📥 เมื่อเปลี่ยนแผนก
document.querySelector("[name='หน่วยงาน']").addEventListener("change", e => {
  loadMachines(e.target.value);
});

// ✅ ส่งฟอร์ม
document.getElementById("repairForm").addEventListener("submit", async function (event) {
  event.preventDefault();

  const form = event.target;
  const submitBtn = form.querySelector("button[type='submit']");
  submitBtn.disabled = true;
  submitBtn.textContent = "🔄 กำลังบันทึก...";

  const data = Object.fromEntries(new FormData(form).entries());

  const payload = {
    Action: "Add",
    Properties: { Locale: "th-TH" },
    Rows: [data]
  };

  try {
    const res = await fetch(`https://api.appsheet.com/api/v2/apps/${appId}/tables/Machinesymptom/Action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ApplicationAccessKey": apiKey
      },
      body: JSON.stringify(payload)
    });

    const rawText = await res.text();
    const result = rawText ? JSON.parse(rawText) : null;

    if (res.ok && (!result?.Failures?.length)) {
      alert("✅ บันทึกสำเร็จ!");
      form.reset();
      fetchAutoRequestNumber();
      document.querySelector("[name='รหัสเครื่อง']").innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
    } else {
      alert("❌ บันทึกไม่สำเร็จ: " + (result ? JSON.stringify(result.Failures) : "ไม่มีข้อมูลตอบกลับจาก API"));
    }
  } catch (error) {
    alert("❌ เกิดข้อผิดพลาด: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "บันทึกข้อมูล";
  }
});

<script>
  document.getElementById('menuToggle').addEventListener('click', () => {
    const menu = document.getElementById('mobileMenu');
    menu.classList.toggle('hidden');
  });
</script>


// 🔄 โหลดข้อมูลเมื่อเริ่มต้น
loadDepartments();
loadJobTypes();
fetchAutoRequestNumber();
