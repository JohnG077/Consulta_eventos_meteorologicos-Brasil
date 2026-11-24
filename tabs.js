
let D = null;
let todasEstacoes = [];

const $ = id => document.getElementById(id);

const fmt = (valor, casas = 1) => {
    if (valor == null || !Number.isFinite(Number(valor))) {
        return "Sem dados";
    }

    return Number(valor).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas
    });
};


function dateFmt(data) {
    if (!data) return "Data não informada";

    const partes = data.match(/^(\d{4})-(\d{2})-(\d{2})$/);

    if (partes) {
        return `${partes[3]}/${partes[2]}/${partes[1]}`;
    }

    return data;
}


function rainLevel(valor) {
    if (valor == null) return ["Sem classificação", ""];
    if (valor < 20) return ["Abaixo dos limiares apresentados", ""];
    if (valor <= 30) return ["Perigo potencial", "info"];
    if (valor <= 60) return ["Perigo", "warn"];

    return ["Grande perigo", "danger"];
}


function windLevel(valor) {
    if (valor == null) return ["Sem classificação", ""];
    if (valor < 40) return ["Abaixo dos limiares apresentados", ""];
    if (valor <= 60) return ["Perigo potencial", "info"];
    if (valor <= 99) return ["Perigo", "warn"];

    return ["Grande perigo", "danger"];
}


function eventCard(label, value, unit, station, date, level) {
    return `
        <div class="metric">
            <small>${label}</small>

            <strong>${fmt(value)} ${unit}</strong>

            <div class="sub">
                ${station || "Estação não identificada"}
                · ${date || "Data não informada"}
            </div>

            <p>
                <span class="pill ${level[1]}">
                    ${level[0]}
                </span>
            </p>
        </div>
    `;
}


async function carregarDados() {

    try {

        const [resumo, estacoes] = await Promise.all([

            fetch("dados/dados.json").then(resposta => {
                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar dados/dados.json");
                }

                return resposta.json();
            }),

            fetch("data/estacoes.json").then(resposta => {
                if (!resposta.ok) {
                    throw new Error("Não foi possível carregar data/estacoes.json");
                }

                return resposta.json();
            })

        ]);

        D = resumo;
        todasEstacoes = estacoes;

        console.log("Dados consolidados carregados.");
        console.log("Estações carregadas:", todasEstacoes.length);

        iniciarExploracao();
        iniciarConsultaHistorica();
        iniciarAbas();

    } catch (erro) {

        console.error(erro);

        document.querySelector("main").innerHTML = `
            <div class="notice">
                Erro ao carregar os dados do projeto:
                <br>
                ${erro.message}
            </div>
        `;
    }
}


function iniciarAbas() {

    document.querySelectorAll(".tab").forEach(botao => {

        botao.addEventListener("click", () => {

            document.querySelectorAll(".tab, .panel").forEach(elemento => {
                elemento.classList.remove("active");
            });

            botao.classList.add("active");

            $(botao.dataset.tab).classList.add("active");

        });

    });

}


function iniciarExploracao() {

    const select = $("ufSelect");

    Object.keys(D.estados).sort().forEach(uf => {

        select.add(new Option(uf, uf));

    });

    select.addEventListener("change", atualizarExploracao);

    $("buscaEstacao").addEventListener("input", atualizarExploracao);

    renderizarRanking();

    atualizarExploracao();

}


function atualizarExploracao() {

    const uf = $("ufSelect").value;
    const termo = $("buscaEstacao").value.toLowerCase().trim();
    const existeBusca = uf !== "" || termo !== "";

    $("rankingSection").style.display = existeBusca ? "none" : "block";
    $("stateContent").innerHTML = "";
    $("stationResults").innerHTML = "";

    if (!existeBusca) {
        $("stationResults").innerHTML = `
            <div class="notice">
                Selecione um estado ou pesquise uma estação
                para visualizar seus registros.
            </div>
        `;

        return;
    }

    let filtradas = todasEstacoes.filter(estacao => {

        const correspondeEstado = !uf || estacao.uf === uf;
        const texto = [
            estacao.estacao,
            estacao.uf,
            estacao.regiao,
            estacao.codigo_wmo
        ].join(" ").toLowerCase();

        const correspondeBusca = !termo || texto.includes(termo);
        return correspondeEstado && correspondeBusca;

    });

    if (uf && !termo) {
        renderizarResumoEstado(uf);
    }

    if (filtradas.length === 0) {

        $("stationResults").innerHTML = `
            <div class="notice">
                Nenhuma estação encontrada para os filtros selecionados.
            </div>
        `;

        return;
    }

    $("stationResults").innerHTML = `
        <div class="section-head">
            <div>
                <h2>Estações encontradas</h2>

                <p>
                    ${filtradas.length} estação(ões) encontrada(s).
                </p>
            </div>
        </div>

        <div class="station-grid">
            ${filtradas.map(criarCardEstacao).join("")}
        </div>
    `;

}


function renderizarResumoEstado(uf) {

    const estado = D.estados[uf];

    if (!estado) return;

    $("stateContent").innerHTML = `
        <div class="section-head">
            <div>
                <h2>Resumo de ${uf}</h2>

                <p>
                    Indicadores consolidados das estações analisadas
                    neste estado.
                </p>
            </div>
        </div>

        <div class="metrics">

            ${eventCard(
                "Maior precipitação horária",
                estado.precipitacao.maior_maxima_horaria_mm,
                "mm",
                estado.precipitacao.estacao_maior_precipitacao,
                estado.precipitacao.data_maior_precipitacao,
                rainLevel(estado.precipitacao.maior_maxima_horaria_mm)
            )}

            ${eventCard(
                "Maior rajada de vento",
                estado.rajada_vento.maior_rajada_kmh,
                "km/h",
                estado.rajada_vento.estacao_maior_rajada,
                estado.rajada_vento.data_maxima,
                windLevel(estado.rajada_vento.maior_rajada_kmh)
            )}

            <div class="metric">
                <small>Estações analisadas</small>
                <strong>${estado.total_estacoes}</strong>
            </div>

            <div class="metric">
                <small>Observações meteorológicas</small>
                <strong>
                    ${Number(estado.observacoes_acumuladas).toLocaleString("pt-BR")}
                </strong>
            </div>

        </div>
    `;

}


function criarCardEstacao(estacao) {

    return `
        <article class="estacao-card">

            <h3>${estacao.estacao}</h3>

            <p>
                <strong>${estacao.uf}</strong>
                · Região ${estacao.regiao}
            </p>

            <p>
                Código WMO: ${estacao.codigo_wmo || "Não informado"}
            </p>

            <hr>

            <h4>Precipitação</h4>

            <p>
                Máxima horária:
                <strong>
                    ${fmt(estacao.precipitacao.maxima_horaria_mm)} mm
                </strong>
            </p>

            <p>
                Data: ${estacao.precipitacao.data_maxima || "Não informada"}
            </p>

            <h4>Rajada de vento</h4>

            <p>
                Máxima:
                <strong>
                    ${fmt(estacao.rajada_vento.maxima_kmh)} km/h
                </strong>
            </p>

            <p>
                Data: ${estacao.rajada_vento.data_maxima || "Não informada"}
            </p>

            <hr>

            <p>
                Total de registros:
                ${estacao.total_registros ?? "N/D"}
            </p>

        </article>
    `;

}


function renderizarRanking() {

    function renderizarLista(elemento, itens, tipo) {

        $(elemento).innerHTML = itens.map((item, indice) => {

            const valor = tipo === "chuva"
                ? `${fmt(item.maxima_horaria_mm)} mm`
                : `${fmt(item.maxima_kmh)} km/h`;

            return `
                <div class="event">

                    <strong>${item.estacao}</strong>

                    <div class="muted">
                        ${item.uf} · Região ${item.regiao}
                        · ${item.data}
                    </div>

                    <b>${valor}</b>

                </div>
            `;

        }).join("");

    }

    renderizarLista(
        "rainRanking",
        D.ranking.maiores_precipitacoes_horarias,
        "chuva"
    );

    renderizarLista(
        "windRanking",
        D.ranking.maiores_rajadas_de_vento,
        "vento"
    );

}



const cacheHistorico = new Map();
const PASTA_HISTORICO = "dados/historico_completo";


async function carregarJsonHistorico(caminho) {

    if (cacheHistorico.has(caminho)) {
        return cacheHistorico.get(caminho);
    }

    const resposta = await fetch(caminho);

    if (!resposta.ok) {
        throw new Error(`Não foi possível carregar: ${caminho}`);
    }

    const dados = await resposta.json();
    cacheHistorico.set(caminho, dados);
    return dados;
}


function localizarEstacoes(termo) {

    const busca = termo.trim().toLowerCase();

    if (!busca) return [];

    const correspondencias = todasEstacoes.filter(estacao => {

        const nome = String(estacao.estacao || "").toLowerCase();
        const codigo = String(estacao.codigo_wmo || "").toLowerCase();
        const uf = String(estacao.uf || "").toLowerCase();

        return (
            nome.includes(busca) ||
            codigo.includes(busca) ||
            uf === busca
        );
    });

    const exatas = correspondencias.filter(estacao => {

        const nome = String(estacao.estacao || "").toLowerCase();
        const codigo = String(estacao.codigo_wmo || "").toLowerCase();

        return nome === busca || codigo === busca;
    });

    return exatas.length > 0 ? exatas : correspondencias;
}


function converterRegistroData(registro) {

    return {
        codigo: String(registro[0]),
        estacao: registro[1],
        uf: registro[2],
        time: registro[3],
        rain: registro[4],
        gust_kmh: registro[5],
        wind_kmh: registro[6]
    };
}


function converterRegistroEstacao(registro) {

    return {
        date: registro[0],
        time: registro[1],
        rain: registro[2],
        gust_kmh: registro[3],
        wind_kmh: registro[4]
    };
}


function iniciarConsultaHistorica() {
    const selectHora = $("historicoHora");
    for (let hora = 0; hora < 24; hora++) {
        const horario = `${String(hora).padStart(2, "0")}:00`;
        selectHora.add(
            new Option(horario, horario)
        );
    }

    $("consultarHistorico").addEventListener(
        "click",
        consultarHistorico
    );

    $("fecharModal").addEventListener("click", () => {
        $("modalHistorico").close();
    });
}


async function consultarHistorico() {

    const estacaoDigitada = $("historicoEstacao").value.trim();
    const data = $("historicoData").value;
    const hora = $("historicoHora").value;

    const resultado = $("historicoResultados");

    resultado.innerHTML = "";

    if (!estacaoDigitada && !data) {

        resultado.innerHTML = `
            <div class="notice">
                Informe uma estação ou uma data para realizar a consulta.
                A pesquisa somente por horário não é permitida.
            </div>
        `;

        return;
    }

    try {

        resultado.innerHTML = `
            <div class="notice">
                Consultando os registros...
            </div>
        `;

        let estacao = null;

        if (estacaoDigitada) {

            const encontradas = localizarEstacoes(estacaoDigitada);

            if (encontradas.length === 0) {

                resultado.innerHTML = `
                    <div class="notice">
                        Nenhuma estação encontrada para
                        "${estacaoDigitada}".
                        Verifique o nome ou o código WMO.
                    </div>
                `;

                return;
            }

            if (encontradas.length > 1) {

                resultado.innerHTML = `
                    <div class="notice">
                        Foram encontradas várias estações.
                        Refine sua pesquisa utilizando o nome completo
                        ou o código WMO.
                        <ul>
                            ${encontradas.slice(0, 10).map(item => `
                                <li>
                                    ${item.estacao} -
                                    ${item.uf} -
                                    Código WMO: ${item.codigo_wmo}
                                </li>
                            `).join("")}
                        </ul>
                    </div>
                `;

                return;
            }

            estacao = encontradas[0];
        }

        const codigo = estacao
            ? String(estacao.codigo_wmo)
            : null;

        const nomeEstacao = estacao
            ? `${estacao.estacao} (${estacao.uf})`
            : null;


        if (estacao && data) {

            const registros = await carregarJsonHistorico(
                `${PASTA_HISTORICO}/horarios_por_data/${data}.json`
            );

            let filtrados = registros
                .map(converterRegistroData)
                .filter(registro => registro.codigo === codigo);

            if (hora) {
                filtrados = filtrados.filter(
                    registro => registro.time === hora
                );
            }

            if (filtrados.length === 0) {
                mostrarAvisoSemResultados();
                return;
            }

            mostrarTabelaHoraria(
                filtrados.map(registro => ({
                    ...registro,
                    date: data
                })),
                `${nomeEstacao} · ${dateFmt(data)}`
            );

            return;
        }


        if (!estacao && data && !hora) {

            const resumo = await carregarJsonHistorico(
                `${PASTA_HISTORICO}/resumo_por_data/${data}.json`
            );

            mostrarResumoData(resumo);

            return;
        }


        if (!estacao && data && hora) {

            const registros = await carregarJsonHistorico(
                `${PASTA_HISTORICO}/horarios_por_data/${data}.json`
            );

            const filtrados = registros
                .map(converterRegistroData)
                .filter(registro => registro.time === hora);

            if (filtrados.length === 0) {
                mostrarAvisoSemResultados();
                return;
            }

            mostrarTabelaHoraria(
                filtrados.map(registro => ({
                    ...registro,
                    date: data
                })),
                `${dateFmt(data)} · ${hora} UTC`,
                true
            );

            return;
        }


        if (estacao && !data && hora) {

            const registros = await carregarJsonHistorico(
                `${PASTA_HISTORICO}/horarios_por_estacao/${codigo}.json`
            );

            const filtrados = registros
                .map(converterRegistroEstacao)
                .filter(registro => registro.time === hora);

            if (filtrados.length === 0) {
                mostrarAvisoSemResultados();
                return;
            }

            mostrarTabelaHoraria(
                filtrados,
                `${nomeEstacao} · ${hora} UTC`
            );

            return;
        }


        if (estacao && !data && !hora) {

            const resumo = await carregarJsonHistorico(
                `${PASTA_HISTORICO}/resumo_por_estacao/${codigo}.json`
            );

            mostrarResumoDiario(resumo);

            return;
        }

    } catch (erro) {

        console.error("Erro na consulta histórica:", erro);

        resultado.innerHTML = `
            <div class="notice">
                Ocorreu um erro ao consultar os dados.
                <br><br>
                ${erro.message}
                <br><br>
                Verifique se os arquivos JSON estão disponíveis
                no diretório dados/historico_completo.
            </div>
        `;
    }
}


function mostrarAvisoSemResultados() {

    $("historicoResultados").innerHTML = `
        <div class="notice">
            Nenhum registro encontrado para os filtros selecionados.
        </div>
    `;
}


function mostrarResumoDiario(resumo) {

    const dias = resumo.resumos_diarios || [];

    if (dias.length === 0) {
        mostrarAvisoSemResultados();
        return;
    }

    $("historicoResultados").innerHTML = `

        <div class="section-head">
            <div>
                <h2>${resumo.estacao} (${resumo.uf})</h2>
                <p>
                    ${dias.length} dia(s) de registros encontrados.
                    Resumos meteorológicos diários.
                </p>
            </div>
        </div>

        <div class="station-grid">

            ${dias.map(dia => `

                <article class="estacao-card">

                    <h3>${dateFmt(dia.data)}</h3>

                    <p>
                        Precipitação total:
                        <strong>
                            ${fmt(dia.precipitacao_total_mm)} mm
                        </strong>
                    </p>

                    <p>
                        Precipitação média horária:
                        <strong>
                            ${fmt(dia.precipitacao_media_horaria_mm)} mm
                        </strong>
                    </p>

                    <p>
                        Velocidade média do vento:
                        <strong>
                            ${fmt(dia.vento_medio_kmh)} km/h
                        </strong>
                    </p>

                    <p>
                        Rajada máxima:
                        <strong>
                            ${fmt(dia.rajada_max_kmh)} km/h
                        </strong>
                    </p>

                </article>

            `).join("")}

        </div>
    `;
}


function mostrarResumoData(resumo) {

    const estacoes = resumo.estacoes || [];

    if (estacoes.length === 0) {
        mostrarAvisoSemResultados();
        return;
    }

    $("historicoResultados").innerHTML = `

        <div class="card">

            <h2>Resumo de ${dateFmt(resumo.data)}</h2>

            <p>
                ${estacoes.length} estação(ões) encontradas.
            </p>

            <div style="overflow-x:auto">

                <table>

                    <thead>
                        <tr>
                            <th>Estação</th>
                            <th>UF</th>
                            <th>Precipitação total (mm)</th>
                            <th>Vento médio (km/h)</th>
                            <th>Rajada máxima (km/h)</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${estacoes.map(estacao => `

                            <tr>
                                <td>${estacao.estacao}</td>
                                <td>${estacao.uf}</td>
                                <td>${fmt(estacao.precipitacao_total_mm)}</td>
                                <td>${fmt(estacao.vento_medio_kmh)}</td>
                                <td>${fmt(estacao.rajada_max_kmh)}</td>
                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


function mostrarTabelaHoraria(registros, titulo, incluirEstacao = false) {

    $("historicoResultados").innerHTML = `

        <div class="card">

            <h2>${titulo}</h2>

            <p>
                ${registros.length.toLocaleString("pt-BR")}
                observação(ões) encontrada(s).
            </p>

            <div style="overflow-x:auto">

                <table>

                    <thead>
                        <tr>
                            ${incluirEstacao ? "<th>Estação</th><th>UF</th>" : ""}
                            <th>Data</th>
                            <th>Hora UTC</th>
                            <th>Precipitação (mm)</th>
                            <th>Rajada (km/h)</th>
                            <th>Velocidade do vento (km/h)</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${registros.map(registro => `

                            <tr>
                                ${incluirEstacao ? `
                                    <td>${registro.estacao}</td>
                                    <td>${registro.uf}</td>
                                ` : ""}

                                <td>${registro.date ? dateFmt(registro.date) : "—"}</td>
                                <td>${registro.time}</td>
                                <td>${fmt(registro.rain)}</td>
                                <td>${fmt(registro.gust_kmh)}</td>
                                <td>${fmt(registro.wind_kmh)}</td>
                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;
}


carregarDados();



/*function iniciarConsultaHistorica() {

    const registros = D.estacao_amostra.records;

    const horarios = [...new Set(registros.map(registro => registro.time))];

    horarios.sort();

    horarios.forEach(horario => {

        $("historicoHora").add(
            new Option(horario, horario)
        );

    });

    $("consultarHistorico").addEventListener(
        "click",
        consultarHistorico
    );

    $("fecharModal").addEventListener("click", () => {
        $("modalHistorico").close();
    });

}


function consultarHistorico() {

    const estacaoDigitada = $("historicoEstacao").value.trim().toLowerCase();
    const data = $("historicoData").value;
    const hora = $("historicoHora").value;
    const resultado = $("historicoResultados");
    resultado.innerHTML = "";

    if (!estacaoDigitada && !data) {

        resultado.innerHTML = `
            <div class="notice">
                Informe uma estação ou uma data para realizar a consulta.
                A pesquisa somente por horário não é permitida.
            </div>
        `;

        return;
    }

    const amostra = D.estacao_amostra;

    const correspondeEstacao = !estacaoDigitada ||
        [
            amostra.name,
            amostra.uf,
            amostra.wmo
        ].some(valor =>
            String(valor).toLowerCase().includes(estacaoDigitada)
        );

    if (!correspondeEstacao) {

        resultado.innerHTML = `
            <div class="notice">
                Ainda não temos observações horárias disponíveis
                para essa estação.

                <br><br>

                Os resumos das 634 estações estão disponíveis na aba
                Explorar dados, mas a consulta horária completa ainda
                está limitada à estação ${amostra.name}.
            </div>
        `;

        return;
    }

    let registros = amostra.records;

    if (data) {
        registros = registros.filter(registro => registro.date === data);
    }

    if (hora) {
        registros = registros.filter(registro => registro.time === hora);
    }

    if (registros.length === 0) {

        resultado.innerHTML = `
            <div class="notice">
                Nenhum registro encontrado para os filtros selecionados.
            </div>
        `;

        return;
    }

    if (estacaoDigitada && data) {

        mostrarTabelaHoraria(
            registros,
            `${amostra.name} · ${dateFmt(data)}`
        );

        return;
    }

    if (estacaoDigitada && hora) {

        mostrarDatas(registros, amostra, hora);

        return;
    }

    if (estacaoDigitada && !data && !hora) {

        mostrarResumoDiario(registros, amostra);

        return;
    }

    if (data && hora) {

        mostrarTabelaHoraria(
            registros,
            `${amostra.name} · ${dateFmt(data)} · ${hora} UTC`
        );

        return;
    }

    if (data && !hora) {

        mostrarResumoDiario(registros, amostra);

    }

}


function calcularMedia(registros, campo) {

    const valores = registros
        .map(registro => registro[campo])
        .filter(valor => valor != null && Number.isFinite(Number(valor)))
        .map(Number);

    if (valores.length === 0) return null;

    return valores.reduce((soma, valor) => soma + valor, 0) / valores.length;

}


function mostrarResumoDiario(registros, estacao) {

    const grupos = {};

    registros.forEach(registro => {

        if (!grupos[registro.date]) {
            grupos[registro.date] = [];
        }

        grupos[registro.date].push(registro);

    });

    const datas = Object.keys(grupos).sort();

    $("historicoResultados").innerHTML = `
        <div class="section-head">
            <div>
                <h2>${estacao.name}</h2>

                <p>
                    ${datas.length} dia(s) encontrado(s).
                    Clique em uma data para consultar os horários.
                </p>
            </div>
        </div>

        <div class="station-grid">

            ${datas.map(data => {

                const dia = grupos[data];

                const mediaChuva = calcularMedia(dia, "rain");
                const mediaVento = calcularMedia(dia, "wind_kmh");

                return `
                    <article
                        class="estacao-card date-card"
                        data-date="${data}"
                    >

                        <h3>${dateFmt(data)}</h3>

                        <p>
                            Média de precipitação:
                            <strong>${fmt(mediaChuva)} mm</strong>
                        </p>

                        <p>
                            Média de rajada de vento:
                            <strong>${fmt(mediaVento)} km/h</strong>
                        </p>

                        <p>
                            ${dia.length} observações disponíveis
                        </p>

                        <button
                            type="button"
                            class="open-day"
                            data-date="${data}"
                        >
                            Ver horários
                        </button>

                    </article>
                `;

            }).join("")}

        </div>
    `;

    document.querySelectorAll(".open-day").forEach(botao => {

        botao.addEventListener("click", () => {

            const data = botao.dataset.date;

            const dia = grupos[data];

            abrirModal(
                `${estacao.name} · ${dateFmt(data)}`,
                `${dia.length} observações meteorológicas`,
                dia
            );

        });

    });

}


function mostrarDatas(registros, estacao, hora) {

    $("historicoResultados").innerHTML = `
        <div class="section-head">
            <div>
                <h2>${estacao.name}</h2>

                <p>
                    Registros encontrados às ${hora} UTC.
                    Selecione uma data para ver todos os horários.
                </p>
            </div>
        </div>

        <div class="station-grid">

            ${registros.map(registro => `

                <article class="estacao-card">

                    <h3>${dateFmt(registro.date)}</h3>

                    <p>
                        Horário consultado: ${registro.time} UTC
                    </p>

                    <p>
                        Precipitação:
                        <strong>${fmt(registro.rain)} mm</strong>
                    </p>

                    <p>
                        Rajada de vento:
                        <strong>${fmt(registro.wind_kmh)} km/h</strong>
                    </p>

                    <button
                        type="button"
                        class="open-day"
                        data-date="${registro.date}"
                    >
                        Ver dia completo
                    </button>

                </article>

            `).join("")}

        </div>
    `;

    document.querySelectorAll(".open-day").forEach(botao => {

        botao.addEventListener("click", () => {

            const data = botao.dataset.date;

            const dia = estacao.records.filter(
                registro => registro.date === data
            );

            abrirModal(
                `${estacao.name} · ${dateFmt(data)}`,
                `${dia.length} observações meteorológicas`,
                dia
            );

        });

    });

}


function mostrarTabelaHoraria(registros, titulo) {

    $("historicoResultados").innerHTML = `
        <div class="card">

            <h2>${titulo}</h2>

            <p>
                ${registros.length} observação(ões) encontrada(s).
            </p>

            <div style="overflow-x:auto">

                <table>

                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Hora UTC</th>
                            <th>Precipitação (mm)</th>
                            <th>Rajada (km/h)</th>
                        </tr>
                    </thead>

                    <tbody>

                        ${registros.map(registro => `

                            <tr>
                                <td>${dateFmt(registro.date)}</td>
                                <td>${registro.time}</td>
                                <td>${fmt(registro.rain)}</td>
                                <td>${fmt(registro.wind_kmh)}</td>
                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>

        </div>
    `;

}


function abrirModal(titulo, descricao, registros) {

    $("modalTitulo").textContent = titulo;

    $("modalDescricao").textContent = descricao;

    $("modalConteudo").innerHTML = `

        <div style="overflow-x:auto">

            <table>

                <thead>
                    <tr>
                        <th>Hora UTC</th>
                        <th>Precipitação (mm)</th>
                        <th>Rajada (km/h)</th>
                    </tr>
                </thead>

                <tbody>

                    ${registros.map(registro => `

                        <tr>
                            <td>${registro.time}</td>
                            <td>${fmt(registro.rain)}</td>
                            <td>${fmt(registro.wind_kmh)}</td>
                        </tr>

                    `).join("")}

                </tbody>

            </table>

        </div>

    `;

    $("modalHistorico").showModal();

}

carregarDados();*/
