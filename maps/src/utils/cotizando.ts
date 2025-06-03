// import { polyline } from "leaflet";
// import type { Marker, Path } from "leaflet";
// import { fetchOSRM } from "../Map/fetchOSRM";

// interface RutasResult {
//     paths: Path[];
//     distancia: number[];
//     tiempo: number[];
//     origen: string[];
//   }

// export const rutas = async (marker: Marker): Promise<RutasResult> => {
//     let colorPath = ['red', 'blue', 'green', 'cyan'];
//     let paths: Path[] = [];
//     let distancia: number[] = [];
//     let tiempo: number[] = [];
//     let origen: string[] = [];
  
//     try {
//       await fetchOSRM(marker)
//       .then(
//         (r) => {
//             console.log(r);
            
//             r.forEach((r, i) => {
//                 if (r != null) {
//                   paths[i] = polyline(r.ruta, {
//                     color: colorPath[i],
//                     opacity: 1
//                   })
//                   distancia[i] = r.distancia;
//                   tiempo[i] = r.tiempo;
//                   origen[i] = r.origen;
//                 } else {
//                   alert("Algo pasó!!!");
//                 }
//               });
            
//         });
//         return { paths, distancia, tiempo, origen };
//     } catch (error) {
//       console.error("Error fetching paths:", error);
//       // Retornar un objeto vacío en caso de error para mantener el tipo consistente
//       return { paths: [], distancia: [], tiempo: [], origen: [] };
//     }
//   }
    
   
  
