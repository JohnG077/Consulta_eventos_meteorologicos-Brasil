
let todasEstacoes = [];

async function carregarEstacoes() {
    const resultado = document.getElementById("resultadoEstacoes");

    try {
        const resposta = await fetch("data/estacoes.json");

        if (!resposta.ok) {
            throw new Error("Não foi possível carregar os dados.");
        }

        todasEstacoes = await resposta.json();

        resultado.innerHTML = `
            <p>${todasEstacoes.length} estações carregadas.</p>
        `;

        exibirEstacoes(todasEstacoes);

    } catch (erro) {
        resultado.innerHTML = `
            <p>Erro ao carregar as estações: ${erro.message}</p>
        `;
    }
}


function exibirEstacoes(estacoes) {
    const resultado = document.getElementById("resultadoEstacoes");

    if (estacoes.length === 0) {
        resultado.innerHTML = "<p>Nenhuma estação encontrada.</p>";
        return;
    }

    resultado.innerHTML = estacoes.map(estacao => `
        <article class="estacao-card">
            <h3>${estacao.estacao}</h3>

            <p>
                <strong>Estado:</strong> ${estacao.uf}
                |
                <strong>Região:</strong> ${estacao.regiao}
            </p>

            <p>
                <strong>Código WMO:</strong>
                ${estacao.codigo_wmo || "Não informado"}
            </p>

            <p>
                <strong>Período:</strong> ${estacao.periodo}
            </p>

            <hr>

            <h4>Precipitação</h4>

            <p>
                Máxima horária:
                <strong>
                    ${estacao.precipitacao.maxima_horaria_mm ?? "N/D"} mm
                </strong>
            </p>

            <p>
                Data:
                ${estacao.precipitacao.data_maxima || "N/D"}
            </p>

            <h4>Rajada de vento</h4>

            <p>
                Máxima:
                <strong>
                    ${estacao.rajada_vento.maxima_kmh ?? "N/D"} km/h
                </strong>
            </p>

            <p>
                Data:
                ${estacao.rajada_vento.data_maxima || "N/D"}
            </p>

            <hr>

            <p>
                <strong>Total de registros:</strong>
                ${estacao.total_registros ?? "N/D"}
            </p>
        </article>
    `).join("");
}


document.getElementById("buscaEstacao").addEventListener("input", (evento) => {
    const termo = evento.target.value.toLowerCase().trim();

    const filtradas = todasEstacoes.filter(estacao => {
        return (
            (estacao.estacao || "").toLowerCase().includes(termo) ||
            (estacao.uf || "").toLowerCase().includes(termo) ||
            (estacao.regiao || "").toLowerCase().includes(termo) ||
            (estacao.codigo_wmo || "").toLowerCase().includes(termo)
        );
    });

    exibirEstacoes(filtradas);
});


carregarEstacoes();
