import * as L from 'leaflet';

declare module 'leaflet' {
  export interface CustomControlOptions {
    position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright' | 'bottomcenter';
    content: string;
    classes?: string;
    events?: {
      [key: string]: (event: Event) => void;
    };
  }

  export namespace Control {
    class Custom {
      constructor(options: CustomControlOptions);
      options: CustomControlOptions;
      onAdd(map: L.Map): HTMLElement;
      onRemove(map: L.Map): void;
      addTo(map: L.Map): this;
      remove(): this;
      getPosition(): string;
      setPosition(position: CustomControlOptions['position']): this;
    }
  }

  export namespace control {
    function custom(options: CustomControlOptions): Control.Custom;
  }
} 