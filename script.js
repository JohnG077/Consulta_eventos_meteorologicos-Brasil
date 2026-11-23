
let D;

const fmt = (v, d = 1) => v == null
    ? 'Sem dados'
    : Number(v).toLocaleString('pt-BR', {
        minimumFractionDigits: d,
        maximumFractionDigits: d
    });

const dateFmt = s => {
    if (!s) return 'Data não informada';

    const m = s.match(/^(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2})(\d{2})\s+UTC$/);

    return m
        ? `${m[3]}/${m[2]}/${m[1]} às ${m[4]}:${m[5]} UTC`
        : s;
};

function rainLevel(v) {
    if (v == null) return ['Sem classificação', ''];
    if (v < 20) return ['Abaixo dos limiares apresentados', ''];
    if (v <= 30) return ['Perigo potencial', 'info'];
    if (v <= 60) return ['Perigo', 'warn'];

    return ['Grande perigo', 'danger'];
}

function windLevel(v) {
    if (v == null) return ['Sem classificação', ''];
    if (v < 40) return ['Abaixo dos limiares apresentados', ''];
    if (v <= 60) return ['Perigo potencial', 'info'];
    if (v <= 99) return ['Perigo', 'warn'];

    return ['Grande perigo', 'danger'];
}

function eventCard(label, value, unit, station, date, level) {
    return `
        <div class="metric">
            <small>${label}</small>
            <strong>${fmt(value)} ${unit}</strong>
            <div class="sub">${station || 'Estação não identificada'} · ${dateFmt(date)}</div>
            <p>
                <span class="pill ${level[1]}">${level[0]}</span>
            </p>
        </div>
    `;
}

function renderState() {
    const uf = document.getElementById('ufSelect').value;
    const g = D.estados[uf];

    if (!g) return;

    document.getElementById('stateContent').innerHTML = `
        <div class="metrics">
            ${eventCard(
                'Maior precipitação horária',
                g.precipitacao.maior_maxima_horaria_mm,
                'mm',
                g.precipitacao.estacao_maior_precipitacao,
                g.precipitacao.data_maior_precipitacao,
                rainLevel(g.precipitacao.maior_maxima_horaria_mm)
            )}

            ${eventCard(
                'Maior rajada de vento',
                g.rajada_vento.maior_rajada_kmh,
                'km/h',
                g.rajada_vento.estacao_maior_rajada,
                g.rajada_vento.data_maxima,
                windLevel(g.rajada_vento.maior_rajada_kmh)
            )}

            <div class="metric">
                <small>Estações analisadas</small>
                <strong>${g.total_estacoes}</strong>
                <div class="sub">${g.estacoes_com_precipitacao} com dados válidos de precipitação</div>
            </div>

            <div class="metric">
                <small>Observações meteorológicas</small>
                <strong>${Number(g.observacoes_acumuladas).toLocaleString('pt-BR')}</strong>
                <div class="sub">Soma dos registros das estações</div>
            </div>
        </div>

        <div class="notice">
            Classificação indicativa aplicada aos máximos horários informados. Não representa emissão de alerta oficial. Os horários de origem estão em UTC. A classificação de chuva usa o máximo horário; não se aplica aqui o limiar de acumulado em 24 horas.
        </div>
    `;
}

function renderRank(id, items, type) {
    document.getElementById(id).innerHTML = items.map((x, i) => {
        let v = type === 'rain'
            ? `${fmt(x.maxima_horaria_mm)} mm`
            : `${fmt(x.maxima_kmh)} km/h`;

        return `
            <div class="event">
                <strong>${i + 1}. ${x.estacao}</strong>
                <div class="muted">${x.uf} · Região ${x.regiao} · ${dateFmt(x.data)}</div>
                <b>${v}</b>
            </div>
        `;
    }).join('');
}

function renderTime() {
    const date = document.getElementById('dateSelect').value;
    const hour = document.getElementById('hourSelect').value;

    let a = D.estacao_amostra.records.filter(x =>
        (!date || x.date === date) &&
        (!hour || x.time === hour)
    );

    document.getElementById('timeResults').innerHTML = a.length
        ? `
            <div class="card">
                <h3>${D.estacao_amostra.name} · ${D.estacao_amostra.uf}</h3>

                <p class="muted">
                    ${a.length} observações encontradas · Código WMO ${D.estacao_amostra.wmo}
                </p>

                <div style="overflow:auto">
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Hora UTC</th>
                                <th>Precipitação (mm)</th>
                                <th>Rajada (km/h)</th>
                                <th>Classificação chuva</th>
                                <th>Classificação vento</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${a.map(x => `
                                <tr>
                                    <td>${x.date}</td>
                                    <td>${x.time}</td>
                                    <td>${fmt(x.rain)}</td>
                                    <td>${fmt(x.wind_kmh)}</td>
                                    <td>
                                        <span class="pill ${rainLevel(x.rain)[1]}">
                                            ${rainLevel(x.rain)[0]}
                                        </span>
                                    </td>
                                    <td>
                                        <span class="pill ${windLevel(x.wind_kmh)[1]}">
                                            ${windLevel(x.wind_kmh)[0]}
                                        </span>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `
        : '<div class="card">Nenhuma observação encontrada para os filtros selecionados.</div>';
}

async function init() {
    try {
        D = await fetch('dados/dados.json').then(r => {
            if (!r.ok) throw Error();

            return r.json();
        });

        const sel = document.getElementById('ufSelect');

        Object.keys(D.estados).sort().forEach(uf =>
            sel.add(new Option(uf, uf))
        );

        sel.value = 'RJ';
        sel.addEventListener('change', renderState);

        renderState();

        document.getElementById('stationName').textContent =
            `${D.estacao_amostra.name} (${D.estacao_amostra.uf})`;

        const hs = [
            ...new Set(D.estacao_amostra.records.map(x => x.time))
        ];

        hs.forEach(h =>
            document.getElementById('hourSelect').add(new Option(h, h))
        );

        document.getElementById('searchTime').onclick = renderTime;

        renderTime();

        renderRank(
            'rainRanking',
            D.ranking.maiores_precipitacoes_horarias,
            'rain'
        );

        renderRank(
            'windRanking',
            D.ranking.maiores_rajadas_de_vento,
            'wind'
        );

        document.querySelectorAll('.tab').forEach(b =>
            b.onclick = () => {
                document.querySelectorAll('.tab,.panel').forEach(x =>
                    x.classList.remove('active')
                );

                b.classList.add('active');

                document.getElementById(b.dataset.tab).classList.add('active');
            }
        );

    } catch (e) {
        document.querySelector('main').innerHTML = `
            <div class="notice">
                Não foi possível carregar dados/dados.json. Abra o site por um servidor local simples (por exemplo, extensão Live Server) ou mantenha os arquivos na estrutura original.
            </div>
        `;
    }
}

init();
