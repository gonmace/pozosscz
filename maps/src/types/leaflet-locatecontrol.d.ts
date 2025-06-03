// src/types/leaflet-locatecontrol.d.ts
import "leaflet";
declare module "leaflet" {
  namespace Control {
    class Locate extends Control {
      constructor(locateOptions?: LocateOptions);
      start(): void;
      stop(): void;
      stopFollowing(): void;
      setView(): void;
      onAdd(map: Map): HTMLElement;
      on(
        event: "locationfound",
        fn: (event: LocationEvent) => void,
        context?: any
      ): this;
    }
    interface LocateOptions extends ControlOptions {
      layer?: Layer;
      setView?: boolean | string;
      keepCurrentZoomLevel?: boolean;
      initialZoomLevel?: number | boolean;
      flyTo?: boolean;
      clickBehavior?: any;
      returnToPrevBounds?: boolean;
      cacheLocation?: boolean;
      drawCircle?: boolean;
      drawMarker?: boolean;
      showCompass?: boolean;
      markerClass?: any;
      compassClass?: any;
      circleStyle?: PathOptions;
      markerStyle?: PathOptions | MarkerOptions;
      compassStyle?: PathOptions;
      followCircleStyle?: PathOptions;
      followMarkerStyle?: PathOptions;
      icon?: string;
      iconLoading?: string;
      iconElementTag?: string;
      textElementTag?: string;
      circlePadding?: number[];
      metric?: boolean;
      createButtonCallback?: (
        container: HTMLDivElement,
        options: LocateOptions
      ) => void;
      onLocationError?: (event: ErrorEvent, control: Locate) => void;
      onLocationOutsideMapBounds?: (control: Locate) => void;
      showPopup?: boolean;
      strings?: StringsOptions;
      locateOptions?: L.LocateOptions;
    }
    interface StringsOptions {
      title?: string;
      metersUnit?: string;
      feetUnit?: string;
      popup?: string;
      outsideMapBoundsMsg?: string;
    }
  }

  namespace control {
    function locate(options?: Control.LocateOptions): Control.Locate;
  }

  interface LocationEvent extends LeafletEvent {
    latlng: LatLng;
    bounds: LatLngBounds;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  }
}
