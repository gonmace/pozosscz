import {
    Map,
    tileLayer,
    Marker,
    control,
    FeatureGroup,
    Control,
    Polygon,
    Draw,
    LatLng,
    Layer,
    markerClusterGroup,
    MapOptions,
    ControlPosition
  } from "leaflet";
  import "./utils/leaflet.Control.Center";
  import "leaflet-control-custom";
  import "leaflet-draw";
  import "leaflet.control.layers.tree";
  import "leaflet.markercluster";
  import "leaflet.markercluster.layersupport";
  import "leaflet.locatecontrol/dist/L.Control.Locate.min";
  import { Poligonos } from "./types/types";
  import { fetchClients } from "./utils/fetchClients";
  import { iconRed } from "./utils/icons";
  import { locateOptions } from "./utils/locateOptions";

  import type {
    LeafletMouseEvent,
    LocationEvent,
    ErrorEvent,
    LeafletEvent,
  } from "leaflet";

  import "leaflet/dist/leaflet.css";
  import "leaflet.locatecontrol/dist/L.Control.Locate.min.css";
  import "../src/utils/leaflet.Control.Center.css";
  import "leaflet-draw/dist/leaflet.draw.css";
  import "leaflet.control.layers.tree/L.Control.Layers.Tree.css";
  import "leaflet.markercluster/dist/MarkerCluster.Default.css";




  let marker: Marker;
  const colorPath = ["red", "green", "orange", "cyan"];
  const overlay = document.getElementById("overlay") as HTMLDivElement;

  const colores = [
    "#B0B0B0",
    "#FF5733",
    "#286d31",
    "#3357FF",
    "#A633FF",
    "#FF8333",
    "#33FFD5",
    "#D5FF33",
    "#33A6FF",
    "#5733FF",
    "#787878",
    "#FF33A6",
  ];

  const mapOptions: MapOptions = {
    center: [-17.784071, -63.180522],
    zoom: 12,
    zoomControl: false,
  };

  const map = new Map("map", mapOptions);

  const osm = tileLayer("https://{s}.tile.osm.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution:
      '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  const esri = tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    }
  );

  const putMarker = document.getElementById("putMarker") as HTMLButtonElement;
  putMarker.disabled = true;

  let polygonLayers: { label: string; layer: Polygon }[] = [];

  // Wrap the async code in an IIFE
  (async () => {
    const areaFact = await fetch("/api/v1/areasfactor/")
      .then((r) => r.json())
      .then((data: Poligonos[]) => {
        return data;
      });

    // Añadir todos los polígonos obtenidos desde la API al mapa
    areaFact.forEach((polygonData, index) => {
      const apiPolygonCoords = polygonData.polygon;
      const apiPolygonLatLngs = apiPolygonCoords.map(
        (coord) => new LatLng(coord[0], coord[1])
      );
      polygonLayers.push({
        label: `<span style="color: ${colores[index % colores.length]}">   ${polygonData.name} ${polygonData.factor}</span>`,
        layer: new Polygon(apiPolygonLatLngs, { color: colores[index] }),
      });
    });

    // Cargar los clientes de la base de datos
    let groupCot, groupEje;
    ({ groupEje, groupCot } = await fetchClients());

    var options = {
      spiderLegPolylineOptions: { weight: 0 },
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: false,
      removeOutsideVisibleBounds: true,
      showCoverageOnHover: true,
      disableClusteringAtZoom: 18,
      maxClusterRadius: 50,
      spiderfyDistanceMultiplier: 1,
      chunkedLoading: true,
      chunkInterval: 100,
      singleAddRemoveBufferDuration: 200,
    };

    var mcgLayerSupportGroup = markerClusterGroup.layerSupport(options);
    mcgLayerSupportGroup.addTo(map);

    mcgLayerSupportGroup.checkIn(groupCot);
    mcgLayerSupportGroup.checkIn(groupEje);

    var baseTree = {
      label: "<strong>Capas Base</strong>",
      children: [
        { label: "OpenStreetMap", layer: osm },
        { label: "Esri World Imagery", layer: esri },
      ],
    };

    var overlayTree = {
      label: "<strong> Zonas / Clientes</strong>",
      selectAllCheckbox: 'Un/select all',
      children: [
        {
          label: " Factor por zona",
          selectAllCheckbox: true,
          children: polygonLayers,
        },
        {
          label: " Ejecutados",
          selectAllCheckbox: 'Un/select all',
          collapsed: true,
          children: [
            {label: `<div class="puntos bg-precio300">&zwnj;</div>...300`, layer: groupEje[0]},
            {label: `<div class="puntos bg-precio350">&zwnj;</div>\xa0\xa0\xa0350`, layer: groupEje[1]},
            {label: `<div class="puntos bg-precio400">&zwnj;</div>\xa0\xa0\xa0400`, layer: groupEje[2]},
            {label: `<div class="puntos bg-precio450">&zwnj;</div>\xa0\xa0\xa0450`, layer: groupEje[3]},
            {label: `<div class="puntos bg-precio500">&zwnj;</div>\xa0\xa0\xa0500`, layer: groupEje[4]},
            {label: `<div class="puntos bg-precio600">&zwnj;</div>\xa0\xa0\xa0600`, layer: groupEje[5]},
            {label: `<div class="puntos bg-precio700">&zwnj;</div>\xa0\xa0\xa0700`, layer: groupEje[6]},
            {label: `<div class="puntos bg-precio800">&zwnj;</div>\xa0\xa0\xa0800`, layer: groupEje[7]},
            {label: `<div class="puntos bg-precio900">&zwnj;</div>\xa0\xa0\xa0900`, layer: groupEje[8]},
            {label: `<div class="puntos ml-0 bg-precio1000">&zwnj;</div>\xa01000...`, layer: groupEje[9]},
            {label: `<div class="puntos ml-0 bg-precioNegro">&zwnj;</div>\xa0\xa0L.N`, layer: groupEje[10]},
          ],
        },
        {
          label: " Cotizados",
          selectAllCheckbox: 'Un/select all',
          collapsed: true,
          children: [
            {label: "Administrador" , layer: groupCot[0]},
            {label: "Cliente Confirma" , layer: groupCot[1]},
            {label: "Cliente Cancela" , layer: groupCot[2]},
          ],
        }
      ],
    };

    // Agregar el control de capas al mapa con el plugin de árbol leaflet.control.layers.tree
    control.layers
      .tree(baseTree, overlayTree, {
        position: "bottomleft",
        collapsed: false,
      })
      .addTo(map);

    // Add custom control for the quote button
    const customControl = new Control({ position: 'bottomright' as ControlPosition });
    customControl.onAdd = function() {
      const container = document.createElement('div');
      container.innerHTML = `
        <button id="cotiza" class="btn btn-secondary sombra !text-white">
          COTIZA
        </button>
      `;
      container.className = 'pb-1';
      container.onclick = function() {
        // TODO: Implement contratar function
        console.log('Cotizar clicked');
      };
      return container;
    };
    customControl.addTo(map);

    var drawnItems = new FeatureGroup();
    map.addLayer(drawnItems);

    const drawControl = new Control.Draw({
      edit: {
        featureGroup: drawnItems,
      },
      draw: {
        polygon: {
          allowIntersection: true,
          showArea: true,
          drawError: {
            color: "#e1e100",
            message: "<strong>¡Oh no!</strong> no puedes dibujar eso!",
          },
          shapeOptions: {
            color: "#787878",
          },
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
    });

    map.addControl(drawControl);

    // Control de localización - versión simplificada
    const lc = L.control.locate({
      position: 'topleft',
      strings: {
        title: "Mi ubicación"
      }
    }).addTo(map);

    function onMapClick(e: LeafletMouseEvent) {
      marker ? map.removeLayer(marker) : (botonCotiza.disabled = false);
      marker = new Marker(e.latlng, {
        icon: iconRed,
      }).addTo(map);
      console.log("--Latitud, Longitud--");
      console.log(e.latlng.lat.toFixed(7) + "," + e.latlng.lng.toFixed(7));
    }

    map.on("click", onMapClick);

    // Desactivar el click listener cuando comienza el dibujo
    map.on(Draw.Event.DRAWSTART, function () {
      map.off("click", onMapClick);
    });

    map.on(Draw.Event.CREATED, function (event: LeafletEvent) {
      const layer = event.layer;
      drawnItems.clearLayers();
      drawnItems.addLayer(layer);
      if (layer instanceof Polygon) {
        const coordinates = layer.getLatLngs()[0];
        console.log('Polygon coordinates:', coordinates);
      }

      // Volver a activar el click listener
      map.on("click", onMapClick);
    });

    map.on(Draw.Event.EDITED, function (event) {
      const layers = (event as any).layers;
      layers.eachLayer(function (layer: Layer) {
        if (layer instanceof Polygon) {
          const coordinates = layer.getLatLngs()[0];
          console.log('Updated polygon coordinates:', coordinates);
        }
      });
    });

    const botonCotiza = document.getElementById("cotiza") as HTMLButtonElement;
    botonCotiza.disabled = true;

    // Escucha el evento 'locationfound' para obtener lat y lon
    map.on("locationfound", function (e: LocationEvent) {
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;
      console.log("Latitud: " + lat + ", Longitud: " + lon);

      if (marker) {
        map.removeLayer(marker);
      } else {
        botonCotiza?.classList.remove("btn-disabled");
      }
      
      marker = new Marker(e.latlng, {
        icon: iconRed,
      }).addTo(map);
      map.flyTo(e.latlng, 19);
    });

    map.on("locationerror", function (e: ErrorEvent) {
      alert(e.message);
    });

    const URLwhatsapp = document.getElementById("URLwhatsapp") as HTMLInputElement;
    URLwhatsapp.addEventListener("input", (e) => {
      URLwhatsapp.value.length >= 28
        ? (putMarker.disabled = false)
        : (putMarker.disabled = true);
    });

    putMarker.onclick = () => {
      let latitud: number = 0,
        longitud: number = 0;
      try {
        if (URLwhatsapp.value.indexOf("%2C") != -1) {
          let ambos = URLwhatsapp.value.split("%2C");
          let izq = ambos[0].split("?q=");
          let der = ambos[1].split("&z=");
          latitud = parseFloat(izq[1]);
          longitud = parseFloat(der[0]);
        }
        if (URLwhatsapp.value.indexOf(",") != -1) {
          let ambos = URLwhatsapp.value.split(",");
          if (ambos.length == 2) {
            let izq = ambos[0].split("?q=");
            if (izq.length == 1) {
              latitud = parseFloat(ambos[0]);
            } else {
              latitud = parseFloat(izq[1]);
            }
            longitud = parseFloat(ambos[1]);
          }
          if (ambos.length == 3) {
            let izq = ambos[0].split("/@");
            latitud = parseFloat(izq[1]);
            longitud = parseFloat(ambos[1]);
          }
        }
        map.flyTo([latitud, longitud], 16);
        URLwhatsapp.value = "";
        if (marker) {
          map.removeLayer(marker);
        } else {
          botonCotiza.disabled = false;
        }
        marker = new Marker([latitud, longitud], {
          icon: iconRed,
        });
        marker.addTo(map);
        putMarker.disabled = true;
      } catch {
        alert("Algo salió mal");
        URLwhatsapp.value = "";
      }
    };
  })();

