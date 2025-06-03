
import type { MenuItem } from "../types/types";

const menuData: MenuItem[] = [
  { name: "Inicio", link: "/", icon: "menu/home", protected: false},
  { name: "Cotiza", link: "/cotiza", icon: "menu/pesos", protected: false },
  { name: "Contáctanos", link: "/contacto", icon: "menu/contact", protected: false },
  { name: "Mapa", link: "/mapa", icon: "menu/mapa", protected: true },
];

export default menuData;
