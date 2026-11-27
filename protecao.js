// 1. Trava o botão direito do mouse em toda a página
document.addEventListener("contextmenu", function (e) {
    e.preventDefault();
    return false;
}, true);

// 2. Trava F12, Ctrl+U, Ctrl+Shift+I/J/C e Ctrl+C fora do campo de valor
document.addEventListener("keydown", function (e) {
    var tecla = e.key ? e.key.toUpperCase() : "";

    // Bloqueia F12
    if (tecla === "F12" || e.keyCode === 123) {
        e.preventDefault();
        window.location.href = "about:blank";
        return false;
    }

    // Bloqueia Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C (Inspecionar)
    if (e.ctrlKey && e.shiftKey && (tecla === "I" || tecla === "J" || tecla === "C")) {
        e.preventDefault();
        return false;
    }

    // Bloqueia Ctrl+U (Exibir código-fonte) e Ctrl+S (Salvar página)
    if (e.ctrlKey && (tecla === "U" || tecla === "S")) {
        e.preventDefault();
        return false;
    }

    // Bloqueia Ctrl+C na página (permite apenas dentro do input de valor)
    if (e.ctrlKey && tecla === "C" && e.target.tagName !== "INPUT") {
        e.preventDefault();
        return false;
    }
}, true);
