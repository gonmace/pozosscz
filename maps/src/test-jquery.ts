// Prueba para verificar que jQuery está disponible globalmente
console.log('Verificando jQuery...');

// Verificar si $ está disponible
if (window.$) {
    console.log('$ está disponible globalmente');
    console.log('Versión de jQuery:', window.$.fn.jquery);
} else {
    console.log('$ no está disponible globalmente');
}

// Verificar si jQuery está disponible
if (window.jQuery) {
    console.log('jQuery está disponible globalmente');
    console.log('Versión de jQuery:', window.jQuery.fn.jquery);
} else {
    console.log('jQuery no está disponible globalmente');
}

// Intentar usar jQuery para verificar que funciona
$(document).ready(() => {
    console.log('jQuery está funcionando correctamente');
}); 