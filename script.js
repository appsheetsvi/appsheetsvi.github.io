// ✅ ตรวจสอบการล็อกอินจาก localStorage
const user = JSON.parse(localStorage.getItem("user"));

if (!user || !user.EmpCode) {
  alert("กรุณาเข้าสู่ระบบก่อน");
  window.location.href = "index.html";
} else {
  const empCode = user.EmpCode;
  const empName = `${user.TitleName || ""} ${user.EmpName || ""} ${user.LastName || ""}`;
  document.getElementById("empCode").textContent = `${empCode} ${empName}`;
}

// ✅ ค่าคงที่
const appId = "ae5d7dce-1c12-4c53-b201-5a2d7c5b5411";
const apiKey = "V2-b1wGR-Nj1SR-0MhEx-QWCHT-Mllly-cZnc9-PHCAK-r1f85";
const baseUrl = `https://api.appsheet.com/api/v2/apps/${appId}/tables/`;
const jobTypeMap = new Map();

// ✅ ดึงข้อมูลจากตาราง
async function fetchFromTable(table){
  const res = await fetch(`${baseUrl}${table}/Find`, {
    method:'POST',
    headers:{
      "Content-Type":"application/json",
      "ApplicationAccessKey":apiKey
    },
    body: JSON.stringify({})
  });
  return res.ok ? await res.json() : [];
}

// ✅ โหลดข้อมูล dropdown และเลขแจ้งซ่อม
async function init(){
  const empCode = user.EmpCode;

  // 1. ดึงเลขที่ใบแจ้งซ่อม
  const ms = await fetchFromTable('Machinesymptom');
  const last = ms.map(r=>r['เลขที่ใบแจ้งซ่อม']).filter(Boolean).sort().pop();
  const next = last ? String(parseInt(last)+1).padStart(7,'0') : '2506001';
  document.getElementById('requestNumber').value = next;

  // 2. โหลดหน่วยงาน
  const depts = await fetchFromTable('Department');
  const sd = document.getElementById('deptSelect');
  sd.innerHTML=`<option value="">-- เลือกหน่วยงาน --</option>`;
  depts.filter(d=>d.DeptNameEng).sort((a,b)=>a.DeptNameEng.localeCompare(b.DeptNameEng))
    .forEach(d=> sd.innerHTML+=`<option value="${d.DeptCode}">${d.DeptNameEng}</option>`);

  // 3. โหลดชนิดงาน
  const jts = await fetchFromTable('MachineJobType');
  const sj = document.getElementById('jobTypeSelect');
  sj.innerHTML=`<option value="">-- เลือกชนิดงาน --</option>`;
  jts.forEach(j=>{
    jobTypeMap.set(j['ชนิดงาน'], j['รหัสงาน']);
    sj.innerHTML+=`<option value="${j['ชนิดงาน']}">${j['ชนิดงาน']}</option>`;
  });

  // 4. โหลดเครื่องจักรตามแผนก
  sd.addEventListener('change', async ()=>{
    const ms = await fetchFromTable('MachineMaster');
    const sm = document.getElementById('machineSelect');
    sm.innerHTML=`<option value="">-- เลือกรหัสเครื่อง --</option>`;
    ms.filter(m=>m.DeptCode === sd.value)
      .forEach(m=> sm.innerHTML+=`<option value="${m['รหัสเครื่อง']}">${m['รหัสเครื่อง']} – ${m['รายชื่อเครื่องจักร']}</option>`);
  });
}

// ✅ เพิ่มอะไหล่ในฟอร์ม
function addPart(){
  const c = document.getElementById('partsContainer');
  const div = document.createElement('div');
  div.className='part-row';
  div.innerHTML=`
    <input type="text" name="รายการอะไหล่[]" placeholder="ชื่ออะไหล่" required/>
    <input type="number" name="จำนวน[]" placeholder="จำนวน" required/>
    <input type="text" name="หน่วย[]" placeholder="หน่วย" required/>
    <button type="button" class="remove-btn" onclick="this.parentElement.remove()">×</button>
  `;
  c.appendChild(div);
}

// ✅ เมื่อกดบันทึก
document.getElementById('techForm').addEventListener('submit', async e=>{
  e.preventDefault();

  const empCode = user.EmpCode;

  const f = new FormData(e.target);
  const main = {};
  f.forEach((v,k)=>{ if(!k.includes('[]')) main[k]=v; });
  main.EmpCode = empCode;

  if(jobTypeMap.has(main['ชนิดงาน'])) {
    main['ชนิดงาน'] = jobTypeMap.get(main['ชนิดงาน']);
  }

  const names = f.getAll('รายการอะไหล่[]');
  const nums = f.getAll('จำนวน[]');
  const units = f.getAll('หน่วย[]');

  const parts = names.map((nm,i)=>({
    'เลขที่ใบแจ้งซ่อม': main['เลขที่ใบแจ้งซ่อม'],
    EmpCode: empCode,
    'รายการอะไหล่': nm,
    จำนวน: nums[i],
    หน่วย: units[i]
  }));

  try {
    // บันทึกช่าง
    await fetch(`${baseUrl}RepairTechnicians/Action`,{
      method:'POST', headers:{
        "Content-Type":"application/json",
        "ApplicationAccessKey":apiKey
      },
      body: JSON.stringify({Action:'Add',Properties:{Locale:'th-TH'},Rows:[main]})
    });

    // บันทึกอะไหล่
    if(parts.length){
      await fetch(`${baseUrl}RepairParts/Action`,{
        method:'POST', headers:{
          "Content-Type":"application/json",
          "ApplicationAccessKey":apiKey
        },
        body: JSON.stringify({Action:'Add',Properties:{Locale:'th-TH'},Rows:parts})
      });
    }

    alert('✅ บันทึกเรียบร้อย');
    window.location.reload();

  } catch(err){
    alert('❌ เกิดข้อผิดพลาด: ' + err);
  }
});

// เรียกใช้งาน
init();
