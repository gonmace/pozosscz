// WhatsApp Bubble Animation
// Reusable script for animating the WhatsApp bubble component

export function animateWhatsAppBubble(delay: number = 2000) {
  const wappElement = document.getElementById("wapp") as HTMLElement;
  
  if (!wappElement) {
    console.warn("WhatsApp bubble element not found");
    return;
  }

  // Simple fade-in and slide-up animation
  wappElement.style.transition = "opacity 1s ease-in-out, transform 1s ease-in-out";
  wappElement.style.opacity = "1";
  wappElement.style.transform = "translateY(0)";
}

// Auto-animate on page load
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => animateWhatsAppBubble(), 2000);
  });
} else {
  setTimeout(() => animateWhatsAppBubble(), 2000);
}
