declare module 'leaflet.awesome-markers' {
  // augments L namespace — no explicit exports needed
}
declare namespace L {
  namespace AwesomeMarkers {
    interface IconOptions {
      icon?: string;
      prefix?: string;
      markerColor?: string;
      iconColor?: string;
      spin?: boolean;
      extraClasses?: string;
    }
    function icon(options: IconOptions): L.Icon;
  }
}
