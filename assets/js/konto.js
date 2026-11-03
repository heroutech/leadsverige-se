// LeadSverige kundsida. Inloggning med e-post (länk eller kod). Läser bara kundens egna leads (RLS).
// Betyg sparas via Edge Function "betyg" med kundens session.
(function () {
  var URL_ = "https://nthoscaezhoksdudedlq.supabase.co";
  var NYCKEL = "sb_publishable_Lo96z-PdHqL9Gxb4Va4jUg_OsaKOcsm"; // publik nyckel, RLS skyddar datan
  var FN = URL_ + "/functions/v1/betyg";
  var NAMN = { bra: "Träffar rätt", kanske: "Kanske", fel: "Fel" };
  var sb = window.supabase.createClient(URL_, NYCKEL, { auth: { persistSession: true, detectSessionInUrl: true } });
  window.lsKonto = sb; // för test
  var $ = function (id) { return document.getElementById(id); };
  var epost = "", leveranser = [], senaste = {}, flik = "nya", ko = [];
  function visa(id) { $(id).classList.remove("kk-dold"); }
  function dolj(id) { $(id).classList.add("kk-dold"); }
  function meddela(text, typ) { var m = $("meddelande"); m.textContent = text || ""; m.className = "kk-meddelande" + (typ ? " " + typ : "") + (text ? "" : " kk-dold"); }

  $("form-epost").addEventListener("submit", function (ev) {
    ev.preventDefault();
    epost = $("epost").value.trim().toLowerCase();
    $("skicka-kod").disabled = true;
    sb.auth.signInWithOtp({ email: epost, options: { shouldCreateUser: false, emailRedirectTo: location.origin + "/konto/" } }).then(function (r) {
      $("skicka-kod").disabled = false;
      if (r.error) { meddela("Vi kunde inte skicka någon kod. Kontrollera adressen. Har du inget konto än? Mejla hej@leadsverige.se.", "fel"); return; }
      dolj("form-epost"); visa("form-kod"); $("kod").focus();
      meddela("Vi har mejlat en inloggningslänk och en kod till " + epost + ". Klicka på länken eller skriv koden här.", "");
    });
  });
  $("form-kod").addEventListener("submit", function (ev) {
    ev.preventDefault();
    var kod = $("kod").value.replace(/\D/g, "");
    sb.auth.verifyOtp({ email: epost, token: kod, type: "email" }).then(function (r) {
      if (r.error) { meddela("Koden stämmer inte eller har gått ut. Försök igen eller be om en ny kod.", "fel"); return; }
      meddela(""); start();
    });
  });
  $("ny-kod").addEventListener("click", function () { dolj("form-kod"); visa("form-epost"); meddela(""); });
  $("logga-ut").addEventListener("click", function () { sb.auth.signOut().then(function () { location.reload(); }); });
  document.querySelectorAll(".kk-flikar button").forEach(function (k) {
    k.addEventListener("click", function () { flik = k.dataset.flik; rita(); });
  });
  ["filter-bransch", "filter-ort"].forEach(function (id) { $(id).addEventListener("change", rita); });

  var startar = false;
  function start() {
    if (startar) return; startar = true;
    sb.auth.getSession().then(function (s) {
      if (!s.data.session) { startar = false; visa("inloggning"); return; }
      dolj("inloggning");
      Promise.all([
        sb.from("kunder").select("firma").maybeSingle(),
        sb.from("leveranser").select("id, kortnummer, passform, leverans_namn, leveransdatum, leads(bestallare, ort, bransch, rubrik, varde_text, sista_text, sista_dag, lank, kontakt)").order("leveransdatum", { ascending: false }),
        sb.from("betyg").select("leverans_id, betyg, skapad").order("skapad", { ascending: true })
      ]).then(function (r) {
        if (r[1].error) { meddela("Vi kunde inte hämta dina leads just nu. Försök igen om en stund.", "fel"); return; }
        $("firma").textContent = r[0].data ? r[0].data.firma : "Inget kundkonto kopplat till " + (s.data.session.user.email || "adressen");
        leveranser = r[1].data || [];
        senaste = {}; (r[2].data || []).forEach(function (b) { senaste[b.leverans_id] = b.betyg; });
        fyllFilter(); visa("inloggad"); rita();
      });
    });
  }
  function fyllFilter() {
    [["filter-bransch", "bransch"], ["filter-ort", "ort"]].forEach(function (p) {
      var sel = $(p[0]), varden = {};
      leveranser.forEach(function (l) { if (l.leads && l.leads[p[1]]) varden[l.leads[p[1]]] = 1; });
      sel.length = 1; Object.keys(varden).sort().forEach(function (v) { sel.add(new Option(v, v)); });
    });
  }
  function filtrerade() {
    var b = $("filter-bransch").value, o = $("filter-ort").value;
    return leveranser.filter(function (l) { return l.leads && (!b || l.leads.bransch === b) && (!o || l.leads.ort === o); });
  }
  function kortHtml(l) {
    var d = l.leads, e = function (s) { var x = document.createElement("span"); x.textContent = s == null ? "" : s; return x.innerHTML; };
    return '<p class="kk-etikett">Lead ' + e(l.kortnummer) + " · " + e(l.passform || "") + '</p>' +
      '<p class="kk-titel">' + e(d.bestallare) + ' <span>· ' + e(d.ort) + '</span></p>' +
      '<p class="kk-rad">' + e(d.rubrik) + '</p>' +
      '<p class="kk-rad kk-liten">Värde ' + e(d.varde_text || "ej angivet") + " · Sista dag " + e(d.sista_text || d.sista_dag || "") + '</p>' +
      (d.lank ? '<p class="kk-rad"><a href="' + e(d.lank) + '" target="_blank" rel="noopener">Läs upphandlingen</a> <span class="kk-liten">· Kontakt: ' + e(d.kontakt || "") + '</span></p>' : "");
  }
  function rita() {
    document.querySelectorAll(".kk-flikar button").forEach(function (k) { k.setAttribute("aria-selected", String(k.dataset.flik === flik)); });
    var lista = filtrerade();
    ko = lista.filter(function (l) { return !senaste[l.id]; });
    $("antal-nya").textContent = ko.length;
    if (flik === "nya") { dolj("historik"); visa("svajp-yta"); ritaKort(); }
    else { dolj("svajp-yta"); visa("historik"); ritaHistorik(lista); }
  }
  function ritaKort() {
    var yta = $("svajp"), l = ko[0];
    if (!l) { yta.innerHTML = '<div class="kk-kort"><p class="kk-titel">Inga fler leads att betygsätta just nu.</p><p class="kk-rad kk-liten">Tack! Du kan ändra dina betyg under Historik.</p></div>'; dolj("svajp-knappar"); return; }
    visa("svajp-knappar");
    yta.innerHTML = '<div class="kk-kort" id="aktuellt" tabindex="0" aria-label="Lead att betygsätta. Svajpa höger för Träffar rätt, vänster för Fel.">' + kortHtml(l) + '<span class="kk-stampel" id="stampel"></span></div>';
    draKort($("aktuellt"), l);
  }
  function draKort(el, l) {
    var x0 = null, dx = 0;
    el.addEventListener("pointerdown", function (ev) { if (ev.target.closest("a")) return; x0 = ev.clientX; dx = 0; el.classList.add("dra"); el.setPointerCapture(ev.pointerId); });
    el.addEventListener("pointermove", function (ev) {
      if (x0 === null) return; dx = ev.clientX - x0;
      el.style.transform = "translateX(" + dx + "px) rotate(" + dx / 25 + "deg)";
      var s = $("stampel"); s.style.opacity = Math.min(Math.abs(dx) / 100, 1);
      s.textContent = dx > 0 ? "Träffar rätt" : "Fel"; s.style.color = s.style.borderColor = dx > 0 ? "#14633A" : "#9B1C1C";
    });
    function slapp() {
      if (x0 === null) return; x0 = null; el.classList.remove("dra");
      if (Math.abs(dx) > 100) { el.style.transform = "translateX(" + (dx > 0 ? 600 : -600) + "px)"; betygsatt(l, dx > 0 ? "bra" : "fel"); }
      else { el.style.transform = ""; $("stampel").style.opacity = 0; }
    }
    el.addEventListener("pointerup", slapp); el.addEventListener("pointercancel", slapp);
    el.addEventListener("keydown", function (ev) { if (ev.key === "ArrowRight") betygsatt(l, "bra"); if (ev.key === "ArrowLeft") betygsatt(l, "fel"); if (ev.key === "ArrowDown") betygsatt(l, "kanske"); });
  }
  document.querySelectorAll("#svajp-knappar button").forEach(function (k) { k.addEventListener("click", function () { if (ko[0]) betygsatt(ko[0], k.dataset.b); }); });
  function betygsatt(l, b) {
    return sb.auth.getSession().then(function (s) {
      if (!s.data.session) { location.reload(); return; }
      return fetch(FN, { method: "POST", headers: { "Content-Type": "application/json", "Authorization": "Bearer " + s.data.session.access_token, "apikey": NYCKEL },
        body: JSON.stringify({ atgard: "betyg", leverans_id: l.id, betyg: b }) }).then(function (r) { return r.json(); }).then(function (r) {
        if (!r.ok) { meddela("Betyget kunde inte sparas. Försök igen.", "fel"); rita(); return; }
        senaste[l.id] = b; meddela("Sparat: Lead " + l.kortnummer + " – " + NAMN[b] + ".", "ok"); setTimeout(rita, 180);
      });
    }).catch(function () { meddela("Betyget kunde inte sparas. Försök igen.", "fel"); rita(); });
  }
  function ritaHistorik(lista) {
    var ul = $("historik-lista"); ul.innerHTML = "";
    if (!lista.length) { ul.innerHTML = "<li>Inga leads ännu.</li>"; return; }
    lista.forEach(function (l) {
      var li = document.createElement("li"), b = senaste[l.id];
      li.innerHTML = '<div><strong>Lead ' + l.kortnummer + '</strong> ' + '<span></span></div><div class="kk-val" style="margin:0"></div>';
      li.querySelector("span").textContent = l.leads.bestallare + " · " + l.leads.ort + " (" + l.leverans_namn + ")";
      var val = li.querySelector(".kk-val");
      ["bra", "kanske", "fel"].forEach(function (x) {
        var k = document.createElement("button"); k.type = "button"; k.dataset.b = x; k.textContent = NAMN[x]; k.setAttribute("aria-pressed", String(b === x));
        k.style.flex = "0 0 auto"; k.style.padding = ".55em .9em"; k.style.fontSize = ".9rem";
        k.addEventListener("click", function () { betygsatt(l, x); }); val.appendChild(k);
      });
      ul.appendChild(li);
    });
  }
  sb.auth.onAuthStateChange(function (ev) { if (ev === "SIGNED_IN" && $("inloggad").classList.contains("kk-dold")) start(); });
  start();
})();
