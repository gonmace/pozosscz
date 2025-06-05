

// Helper function to extract coordinates from different formats
export function extractCoordinates(input: string): [number, number] | null {
    try {
      // Check if it's a direct coordinate format (lat,lon)
      if (input.split(",").length === 2) {
        const [lat, lon] = input.split(",").map(coord => parseFloat(coord.trim()));
        if (!isNaN(lat) && !isNaN(lon)) {
          return [lat, lon];
        }
      }
  
      // Check if it's a Google Maps URL
      if (input.includes("maps.google.com") || input.includes("google.com/maps")) {
        if (input.indexOf("%2C") !== -1) {
          // Format: ?q=lat%2Clon&
          const [latPart, lonPart] = input.split("%2C");
          const lat = parseFloat(latPart.split("?q=")[1]);
          const lon = parseFloat(lonPart.split("&")[0]);
          return [lat, lon];
        } else if (input.includes("/@")) {
          // Format: /@lat,lon,
          const coords = input.split("/@")[1].split(",");
          return [parseFloat(coords[0]), parseFloat(coords[1])];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  export async function guardarBaseCamion(name: string, coordinates: [number, number]) {
    const response = await fetch('/api/v1/basecamion/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: name,
        coordinates: coordinates
      })
    });
    return response.json();
  }