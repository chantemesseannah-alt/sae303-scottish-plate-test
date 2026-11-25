"use strict"; // mode strict : le navigateur signale plus d'erreurs

// ===== 1. LES DONNÉES =====
// Scores en % de l'objectif officiel
const LABELS = ["Saturated fat", "Salt", "Added sugar", "Fibre"];
const HOME_DATA = [135, 108, 109, 55];     // ⚠ vérifie graisses et sucre dans ton tableur
const WITH_OUT_DATA = [135, 118, 109, 61]; // maison + repas à l'extérieur

// L'objectif officiel de chaque nutriment (sert à afficher les vraies quantités)
const TARGETS = [
  { amount: 11, unit: "% of energy", type: "limit" },
  { amount: 6, unit: " g", type: "limit" },
  { amount: 11, unit: "% of energy", type: "limit" },
  { amount: 23, unit: " g", type: "target" }
];

const INFOS = [
  "Saturated fat hides in butter, cheese, fatty meat, pies, pastries and cakes.",
  "Around 75% of our salt is already in packaged foods: bread, cereal and ready meals.",
  "Added sugar comes from sweets, cakes, biscuits and sugary drinks.",
  "Fibre comes from wholemeal bread, porridge oats, fruit, veg and pulses."
];

// Couleurs des 2 séries : pleines au départ, un peu transparentes au survol
const RED = "#b71c1c";                         // rouge foncé : à la maison
const RED_HOVER = "rgba(183, 28, 28, 0.6)";
const NAVY = "#24304f";                        // bleu nuit : avec les repas à l'extérieur
const NAVY_HOVER = "rgba(36, 48, 79, 0.6)";

let showTarget = true; // la ligne de l'objectif est-elle visible ?

// Si le visiteur a demandé moins d'animations dans son système, on les coupe
// (accessibilité + moins de calculs = moins d'énergie)
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// On récupère les éléments HTML une seule fois
const canvas = document.getElementById("plate-chart");
const chartInfo = document.getElementById("chart-info");
const btnOut = document.getElementById("toggle-out");
const btnTarget = document.getElementById("toggle-target");

// Texte de l'infobulle : la vraie quantité achetée, ex. "7.1 g a day (limit: 6 g)"
function describe(i, value) {
  const target = TARGETS[i];
  const amount = (value * target.amount / 100).toFixed(1);
  return amount + target.unit + " a day (" + target.type + ": " + target.amount + target.unit + ")";
}


// ===== 2. LE DESSIN EN PLUS : LIGNE D'OBJECTIF + VALEURS =====
// Un plugin Chart.js = du dessin ajouté après les barres
const extras = {
  id: "extras",
  afterDatasetsDraw(chart) {
    const { ctx, chartArea, scales } = chart;
    ctx.save();

    // La ligne horizontale de l'objectif, à 100 %
    if (showTarget) {
      const y = scales.y.getPixelForValue(100);
      ctx.strokeStyle = "#111";
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(chartArea.left, y);
      ctx.lineTo(chartArea.right, y);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "#111";
      ctx.font = "bold 13px Arial";
      ctx.textAlign = "right";
      ctx.fillText("Target (100%)", chartArea.right, y - 6);
    }

    // La valeur écrite au-dessus de chaque barre
    ctx.fillStyle = "#111";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    chart.data.datasets.forEach((dataset, d) => {
      if (!chart.isDatasetVisible(d)) return;
      chart.getDatasetMeta(d).data.forEach((bar, i) => {
        ctx.fillText(dataset.data[i] + "%", bar.x, bar.y - 6);
      });
    });

    ctx.restore();
  }
};


// ===== 3. LE GRAPHIQUE CHART.JS (Grouped Bar Chart, fonction "Comparison" du Dataviz Project) =====
// Pour chaque nutriment : 2 barres côte à côte (maison / maison + extérieur)
const chart = new Chart(canvas, {
  type: "bar",
  plugins: [extras],
  data: {
    labels: LABELS,
    datasets: [
      {
        label: "Food bought for home",
        data: [0, 0, 0, 0], // les barres partent de 0, GSAP les fait monter (partie 6)
        backgroundColor: RED,
        hoverBackgroundColor: RED_HOVER // couleur au survol
      },
      {
        label: "Including eating out",
        data: [0, 0, 0, 0],
        backgroundColor: NAVY,
        hoverBackgroundColor: NAVY_HOVER,
        hidden: true // cachée au départ : le bouton "Add eating out" la fait apparaître
      }
    ]
  },
  options: {
    maintainAspectRatio: false,
    animation: reduceMotion ? false : { duration: 800 },
    // RIGUEUR : l'axe commence à 0 et le maximum est fixe (160 %)
    scales: {
      y: {
        beginAtZero: true,
        max: 160,
        ticks: { callback: value => value + "%" },
        title: { display: true, text: "% of the official target" }
      },
      x: {
        grid: { display: false }, // moins de traits = plus lisible
        ticks: { font: { size: 14, weight: "bold" } }
      }
    },
    plugins: {
      // INTERACTION 1 : clic sur la légende = cacher / afficher une série
      legend: {
        position: "bottom",
        labels: { padding: 20 },
        onClick: (event, item, legend) => {
          Chart.defaults.plugins.legend.onClick(event, item, legend); // comportement normal
          updateOutButton(); // le bouton "Add eating out" suit la légende
        }
      },
      // INTERACTION 2 : infobulle au survol avec le score et la vraie quantité
      tooltip: {
        callbacks: {
          label: context => context.dataset.label + ": " + context.raw + "% of the " + TARGETS[context.dataIndex].type,
          afterLabel: context => describe(context.dataIndex, context.raw)
        }
      }
    },
    // INTERACTION 3 : clic sur une barre = afficher d'où vient ce nutriment
    onClick: (event, elements) => {
      if (elements.length === 0) return;
      const index = elements[0].index;
      chartInfo.textContent = LABELS[index] + ": " + INFOS[index];

      // NIVEAU 4 : le clic Chart.js lance une animation GSAP
      if (!reduceMotion) gsap.from(chartInfo, { x: -30, opacity: 0, duration: 0.5 });
    }
  }
});

// Remplit les 2 séries. "progress" va de 0 à 1 : il sert à faire monter les barres (partie 6).
function setBars(progress) {
  chart.data.datasets[0].data = HOME_DATA.map(v => Math.round(v * progress));
  chart.data.datasets[1].data = WITH_OUT_DATA.map(v => Math.round(v * progress));
}

// Accessibilité : le texte lu par les lecteurs d'écran
function updateAriaLabel() {
  const values = LABELS.map((label, i) => label + " " + HOME_DATA[i] + "% at home, " + WITH_OUT_DATA[i] + "% including eating out");
  canvas.setAttribute("aria-label", "Grouped bar chart, % of official target: " + values.join("; "));
}

setBars(reduceMotion ? 1 : 0); // sans animation : barres directement à leur taille
chart.update();
updateAriaLabel();


// ===== 4. LES BOUTONS EN DEHORS DU GRAPHIQUE =====

// Met le texte du bouton à jour selon que la 2e série est visible ou non
function updateOutButton() {
  const visible = chart.isDatasetVisible(1);
  btnOut.setAttribute("aria-pressed", String(visible));
  btnOut.textContent = visible ? "Remove eating out" : "Add eating out";
}

// BOUTON 1 : ajouter / retirer les barres "repas à l'extérieur"
btnOut.addEventListener("click", () => {
  chart.setDatasetVisibility(1, !chart.isDatasetVisible(1));
  chart.update(); // Chart.js anime l'arrivée des barres à côté des autres
  updateOutButton();
});

// BOUTON 2 : cacher / afficher la ligne de l'objectif
btnTarget.addEventListener("click", () => {
  showTarget = !showTarget;
  chart.update();
  btnTarget.textContent = showTarget ? "Hide target line" : "Show target line";
});

// BOUTON RETOUR EN HAUT (flèche flottante)
document.getElementById("back-to-top").addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});


// ===== 5. LES MORCEAUX DE SUCRE =====
// On les prépare dans un "fragment" puis on les ajoute en une seule fois à la page
// (1 seul affichage au lieu de 17 : plus léger pour le navigateur)
const fragment = document.createDocumentFragment();
for (let i = 0; i < 17; i++) {
  const cube = document.createElement("span");
  cube.className = "cube";
  fragment.appendChild(cube);
}
document.getElementById("cubes").appendChild(fragment);


// ===== 6. ANIMATIONS GSAP (niveaux 3 et 4) =====
if (!reduceMotion) {
  gsap.registerPlugin(ScrollTrigger);

  // NIVEAU 3 : les sucres tombent, le "17" grossit
  gsap.from(".cube", { y: -300, opacity: 0, duration: 0.6, stagger: 0.1, ease: "bounce.out" });
  gsap.from(".big", { scale: 0, duration: 1, ease: "back.out" });

  // NIVEAU 3 : chaque partie apparaît au scroll (une seule fois : once: true)
  gsap.utils.toArray(".test").forEach(section => {
    gsap.from(section, {
      y: 50,
      opacity: 0,
      duration: 0.8,
      scrollTrigger: { trigger: section, start: "top 85%", once: true }
    });
  });

  // NIVEAU 4 : GSAP pilote Chart.js
  // GSAP fait passer "progress" de 0 à 1 quand le graphique arrive à l'écran,
  // et à chaque étape Chart.js redessine les barres.
  const growing = { progress: 0 };
  gsap.to(growing, {
    progress: 1,
    duration: 2,
    ease: "power2.out",
    scrollTrigger: { trigger: "#plate-chart", start: "top 80%", once: true },
    onUpdate: () => {
      setBars(growing.progress);
      chart.update("none"); // "none" : c'est GSAP qui anime, pas Chart.js
    }
  });
}
