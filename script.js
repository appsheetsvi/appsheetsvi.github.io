const appId = "ae5d7dce-1c12-4c53-b201-5a2d7c5b5411";
const apiKey = "V2-b1wGR-Nj1SR-0MhEx-QWCHT-Mllly-cZnc9-PHCAK-r1f85";

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
  const select = document.querySelector("[name='หน่วยงาน']");
  select.innerHTML = '<option value="">-- เลือกแผนก --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item.DeptCode}">${item.DeptName}</option>`;
  });
}

async function loadMachines(deptCode) {
  if (!deptCode) {
    document.querySelector("[name='รหัสเครื่อง']").innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
    return;
  }
  const list = await fetchFromTable("MachineMaster", { DeptCode: deptCode });
  const select = document.querySelector("[name='รหัสเครื่อง']");
  select.innerHTML = '<option value="">-- เลือกเครื่องจักร --</option>';
  list.forEach(item => {
    select.innerHTML += `<option value="${item['รหัสเครื่อง']}">${item['รายชื่อเครื่องจักร']}</option>`;
  });
}

async function fetchAutoRequestNumber() {
  const rows = await fetchFromTable("Machinesymptom");
  if (rows.length > 0) {
    // สมมติเลขที่ใบแจ้งซ่อมรูปแบบ REQ-YYYYNNN
    const max = rows
      .map(r => r["เลขที่ใบแจ้งซ่อม"])
      .filter(Boolean)
      .sort()
      .pop();

    const nextNum = max ? parseInt(max.replace(/[^\d]/g, ""), 10) + 1 : 1;
    const requestNumber = "" + String(nextNum).padStart(7, "0");
    document.querySelector("[name='เลขที่ใบแจ้งซ่อม']").value = requestNumber;
  } else {
    document.querySelector("[name='เลขที่ใบแจ้งซ่อม']").value = "0000001";
  }
}

document.querySelector("[name='หน่วยงาน']").addEventListener("change", e => {
  const deptCode = e.target.value;
  loadMachines(deptCode);
});

document.getElementById("repairForm").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.target;
  const data = Object.fromEntries(new FormData(form).entries());

  console.log("Data to submit:", data);

  const payload = {
    Action: "Add",
    Properties: { Locale: "th-TH" },
    Rows: [data]
  };

  console.log("Payload to API:", JSON.stringify(payload, null, 2));

  try {
    const res = await fetch(`https://api.appsheet.com/api/v2/apps/${appId}/tables/Machinesymptom/Action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ApplicationAccessKey": apiKey,
      },
      body: JSON.stringify(payload),
    });

    const rawText = await res.text();
    console.log("Raw response text:", rawText);

    let result = null;
    if (rawText) {
      result = JSON.parse(rawText);
      console.log("Parsed JSON:", result);
    } else {
      console.log("Empty response from API");
    }

    if (res.ok && (!result || !result.Failures || result.Failures.length === 0)) {
      alert("✅ บันทึกสำเร็จ!");
      form.reset();
      fetchAutoRequestNumber();
    } else {
      alert("❌ บันทึกไม่สำเร็จ: " + (result ? JSON.stringify(result.Failures) : "ไม่มีข้อมูลตอบกลับจาก API"));
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
});

loadDepartments();
fetchAutoRequestNumber();
