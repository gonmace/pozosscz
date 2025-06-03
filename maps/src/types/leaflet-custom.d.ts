// leaflet-custom.d.ts
import * as L from "leaflet";

declare module "leaflet" {
  namespace control {
    function custom(options: any): Control.Custom;
  }

  namespace Control {
    class Custom extends Control {
      constructor(options: any);
    }
  }
}
