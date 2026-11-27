"use strict"; // Mode strict : le navigateur signale plus d'erreurs.


// ===== 1. LES DONNÉES =====

// Les noms des 4 nutriments, affichés sous les barres.
const LABELS = ["Saturated fat", "Salt", "Added sugar", "Fibre"];
// Les scores en % de l'objectif pour la nourriture achetée pour la maison.
const HOME_DATA = [137, 107, 110, 55];
// Les scores en % de l'objectif en comptant aussi les repas à l'extérieur.
const WITH_OUT_DATA = [135, 118, 109, 61];

// L'objectif officiel de chaque nutriment, pour afficher les vraies quantités.
const TARGETS = [
  { amount: 11, unit: "% of energy", type: "limit" }, // Graisses saturées : 11 % maximum.
  { amount: 6, unit: " g", type: "limit" },           // Sel : 6 g maximum.
  { amount: 11, unit: "% of energy", type: "limit" }, // Sucre ajouté : 11 % maximum.
  { amount: 23, unit: " g", type: "target" }          // Fibres : 23 g à atteindre.
];

// Le texte qui s'affiche quand on clique sur une barre.
const INFOS = [
  "Saturated fat hides in butter, cheese, fatty meat, pies, pastries and cakes.",        // Graisses.
  "Around 75% of our salt is already in packaged foods: bread, cereal and ready meals.", // Sel.
  "Added sugar comes from sweets, cakes, biscuits and sugary drinks.",                   // Sucre.
  "Fibre comes from wholemeal bread, porridge oats, fruit, veg and pulses."              // Fibres.
];

const RED = "#b71c1c";                       // Rouge foncé pour les barres "maison".
const RED_HOVER = "rgba(183, 28, 28, 0.6)";  // Le même rouge, plus clair au survol.
const NAVY = "#24304f";                      // Bleu nuit pour les barres "avec l'extérieur".
const NAVY_HOVER = "rgba(36, 48, 79, 0.6)";  // Le même bleu, plus clair au survol.

let showTarget = true; // Vrai = la ligne de l'objectif est affichée.

// Vrai si le visiteur a demandé moins d'animations dans son ordinateur.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const canvas = document.getElementById("plate-chart");   // La zone où Chart.js dessine.
const chartInfo = document.getElementById("chart-info"); // Le texte sous le graphique.
const btnOut = document.getElementById("toggle-out");    // Le bouton "Add eating out".
const btnTarget = document.getElementById("toggle-target"); // Le bouton "Hide target line".

// Calcule la vraie quantité, par exemple "7.1 g a day (limit: 6 g)".
function describe(i, value) {
  const target = TARGETS[i]; // On prend l'objectif du nutriment numéro i.
  const amount = (value * target.amount / 100).toFixed(1); // On transforme le % en quantité.
  return amount + target.unit + " a day (" + target.type + ": " + target.amount + target.unit + ")"; // On renvoie la phrase.
}


// ===== 2. LE DESSIN EN PLUS : LIGNE D'OBJECTIF + VALEURS =====

// Un plugin Chart.js permet de dessiner des choses en plus des barres.
const extras = {
  id: "extras", // Le nom du plugin.
  afterDatasetsDraw(chart) { // Cette fonction se lance juste après le dessin des barres.
    const { ctx, chartArea, scales } = chart; // On récupère le pinceau, la zone et les axes.
    ctx.save(); // On garde les réglages du pinceau pour les remettre à la fin.

    if (showTarget) { // On dessine la ligne seulement si elle est activée.
      const y = scales.y.getPixelForValue(100); // La hauteur en pixels de la valeur 100 %.
      ctx.strokeStyle = "#111";                 // La ligne est presque noire.
      ctx.lineWidth = 2;                        // La ligne fait 2 pixels d'épaisseur.
      ctx.setLineDash([6, 4]);                  // La ligne est en pointillés.
      ctx.beginPath();                          // On commence un nouveau trait.
      ctx.moveTo(chartArea.left, y);            // On part du bord gauche du graphique.
      ctx.lineTo(chartArea.right, y);           // On va jusqu'au bord droit.
      ctx.stroke();                             // On trace le trait.
      ctx.setLineDash([]);                      // On remet un trait plein pour la suite.

      ctx.fillStyle = "#111";                   // Le texte est presque noir.
      ctx.font = "bold 13px Arial";             // Le texte est en gras, taille 13.
      ctx.textAlign = "right";                  // Le texte est aligné à droite.
      ctx.fillText("Target (100%)", chartArea.right, y - 6); // On écrit "Target" au-dessus de la ligne.
    }

    ctx.fillStyle = "#111";       // Les valeurs sont écrites presque en noir.
    ctx.font = "bold 13px Arial"; // En gras, taille 13.
    ctx.textAlign = "center";     // Centrées au-dessus de chaque barre.
    chart.data.datasets.forEach((dataset, d) => { // Pour chaque série de barres...
      if (!chart.isDatasetVisible(d)) return;     // ...on passe si la série est cachée.
      chart.getDatasetMeta(d).data.forEach((bar, i) => { // Pour chaque barre de la série...
        ctx.fillText(dataset.data[i] + "%", bar.x, bar.y - 6); // ...on écrit sa valeur au-dessus.
      });
    });

    ctx.restore(); // On remet les réglages du pinceau comme avant.
  }
};


// ===== 3. LE GRAPHIQUE CHART.JS =====

// On crée le graphique en barres dans le canvas.
const chart = new Chart(canvas, {
  type: "bar",       // Un graphique en barres.
  plugins: [extras], // On ajoute notre dessin en plus (ligne + valeurs).
  data: {
    labels: LABELS,  // Les noms des nutriments sous les barres.
    datasets: [
      {
        label: "Food bought for home",  // Le nom de la 1re série dans la légende.
        data: HOME_DATA,                // Les valeurs de la 1re série.
        backgroundColor: RED,           // Les barres sont rouges.
        hoverBackgroundColor: RED_HOVER // Elles s'éclaircissent au survol.
      },
      {
        label: "Including eating out",   // Le nom de la 2e série dans la légende.
        data: WITH_OUT_DATA,             // Les valeurs de la 2e série.
        backgroundColor: NAVY,           // Les barres sont bleu nuit.
        hoverBackgroundColor: NAVY_HOVER, // Elles s'éclaircissent au survol.
        hidden: true                     // Cette série est cachée au départ.
      }
    ]
  },
  options: {
    maintainAspectRatio: false, // Le graphique prend la taille de sa boîte.
    animation: reduceMotion ? false : { duration: 800 }, // Les barres montent en 0,8 s, sauf si on a demandé moins d'animations.
    scales: {
      y: {
        beginAtZero: true, // L'axe commence à 0 pour ne pas tromper le lecteur.
        max: 160,          // L'axe s'arrête toujours à 160 %.
        ticks: { callback: value => value + "%" }, // On ajoute "%" aux chiffres de l'axe.
        title: { display: true, text: "% of the official target" } // Le titre de l'axe.
      },
      x: {
        grid: { display: false }, // Pas de traits verticaux, c'est plus lisible.
        ticks: { font: { size: 14, weight: "bold" } } // Les noms des nutriments en gras.
      }
    },
    plugins: {
      // INTERACTION 1 : cliquer sur la légende cache ou affiche une série.
      legend: {
        position: "bottom",       // La légende est sous le graphique.
        labels: { padding: 20 },  // De l'espace entre les éléments de la légende.
        onClick: (event, item, legend) => { // Quand on clique sur la légende...
          Chart.defaults.plugins.legend.onClick(event, item, legend); // ...Chart.js cache ou affiche la série...
          updateOutButton(); // ...et on met à jour le texte du bouton.
        }
      },
      // INTERACTION 2 : survoler une barre affiche une infobulle.
      tooltip: {
        callbacks: {
          label: context => context.dataset.label + ": " + context.raw + "% of the " + TARGETS[context.dataIndex].type, // 1re ligne : le score.
          afterLabel: context => describe(context.dataIndex, context.raw) // 2e ligne : la vraie quantité.
        }
      }
    },
    // INTERACTION 3 : cliquer sur une barre explique d'où vient le nutriment.
    onClick: (event, elements) => {
      if (elements.length === 0) return; // Si on a cliqué à côté d'une barre, on ne fait rien.
      const index = elements[0].index;   // Le numéro du nutriment cliqué.
      chartInfo.textContent = LABELS[index] + ": " + INFOS[index]; // On écrit son explication sous le graphique.
    }
  }
});

// Le texte lu par les lecteurs d'écran, avec toutes les valeurs.
const values = LABELS.map((label, i) => label + " " + HOME_DATA[i] + "% at home, " + WITH_OUT_DATA[i] + "% including eating out"); // Une phrase par nutriment.
canvas.setAttribute("aria-label", "Grouped bar chart, % of official target: " + values.join("; ")); // On met ce texte sur le canvas.


// ===== 4. LES BOUTONS EN DEHORS DU GRAPHIQUE =====

// Change le texte du bouton selon que la 2e série est visible ou non.
function updateOutButton() {
  const visible = chart.isDatasetVisible(1); // Vrai si les barres bleues sont affichées.
  btnOut.setAttribute("aria-pressed", String(visible)); // On dit aux lecteurs d'écran si le bouton est enfoncé.
  btnOut.textContent = visible ? "Remove eating out" : "Add eating out"; // On change le texte du bouton.
}

// BOUTON 1 : ajouter ou retirer les barres "repas à l'extérieur".
btnOut.addEventListener("click", () => { // Quand on clique sur le bouton...
  chart.setDatasetVisibility(1, !chart.isDatasetVisible(1)); // ...on inverse l'affichage des barres bleues...
  chart.update();    // ...on redessine le graphique...
  updateOutButton(); // ...et on change le texte du bouton.
});

// BOUTON 2 : cacher ou afficher la ligne de l'objectif.
btnTarget.addEventListener("click", () => { // Quand on clique sur le bouton...
  showTarget = !showTarget; // ...on inverse l'interrupteur de la ligne...
  chart.update();           // ...on redessine le graphique...
  btnTarget.textContent = showTarget ? "Hide target line" : "Show target line"; // ...et on change le texte du bouton.
});

// BOUTON RETOUR EN HAUT : la flèche en bas à droite.
document.getElementById("back-to-top").addEventListener("click", () => { // Quand on clique sur la flèche...
  window.scrollTo({ top: 0, behavior: "smooth" }); // ...on remonte en haut de la page en douceur.
});


// ===== 5. LES MORCEAUX DE SUCRE =====

const fragment = document.createDocumentFragment(); // Une boîte invisible pour préparer les sucres.
for (let i = 0; i < 17; i++) {                      // On répète 17 fois (17 sucres).
  const cube = document.createElement("span");      // On crée un sucre.
  cube.className = "cube";                          // On lui donne la classe "cube" pour le CSS.
  fragment.appendChild(cube);                       // On le met dans la boîte.
}
document.getElementById("cubes").appendChild(fragment); // On ajoute les 17 sucres à la page en une fois.


// ===== 6. ANIMATIONS  =====

if (!reduceMotion) { // On anime seulement si le visiteur n'a pas demandé moins d'animations.
  gsap.registerPlugin(ScrollTrigger); // On active l'outil de GSAP qui réagit au scroll.

  // Les sucres tombent du haut l'un après l'autre.
  gsap.from(".cube", { y: -300, opacity: 0, duration: 0.6, stagger: 0.1, ease: "bounce.out" });

  // Le grand "17" grossit à partir de rien.
  gsap.from(".big", { scale: 0, duration: 1, ease: "back.out" });

  // Chaque partie des tests apparaît quand on arrive dessus en scrollant.
  gsap.utils.toArray(".test").forEach(section => { // Pour chaque partie...
    gsap.from(section, {
      y: 50,        // ...elle part 50 pixels plus bas...
      opacity: 0,   // ...invisible...
      duration: 0.8, // ...et remonte en 0,8 seconde...
      scrollTrigger: { trigger: section, start: "top 85%", once: true } // ...quand elle arrive à l'écran, une seule fois.
    });
  });
}
