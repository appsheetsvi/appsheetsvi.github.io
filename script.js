const appId = "ae5d7dce-1c12-4c53-b201-5a2d7c5b5411";
const apiKey = "V2-lYSFh-KY1tr-q5RUR-qjGNg-NhTsA-0IlEz-x52kD-Zw9Qb";

async function fetchFromTable(table, filter = {}) {
  const res = await fetch(`https://api.appsheet.com/api/v2/apps/${appId}/tables/${table}/Find`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ApplicationAccessKey": apiKey
    },
    body: JSON.stringify({ filter })
  });
  const data = await res.json();
  return data;
}

async function loadDepartments() {
  const list = await fetchFromTable("Department");
  const select = document.querySelector("[name='หน่่วยงาน']");
  select.innerHTML = '<option value="">-- เลือกแผนก --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item.DeptCode}">${item.DeptName}</option>`;
  });
}

async function loadMachines(deptCode) {
  const list = await fetchFromTable("MachineMaster", { DeptCode: deptCode });
  const select = document.querySelector("[name='รายชื่อเครื่องจักร']");
  select.innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item['รายชื่อเครื่องจักร']}">${item['รายชื่อเครื่องจักร']}</option>`;
  });
}

async function fetchAutoRequestNumber() {
  const rows = await fetchFromTable("Machinesymptom");
  if (rows.length > 0) {
    const max = rows.map(r => r["เลขที่ใบแจ้งซ่อม"]).sort().pop();
    const next = parseInt(max?.replace(/[^\d]/g, "") || "0") + 1;
    const requestNumber = "REQ-" + String(next).padStart(4, "0");
    document.querySelector("[name='เลขที่ใบแจ้งซ่อม']").value = requestNumber;
  }
}

document.querySelector("[name='หน่่วยงาน']").addEventListener("change", e => {
  const deptCode = e.target.value;
  loadMachines(deptCode);
});

document.getElementById("repairForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.target;
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
        "ApplicationAccessKey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    if (res.ok && (!result.Failures || result.Failures.length === 0)) {
      alert("✅ บันทึกสำเร็จ!");
      form.reset();
      fetchAutoRequestNumber();
    } else {
      alert("❌ บันทึกไม่สำเร็จ: " + JSON.stringify(result.Failures));
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
});

loadDepartments();
fetchAutoRequestNumber();
