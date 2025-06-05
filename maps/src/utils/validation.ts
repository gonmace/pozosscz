export function validateCoordinates(value: string): boolean {
  if (!value.trim()) return false;
  
  // Check if it's a direct coordinate format (lat,lon)
  if (value.includes(",")) {
    const coords = value.split(",").map(coord => parseFloat(coord.trim()));
    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
      return true;
    }
  }
  
  // Check if it's a Google Maps URL
  if (value.includes("maps.google.com") || value.includes("google.com/maps")) {
    if (value.includes("%2C") || value.includes("/@")) {
      return true;
    }
  }
  
  return false;
}

export function validateName(value: string): boolean {
  return value.trim().length > 0;
}

export function setupValidation() {
  const coordinatesInput = document.getElementById("coordinates") as HTMLInputElement;
  const nameInput = document.getElementById("nameCamion") as HTMLInputElement;
  const coordinatesHint = coordinatesInput.parentElement?.nextElementSibling as HTMLElement;
  const nameHint = nameInput.parentElement?.nextElementSibling as HTMLElement;

  function validateInputs() {
    // Validate coordinates
    if (validateCoordinates(coordinatesInput.value)) {
      coordinatesHint.classList.add("hidden");
      coordinatesInput.parentElement?.classList.remove("input-error");
    } else {
      coordinatesHint.classList.remove("hidden");
      coordinatesInput.parentElement?.classList.add("input-error");
    }

    // Validate name
    if (validateName(nameInput.value)) {
      nameHint.classList.add("hidden");
      nameInput.parentElement?.classList.remove("input-error");
    } else {
      nameHint.classList.remove("hidden");
      nameInput.parentElement?.classList.add("input-error");
    }
  }

  // Add input event listeners
  coordinatesInput.addEventListener("input", validateInputs);
  nameInput.addEventListener("input", validateInputs);

  // Initial validation
  validateInputs();
} 