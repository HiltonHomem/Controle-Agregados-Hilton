/**
 * loader.js - Carregador Dinâmico Anti-Cache
 * Carrega scripts e estilos locais sempre com timestamp para evitar cache em navegadores.
 */
(function () {
    const timestamp = Date.now();

    window.carregarScript = function (src) {
        document.write(`<script src="${src}?_t=${timestamp}"><\/script>`);
    };

    window.carregarEstilo = function (href) {
        document.write(`<link rel="stylesheet" href="${href}?_t=${timestamp}">`);
    };
})();
