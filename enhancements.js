// Enhancements: clickable activity IDs, FSR summary tabs, attachments list and signature pad.
(() => {
  const $ = id => document.getElementById(id);
  let activeRecord = null;
  const fileInput = $("attachments"), fileList = $("selectedFiles");
  if (fileInput) fileInput.addEventListener("change", () => {
    fileList.innerHTML = [...fileInput.files].map(f => `<li>${safe(f.name)} (${(f.size/1024).toFixed(1)} KB)</li>`).join("");
    const hidden = $("attachmentNamesHidden");
    if (hidden) hidden.value = [...fileInput.files].map(f=>f.name).join("; ");
  });
  const safe = s => String(s ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  // Add fields so the REST API persists signature data and attachment filenames.
  const form = $("fsrForm");
  if (form) {
    [["attachmentNamesHidden","attachmentNames"],["signatureDataHidden","signatureData"]].forEach(([id,name])=>{
      if (!$(id)) { const input=document.createElement("input");input.type="hidden";input.id=id;input.name=name;form.appendChild(input); }
    });
  }
  // Signature drawing pad
  const canvas=$("signatureCanvas");
  if(canvas){
    const ctx=canvas.getContext("2d");ctx.strokeStyle="#153b70";ctx.lineWidth=2.5;ctx.lineCap="round";
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    let drawing=false,hasInk=false;
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height};};
    canvas.addEventListener("pointerdown",e=>{drawing=true;hasInk=true;canvas.setPointerCapture(e.pointerId);const p=point(e);ctx.beginPath();ctx.moveTo(p.x,p.y);});
    canvas.addEventListener("pointermove",e=>{if(!drawing)return;const p=point(e);ctx.lineTo(p.x,p.y);ctx.stroke();});
    ["pointerup","pointercancel"].forEach(ev=>canvas.addEventListener(ev,()=>{drawing=false;if($("signatureDataHidden"))$("signatureDataHidden").value=hasInk?canvas.toDataURL("image/png"):"";if($('signature'))$('signature').value=hasInk?"Yes":"No";}));
    $("clearSignature")?.addEventListener("click",()=>{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);hasInk=false;$("signatureDataHidden").value="";if($('signature'))$('signature').value="No";});
  }
  // Add an explicit hidden name field for attachment labels.
  if(fileInput && !fileInput.multiple) fileInput.multiple=true;
  document.addEventListener("click", async e=>{
    const idButton=e.target.closest(".activity-link");
    if(idButton){
      const rec=(window.records||[]).find(r=>String(r.id)===idButton.dataset.id);
      if(!rec)return;
      activeRecord=rec;
      $("modalTitle").textContent=`Activity ${rec.id} — ${rec.wo}`;
      const fields=[["Activity ID",rec.id],["Activity Type",rec.type],["Status",rec.status],["Activity Date",rec.date],["Work Order",rec.wo],["Service Request",rec.sr],["Asset",rec.asset],["Customer",rec.customer],["Engineer",rec.engineer],["Work Description",rec.description],["Parts Used",rec.parts],["Parts Used Details",rec.partsDetails],["Parts Returned",rec.returned],["Parts Returned Details",rec.returnedDetails],["Tools / Equipment",rec.tools],["Regular Hours",rec.regular],["Overtime Hours",rec.overtime],["Travel Time (hours)",rec.travel],["Travel Expense (₹)",rec.travelCost],["Meal Expense (₹)",rec.mealCost],["Hotel Stay (₹)",rec.hotelCost],["Other Expenses (₹)",rec.otherCost],["Problem Code",rec.problem],["Error Code",rec.error],["Resolution Code",rec.resolution],["Resolution Description",rec.resolutionText],["Customer Name / Signer",rec.signer],["Customer Signature",rec.signature],["Service Notes",rec.notes],["Attachments",rec.attachmentNames],["FSR Disable",rec.disable],["FSR Save",rec.saved],["FSR Submit Date",rec.submit]];
      $("modalBody").innerHTML=`<div class="detail-grid">${fields.map(([k,v])=>`<div><small>${safe(k)}</small><strong>${safe(v||"—")}</strong></div>`).join("")}</div><div class="actions"><button class="btn primary" id="openRecordSummary">Open FSR Summary</button></div>`;
      $("activityModal").hidden=false;
      return;
    }
    if(e.target.closest("#closeModal"))$("activityModal").hidden=true;
    if(e.target.closest("#openRecordSummary") && activeRecord){
      $("activityModal").hidden=true;
      const r=activeRecord;
      const h=(label,val)=>`<div class="detail-grid"><div><small>${safe(label)}</small><strong>${safe(val||"—")}</strong></div></div>`;
      $("summaryNotice").innerHTML=`<h2>FSR Summary — Activity ${safe(r.id)}</h2><p><b>Customer:</b> ${safe(r.customer)} &nbsp; <b>Asset:</b> ${safe(r.asset)} &nbsp; <b>Work Order:</b> ${safe(r.wo)}</p><p><b>Status:</b> ${safe(r.status)} &nbsp; <b>Engineer:</b> ${safe(r.engineer)}</p><div id="tabContent"></div>`;
      $("summary").dataset.activeId=r.id;
      const staticSummary=$("summary").querySelector(".summary-layout");if(staticSummary)staticSummary.style.display="none";
      renderTab("Overview",r);showPage("summary");
    }
    const navButton=e.target.closest('.nav button[data-page="summary"]');
    if(navButton && !$("summary").dataset.activeId){const staticSummary=$("summary").querySelector(".summary-layout");if(staticSummary)staticSummary.style.display="";}
    const tab=e.target.closest("#summaryTabs button");
    if(tab){
      document.querySelectorAll("#summaryTabs button").forEach(b=>b.classList.toggle("selected",b===tab));
      let r=(window.records||[]).find(x=>String(x.id)===$("summary").dataset.activeId);
      if(!r) r=(window.records||[])[0];
      if(r){
        activeRecord=r;
        $("summary").dataset.activeId=r.id;
        const staticSummary=$("summary").querySelector(".summary-layout");if(staticSummary)staticSummary.style.display="none";
        if($("summaryNotice"))$("summaryNotice").innerHTML=`<h2>FSR Summary — Activity ${safe(r.id)}</h2><p><b>Customer:</b> ${safe(r.customer)} &nbsp; <b>Asset:</b> ${safe(r.asset)} &nbsp; <b>Work Order:</b> ${safe(r.wo)}</p><p><b>Status:</b> ${safe(r.status)} &nbsp; <b>Engineer:</b> ${safe(r.engineer)}</p><div id="tabContent"></div>`;
        renderTab(tab.dataset.tab,r);
      }
    }
  });
  function renderTab(tab,r){
    const target=$("tabContent"); if(!target)return;
    const item=(k,v)=>`<div class="detail-item"><small>${safe(k)}</small><strong>${safe(v===0?0:(v||"—"))}</strong></div>`;
    const parts={
      "Overview":[["Activity ID",r.id],["Work Order",r.wo],["Service Request",r.sr],["Activity Type",r.type],["Status",r.status],["Activity Date",r.date],["Customer",r.customer],["Asset",r.asset],["Engineer",r.engineer],["Work Description",r.description],["Total Labor Hours",(Number(r.regular)||0)+(Number(r.overtime)||0)],["Total Parts Used",r.parts],["Total Expenses (₹)",(Number(r.travelCost)||0)+(Number(r.mealCost)||0)+(Number(r.hotelCost)||0)+(Number(r.otherCost)||0)],["Customer Signature",r.signature],["Customer Representative",r.signer],["FSR Submit Date",r.submit]],
      "Parts":[["Parts Used",r.parts],["Quantity / Serial or Lot",r.partsDetails],["Parts Returned",r.returned],["Returned Quantity / Condition",r.returnedDetails],["Tools / Equipment",r.tools]],
      "Labor":[["Regular Hours",r.regular],["Overtime Hours",r.overtime],["Travel Time (hours)",r.travel],["Total Labor Hours",(Number(r.regular)||0)+(Number(r.overtime)||0)]],
      "Expenses":[["Travel (₹)",r.travelCost],["Meals (₹)",r.mealCost],["Hotel Stay (₹)",r.hotelCost],["Other Expenses (₹)",r.otherCost],["Total Expenses (₹)",(Number(r.travelCost)||0)+(Number(r.mealCost)||0)+(Number(r.hotelCost)||0)+(Number(r.otherCost)||0)]],
      "Codes":[["Problem Code",r.problem],["Error Code",r.error],["Resolution Code",r.resolution],["Resolution Description",r.resolutionText]],
      "Attachments":[["Attachment filenames",r.attachmentNames],["Customer signature",r.signature],["Service notes",r.notes]],
      "Audit Trail":[["FSR Saved",r.saved],["FSR Disabled",r.disable],["Submission timestamp",r.submit],["Submitted",r.submitted?"Yes":"No"]]
    };
    target.innerHTML=`<div class="detail-grid">${(parts[tab]||parts.Overview).map(([k,v])=>item(k,v)).join("")}</div>`;
    if(tab==="Attachments"){
      let attachments=[];try{attachments=JSON.parse(r.attachmentsJson||"[]")}catch(_e){}
      const links=attachments.map(a=>`<li><a href="${safe(a.url)}" target="_blank" rel="noopener">${safe(a.name)}</a> <span>${Math.max(1,Math.round((Number(a.size)||0)/1024))} KB</span></li>`).join("");
      const sig=r.signatureData?`<div class="report-section"><h3>Customer Signature</h3><img alt="Customer signature" src="${safe(r.signatureData)}" style="max-width:100%;max-height:180px;background:#fff;border:1px solid #d7e0eb;border-radius:6px;padding:8px"></div>`:"";
      target.insertAdjacentHTML("beforeend",`${links?`<ul class="attachment-list">${links}</ul>`:"<p class=\"muted\">No uploaded files for this report.</p>"}${sig}`);
    }
  }
})();
