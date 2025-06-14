const appId = "ae5d7dce-1c12-4c53-b201-5a2d7c5b5411";
const apiKey = "V2-b1wGR-Nj1SR-0MhEx-QWCHT-Mllly-cZnc9-PHCAK-r1f85";
const apiBase = `https://api.appsheet.com/api/v2/apps/${appId}/tables/`;
const jobTypeMap = new Map();

async function fetchFromTable(table, filter = {}) {
  const response = await fetch(`${apiBase}${table}/Find`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ApplicationAccessKey: apiKey,
    },
    body: JSON.stringify({ filter }),
  });
  return await response.json();
}

async function loadDepartments() {
  const list = await fetchFromTable("Department");
  const select = document.getElementById("deptSelect");
  select.innerHTML = `<option value="">-- เลือกแผนก --</option>`;
  list.forEach((item) => {
    const opt = document.createElement("option");
    opt.value = item.DeptCode;
    opt.textContent = item.DeptNameEng;
    select.appendChild(opt);
  });
}

async function loadJobTypes() {
  const list = await fetchFromTable("MachineJobType");
  const sel = document.getElementById("jobTypeSelect");
  sel.innerHTML = '<option value="">-- เลือกชนิดงาน --</option>';
  list.forEach(item => {
    const name = item["ชนิดงาน"];
    const code = item["รหัสงาน"];
    jobTypeMap.set(name, code);
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  });
}

async function loadMachines(deptCode) {
  const list = await fetchFromTable("MachineMaster");
  const select = document.getElementById("machineSelect");
  select.innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
  list.filter(item => item.DeptCode === deptCode)
      .forEach((item) => {
        const opt = document.createElement("option");
        opt.value = item["รหัสเครื่อง"];
        opt.textContent = `${item["รหัสเครื่อง"]} - ${item["รายชื่อเครื่องจักร"]}`;
        select.appendChild(opt);
      });
}

async function fetchAutoRequestNumber() {
  const rows = await fetchFromTable("Machinesymptom");
  const input = document.querySelector("[name='เลขที่ใบแจ้งซ่อม']");
  let newCode = "2506001";
  if (rows.length > 0) {
    const max = rows.map(r => r["เลขที่ใบแจ้งซ่อม"]).filter(Boolean).sort().pop();
    const next = max ? parseInt(max.replace(/\D/g, "")) + 1 : 1;
    newCode = String(next).padStart(7, "0");
  }
  input.value = newCode;
  generateQRCode(newCode);
}

function generateQRCode(text) {
  const container = document.getElementById("qrcode");
  container.innerHTML = "";
  new QRCode(container, {
    text,
    width: 128,
    height: 128,
    colorDark: "#000",
    colorLight: "#fff",
    correctLevel: QRCode.CorrectLevel.H
  });
}

document.getElementById("deptSelect").addEventListener("change", (e) => {
  loadMachines(e.target.value);
});

document.getElementById("repairForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  if (jobTypeMap.has(data["ชนิดงาน"])) {
    data["ชนิดงาน"] = jobTypeMap.get(data["ชนิดงาน"]);
  }

  const payload = {
    Action: "Add",
    Properties: { Locale: "th-TH" },
    Rows: [data],
  };

  const res = await fetch(`${apiBase}Machinesymptom/Action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ApplicationAccessKey: apiKey,
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let result = null;
  try {
    result = JSON.parse(raw);
  } catch (e) {}

  if (res.ok && (!result?.Failures?.length)) {
    alert("✅ บันทึกสำเร็จ!");
    form.reset();
    fetchAutoRequestNumber();
    document.getElementById("machineSelect").innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
  } else {
    alert("❌ บันทึกไม่สำเร็จ: " + (result?.Failures?.[0]?.Message || "ไม่พบข้อความผิดพลาด"));
  }
});

loadDepartments();
loadJobTypes();
fetchAutoRequestNumber();
