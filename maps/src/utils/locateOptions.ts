import { LocateOptions } from 'leaflet';

export const locateOptions: Partial<LocateOptions> = {
    watch: true,
    setView: true,
    enableHighAccuracy: true,
    maxZoom: 16,
    timeout: 10000,
    maximumAge: 30000
}; 