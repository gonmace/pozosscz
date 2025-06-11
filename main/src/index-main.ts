import { createTimeline } from "animejs";
import KUTE from "./kute-esm.js";

// Declare the banner variable from the Django template
declare const banner_img: string;
declare const banner_svg: string;
declare const banner_alt: string;

function updateBannerContent(svgUrl: string, imgUrl: string, imgAlt: string) {
  const banner = document.getElementById("banner")!;
  banner.style.backgroundImage = `url(${svgUrl})`;

  const image = new Image();
  image.src = imgUrl;
  image.alt = imgAlt;
  image.loading = "eager";
  image.className =
    "w-full absolute top-1/2 transform -translate-y-1/2 animate-fade animate-duration-2500 animate-delay-2000 animate-ease-out animate-reverse";

  banner.appendChild(image);
}

updateBannerContent(banner_svg, banner_img, banner_alt);

// Obtén los elementos del DOM y asegúrate de que no sean null
const bgBanner = document.getElementById("bgBanner") as HTMLElement;
const camion = document.getElementById("camion") as HTMLElement;
const titulo = document.getElementById("titulo") as HTMLElement;

// Asegúrate de que los elementos existen antes de acceder a sus propiedades
if (bgBanner && camion && titulo) {
  const widthBanner = bgBanner.offsetWidth;
  const heightBanner = bgBanner.offsetHeight;
  const widthCamion = camion.offsetWidth;
  const despCamion = widthBanner - widthCamion;
  const escalaLogo = 2;

  // Alinea el camión después de calcular las dimensiones
  titulo.classList.add("w-full");

  // Crea una línea de tiempo para la animación
  const tl = createTimeline();

  // Avanza el camión
  tl.add(
    "#camion",
    {
      translateX: [-widthCamion, despCamion],
      duration: 4000,
      easing: "easeOutQuad",
    },
    2000
  );

  // Avanza titulo
  tl.add(
    "#titulo",
    {
      opacity: [0, 1],
      translateX: ["-100%", "0%"],
      duration: 4000,
    },
    2000
  ); // starts at the same time as the previous animation

  // Morphing Camion con letras de Santa Cruz
  tl.add("#camion", {
    translateX: despCamion / 2 + widthCamion,
    translateY: -heightBanner / 2.5,
    duration: 3000,
    easing: "linear",
    scale: escalaLogo,
    onBegin: function () {
      // Crea un contorno de camion
      const contorno = document.getElementById(
        "contorno"
      ) as SVGPathElement | null;
      const tanqueCabina = document.getElementById(
        "tanqueCabina"
      ) as SVGPathElement | null;
      const llantas = document.getElementById(
        "llantas"
      ) as SVGPathElement | null;
      const tanqueGas = document.getElementById(
        "tanqueGas"
      ) as SVGPathElement | null;

      if (contorno && tanqueCabina && llantas && tanqueGas) {
        KUTE.to(
          contorno,
          {
            path: "#anta",
            attr: {
              fill: "#fff",
            },
          },
          {
            duration: 3000,
          }
        ).start();
        KUTE.to(
          tanqueCabina,
          {
            path: "#ruz",
            attr: {
              fill: "#fff",
            },
          },
          {
            duration: 3000,
          }
        ).start();
        KUTE.to(
          llantas,
          {
            path: "#S",
            attr: {
              fill: "#fff",
            },
          },
          {
            duration: 3000,
          }
        ).start();
        KUTE.to(
          tanqueGas,
          {
            path: "#C",
            attr: {
              fill: "#fff",
            },
          },
          {
            duration: 3000,
          }
        ).start();
      }
    },
    onComplete: function () {
      const svg = camion.querySelector("svg") as SVGElement | null;
      if (svg) {
        window.addEventListener("resize", function () {
          let logoPos = svg.getBoundingClientRect();
          let logoAncho = logoPos.right - logoPos.left;
          let anchoWindow = window.innerWidth;
          svg.style.left = `${(anchoWindow - logoAncho) / 2 - logoPos.left}px`;
        });
      }
    },
  });

  // Animación del botón
  tl.add(
    "#contratanos",
    {
      opacity: [0, 1],
      duration: 2000,
      easing: "linear",
    },
    "<-=2000"
  ); // starts 1000ms after the previous animation

  tl.add("#wapp", {
    translateY: ["-300%", "0%"],
    opacity: [0, 1],
    duration: 1000,
  });
} else {
  console.error("Uno o más elementos no se encontraron en el DOM.");
}
