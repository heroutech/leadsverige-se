// LeadSverige tacksida. Att öppna sidan sparar inget. Betyget sparas först när man trycker "Spara betyg".
(function () {
  var FN = "https://nthoscaezhoksdudedlq.supabase.co/functions/v1/betyg";
  var NAMN = { bra: "Träffar rätt", kanske: "Kanske", fel: "Fel" };
  var q = new URLSearchParams(location.search);
  var t = q.get("t") || "", valt = q.get("b") || "";
  var $ = function (id) { return document.getElementById(id); };
  function visa(id) { $(id).classList.remove("kk-dold"); }
  function dolj(id) { $(id).classList.add("kk-dold"); }
  function meddela(text, typ) { var m = $("meddelande"); m.textContent = text; m.className = "kk-meddelande" + (typ ? " " + typ : ""); }
  var FEL = {
    ogiltig_lank: "Länken fungerar inte. Kontrollera att hela länken kom med, eller svara på mejlet med numret och ditt betyg.",
    utgangen: "Länken har gått ut. Svara gärna på mejlet med numret och ditt betyg i stället.",
    for_manga: "Vi har tagit emot många betyg för det här leadet i dag. Försök igen i morgon eller svara på mejlet.",
    ogiltigt_betyg: "Välj Träffar rätt, Kanske eller Fel.",
    server: "Något gick fel hos oss. Försök igen om en stund eller svara på mejlet."
  };
  function post(body) {
    return fetch(FN, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { ok: false, fel: "server" }; }); });
  }
  function valj(b) {
    valt = b;
    document.querySelectorAll(".kk-val button").forEach(function (k) { k.setAttribute("aria-pressed", String(k.dataset.b === b)); });
    $("spara").disabled = !NAMN[b];
  }
  document.querySelectorAll(".kk-val button").forEach(function (k) { k.addEventListener("click", function () { valj(k.dataset.b); }); });
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(t)) { dolj("laddar"); meddela(FEL.ogiltig_lank, "fel"); return; }
  post({ atgard: "visa", t: t }).then(function (r) {
    dolj("laddar");
    if (!r.ok) { meddela(FEL[r.fel] || FEL.server, "fel"); return; }
    var l = r.lead;
    $("etikett").textContent = "Lead " + l.kortnummer;
    $("titel").firstChild.textContent = (l.bestallare || "") + " ";
    $("ort").textContent = l.ort ? "· " + l.ort : "";
    $("rubrik").textContent = l.rubrik || "";
    if (l.senaste && NAMN[l.senaste.betyg]) { $("tidigare").textContent = "Ditt senaste betyg: " + NAMN[l.senaste.betyg] + ". Du kan ändra det här."; visa("tidigare"); }
    visa("formular");
    valj(NAMN[valt] ? valt : "");
  });
  $("spara").addEventListener("click", function () {
    if (!NAMN[valt]) return;
    $("spara").disabled = true;
    post({ atgard: "betyg", t: t, betyg: valt, kommentar: $("kommentar").value }).then(function (r) {
      if (!r.ok) { $("spara").disabled = false; meddela(FEL[r.fel] || FEL.server, "fel"); return; }
      dolj("formular");
      meddela("Tack! Ditt betyg är sparat: " + NAMN[r.betyg] + ". Vi använder det för att göra nästa urval bättre.", "ok");
      visa("efter");
    }).catch(function () { $("spara").disabled = false; meddela(FEL.server, "fel"); });
  });
})();
