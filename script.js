let records=[];
const API="/api";
const $=id=>document.getElementById(id);
async function apiRequest(path, options={}){const response=await fetch(`${API}${path}`,{headers:{"Content-Type":"application/json",...(options.headers||{})},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);return data;}
async function loadRecords(){try{records=await apiRequest("/fsr");window.records=records;populateEngineers();render();}catch(err){console.error(err);alert("Cannot connect to backend. Please start app.py first.");}}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function populateEngineers(){const sel=$("engineer");[...new Set(records.map(r=>r.engineer))].sort().forEach(n=>{if(![...sel.options].some(o=>o.value===n)){const o=document.createElement("option");o.value=n;o.textContent=n;sel.appendChild(o)}})}
function filteredRecords(){const from=$("dateFrom").value,to=$("dateTo").value,eng=$("engineer").value,wo=$("workOrder").value.trim().toLowerCase(),status=$("activityStatus").value,sub=$("submitted").checked,not=$("notSubmitted").checked;return records.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&(!eng||r.engineer===eng)&&(!wo||r.wo.toLowerCase().includes(wo))&&(!status||r.status===status)&&((sub&&not)||(!sub&&!not)||(sub&&r.submitted)||(not&&!r.submitted)))}

function renderDashboardCharts(list){
  const statuses=["Completed","In Progress","Pending","Started","Cancelled"];
  const colors={"Completed":"green","In Progress":"progress","Pending":"pending","Started":"","Cancelled":"cancelled"};
  const statusCounts=statuses.map(status=>({status,count:list.filter(r=>r.status===status).length})).filter(x=>x.count>0 || ["Completed","Pending","In Progress"].includes(x.status));
  const maxStatus=Math.max(1,...statusCounts.map(x=>x.count));
  const statusEl=$("statusChart");if(statusEl)statusEl.innerHTML=statusCounts.map(x=>`<div class="chart-row"><span>${esc(x.status)}</span><div class="chart-track"><div class="chart-fill ${colors[x.status]}" style="width:${x.count/maxStatus*100}%"></div></div><strong>${x.count}</strong></div>`).join("");
  const submitted=list.filter(r=>r.submitted).length,pending=list.length-submitted,total=list.length,pct=total?Math.round(submitted/total*100):0;
  if($("chartSubmitted"))$("chartSubmitted").textContent=submitted;if($("chartPending"))$("chartPending").textContent=pending;if($("chartTotal"))$("chartTotal").textContent=total;if($("submittedPercent"))$("submittedPercent").textContent=pct+"%";
  if($("submissionDonut"))$("submissionDonut").style.background=`conic-gradient(#18864b 0 ${pct}%,#f59d0b ${pct}% 100%)`;
  const types=[...new Set(list.map(r=>r.type).filter(Boolean))].map(type=>({type,count:list.filter(r=>r.type===type).length})).sort((a,b)=>b.count-a.count).slice(0,6);const maxType=Math.max(1,...types.map(x=>x.count));
  if($("typeChart"))$("typeChart").innerHTML=types.length?types.map(x=>`<div class="chart-row"><span>${esc(x.type)}</span><div class="chart-track"><div class="chart-fill" style="width:${x.count/maxType*100}%"></div></div><strong>${x.count}</strong></div>`).join(""):'<p class="muted">No activity types match the filters.</p>';
}
function render(){const list=filteredRecords();renderDashboardCharts(list);$("activityRows").innerHTML=list.map(r=>`<tr><td><button type="button" class="activity-link" data-id="${esc(r.id)}">${esc(r.id)}</button></td><td>${esc(r.type)}</td><td><span class="pill" style="${r.status!=="Completed"?"background:#fff2cc;color:#8a5a00":""}">${esc(r.status)}</span></td><td>${esc(r.date)}</td><td>${esc(r.wo)}</td><td>${esc(r.sr)}</td><td>${esc(r.asset)}</td><td>${esc(r.customer)}</td><td>${esc(r.engineer)}</td><td>${esc(r.disable)}</td><td>${esc(r.saved)}</td><td>${esc(r.submit)}</td></tr>`).join("")||'<tr><td colspan="12" style="text-align:center;padding:28px">No records match your filters.</td></tr>';$("resultCount").textContent=`${list.length} record(s) found`;$("totalStat").textContent=list.length;$("submittedStat").textContent=list.filter(r=>r.submitted).length;$("pendingStat").textContent=list.filter(r=>!r.submitted).length}
function showPage(id){document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===id));document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===id));window.scrollTo({top:0,behavior:"smooth"})}
document.querySelectorAll(".nav button").forEach(b=>b.addEventListener("click",()=>showPage(b.dataset.page)));
$("searchBtn").addEventListener("click",render);
$("workOrder").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();render()}});
$("clearBtn").addEventListener("click",()=>{$("dateFrom").value="";$("dateTo").value="";$("engineer").value="";$("workOrder").value="";$("activityStatus").value="";$("submitted").checked=true;$("notSubmitted").checked=false;document.querySelector('input[name="range"][value="1"]').checked=true;render()});
document.querySelectorAll('input[name="range"]').forEach(r=>r.addEventListener("change",()=>{const months=Number(r.value);const end=new Date("2026-06-30T12:00:00");const start=new Date(end);start.setMonth(start.getMonth()-months);$("dateFrom").value=start.toISOString().slice(0,10);$("dateTo").value=end.toISOString().slice(0,10);render()}));
$("excelBtn").addEventListener("click",()=>{const list=filteredRecords();const headers=["Activity ID","Activity Type","Status","Activity Date","WO Number","WO SR Number","Asset Name","Customer Name","Engineer","FSR Disable","FSR Save","FSR Submit Date"];const rows=list.map(r=>[r.id,r.type,r.status,r.date,r.wo,r.sr,r.asset,r.customer,r.engineer,r.disable,r.saved,r.submit]);const csv=[headers,...rows].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8;"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="FSR_Activity_Report.csv";a.click();URL.revokeObjectURL(a.href)});
$("pdfBtn").addEventListener("click",()=>window.print());
$("backDashboard").addEventListener("click",()=>showPage("dashboard"));
$("fsrForm").addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(e.target);const payload={};for(const [key,value] of f.entries()){if(value instanceof File)continue;payload[key]=value;}["regular","overtime","travel","travelCost","mealCost","hotelCost","otherCost"].forEach(k=>payload[k]=Number(payload[k]||0));try{let created=await apiRequest("/fsr",{method:"POST",body:JSON.stringify(payload)});const files=$("attachments")?.files;if(files&&files.length){const uploadData=new FormData();for(const file of files)uploadData.append("files",file);const uploadResponse=await fetch(`${API}/fsr/${created.id}/attachments`,{method:"POST",body:uploadData});const uploadResult=await uploadResponse.json().catch(()=>({}));if(!uploadResponse.ok)throw new Error(uploadResult.error||"FSR saved, but attachment upload failed.");created=await apiRequest(`/fsr/${created.id}`);}records.unshift(created);window.records=records;populateEngineers();$("dateFrom").value="";$("dateTo").value="";$("engineer").value="";$("workOrder").value="";$("activityStatus").value="";$("submitted").checked=true;$("notSubmitted").checked=false;render();alert(`FSR #${created.id} saved to the database successfully.`);showPage("dashboard");e.target.reset();}catch(err){alert(err.message);}});

// Create FSR wizard: show one section at a time and navigate with Back / Next.
let wizardIndex = 0;
function showWizardStep(index) {
  const steps = [...document.querySelectorAll("#reportWizard .wizard-step")];
  if (!steps.length) return;
  wizardIndex = Math.max(0, Math.min(index, steps.length - 1));
  steps.forEach((step, i) => step.classList.toggle("wizard-current", i === wizardIndex));
  const titles = ["Activity Details", "Parts Used", "Parts Returned", "Labor Hours", "Expenses", "Problem / Error / Resolution", "Customer Signature & Attachments"];
  const label = $("wizardStepLabel"), title = $("wizardStepTitle"), bar = $("wizardProgressBar");
  if (label) label.textContent = `Step ${wizardIndex + 1} of ${steps.length}`;
  if (title) title.textContent = titles[wizardIndex] || `Step ${wizardIndex + 1}`;
  if (bar) bar.style.width = `${((wizardIndex + 1) / steps.length) * 100}%`;
  const back = $("wizardBack"), next = $("wizardNext"), submit = $("wizardSubmit");
  if (back) back.disabled = wizardIndex === 0;
  if (next) next.hidden = wizardIndex === steps.length - 1;
  if (submit) submit.hidden = wizardIndex !== steps.length - 1;
}
function validateWizardStep() {
  const step = document.querySelectorAll("#reportWizard .wizard-step")[wizardIndex];
  if (!step) return true;
  for (const field of step.querySelectorAll("input, select, textarea")) {
    if (!field.checkValidity()) { field.reportValidity(); field.focus(); return false; }
  }
  return true;
}
$("wizardBack")?.addEventListener("click", () => showWizardStep(wizardIndex - 1));
$("wizardNext")?.addEventListener("click", () => { if (validateWizardStep()) showWizardStep(wizardIndex + 1); });
$("fsrForm")?.addEventListener("reset", () => setTimeout(() => showWizardStep(0), 0));
showWizardStep(0);

loadRecords();

const summaryExportButton=document.getElementById("summaryExport");if(summaryExportButton){summaryExportButton.addEventListener("click",()=>window.print());}


/* Field Service Flow slideshow controls. This affects only the workflow page. */
(() => {
  const slider = document.getElementById("workflowSlider");
  if (!slider) return;
  const slides = [...slider.querySelectorAll(".workflow-slide")];
  const back = document.getElementById("workflowBack");
  const next = document.getElementById("workflowNext");
  const label = document.getElementById("workflowProgressLabel");
  const bar = document.getElementById("workflowProgressBar");
  const dots = document.getElementById("workflowDots");
  let current = 0;
  slides.forEach((slide, i) => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = slide.querySelector(".workflow-number")?.textContent || String(i + 1);
    button.title = slide.dataset.title || `Step ${i + 1}`;
    button.setAttribute("aria-label", `Open step ${button.textContent}: ${button.title}`);
    button.addEventListener("click", () => show(i));
    dots.appendChild(button);
  });
  function show(index) {
    current = Math.max(0, Math.min(index, slides.length - 1));
    slides.forEach((slide, i) => slide.classList.toggle("workflow-current", i === current));
    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle("selected", i === current);
      dot.setAttribute("aria-current", i === current ? "step" : "false");
    });
    back.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    next.textContent = current === slides.length - 1 ? "Finish ✓" : "Next →";
    label.textContent = `Step ${current + 1} of ${slides.length} — ${slides[current].dataset.title}`;
    bar.style.width = `${((current + 1) / slides.length) * 100}%`;
  }
  back.addEventListener("click", () => show(current - 1));
  next.addEventListener("click", () => {
    if (current < slides.length - 1) show(current + 1);
    else show(0);
  });
  show(0);
})();


/* Main page Previous / Next navigation.
   Keeps the existing workflow slideshow and report wizard unchanged. */
(() => {
  const pages = ["dashboard", "workflow", "report", "summary"];
  const back = document.getElementById("pageBack");
  const next = document.getElementById("pageNext");
  const label = document.getElementById("pageStep");

  if (!back || !next || !label) {
    console.warn("Main page navigation controls are missing from index.html.");
    return;
  }

  function updatePageNavigation() {
    const activePage = document.querySelector(".page.active");
    let index = pages.indexOf(activePage?.id);

    if (index < 0) index = 0;

    back.disabled = index === 0;
    next.disabled = index === pages.length - 1;
    label.textContent = `Page ${index + 1} of ${pages.length}`;
    next.textContent = index === pages.length - 1
      ? "Finish ✓"
      : "Next →";
  }

  back.addEventListener("click", () => {
    const index = pages.indexOf(
      document.querySelector(".page.active")?.id
    );
    if (index > 0) showPage(pages[index - 1]);
    updatePageNavigation();
  });

  next.addEventListener("click", () => {
    const index = pages.indexOf(
      document.querySelector(".page.active")?.id
    );
    if (index >= 0 && index < pages.length - 1) {
      showPage(pages[index + 1]);
    }
    updatePageNavigation();
  });

  document.querySelectorAll(".nav button").forEach(button => {
    button.addEventListener("click", updatePageNavigation);
  });

  updatePageNavigation();
})();
