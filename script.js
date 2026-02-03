function showModule(modulo) {
    const content = document.getElementById('module-content');
    const title = document.getElementById('module-title');
    const form = document.getElementById('calc-form');
    form.innerHTML = '';
    document.getElementById('resultado').innerHTML = '';

    const UMA = 117.31;
    const SM = 315.04;
    const diasMes = 30;
    const diasBimestre = 60;

    if (modulo === 'prima') {
        title.textContent = 'Prima de Riesgo (100% Patrón)';
        form.innerHTML = `
            <label>Clase de riesgo (I a V):</label>
            <select id="claseRiesgo">
                <option value="I">I (bajo riesgo)</option>
                <option value="II">II</option>
                <option value="III">III</option>
                <option value="IV">IV</option>
                <option value="V">V (alto riesgo)</option>
            </select>
            <label>Salario Base de Cotización diario (SBC):</label>
            <input type="number" id="SBC" value="${SM}" step="0.01">
            <label>Días del periodo (ej: 30.5):</label>
            <input type="number" id="dias" value="${diasMes}" step="0.01">
        `;
    } else if (modulo === 'cuotas') {
        title.textContent = 'Cuotas IMSS Mensuales (Patrón)';
        form.innerHTML = `
            <label>Salario Base de Cotización diario (SBC):</label>
            <input type="number" id="SBC" value="${SM}" step="0.01">
            <label>Días trabajados en el mes (puede ser decimal):</label>
            <input type="number" id="dias" value="${diasMes}" step="0.01">
            <label>Prima de riesgo % (default clase I):</label>
            <input type="number" id="primaRT" value="0.54355" step="0.00001">
        `;
    } else if (modulo === 'infonavit') {
        title.textContent = 'Infonavit + RCV (Patrón)';
        form.innerHTML = `
            <label>Salario Base de Cotización diario (SBC):</label>
            <input type="number" id="SBC" value="${SM}" step="0.01">
            <label>Días del bimestre (puede ser decimal):</label>
            <input type="number" id="diasBimestre" value="${diasBimestre}" step="0.01">
        `;
    }

    content.style.display = 'block';
}

function calcular() {
    const title = document.getElementById('module-title').textContent.toLowerCase();
    let resultado = '';

    const UMA = 117.31;
    const SM = 315.04;

    if (title.includes('prima')) {
        const clase = document.getElementById('claseRiesgo').value;
        const M = getPrimaMedia(clase);
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('dias').value) || 30;

        const primaPorc = M; // Simplificado: usamos prima media (caso más común)
        const monto = (primaPorc / 100) * SBC * dias;

        resultado = `**Prima de Riesgo (${clase})**\n\n` +
                    `Porcentaje: ${primaPorc.toFixed(5)}%\n` +
                    `Monto a pagar este periodo: $${monto.toFixed(2)}\n` +
                    `(SBC: $${SBC.toFixed(2)} × ${dias} días)\n\n` +
                    `Pago mensual antes del 17 del mes siguiente.`;
    } 
    else if (title.includes('cuotas')) {
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('dias').value) || 30;
        const primaRTPorc = parseFloat(document.getElementById('primaRT').value) || 0.54355;

        const tramo = determineTramo(SBC, UMA);
        const pctRCV = getRCVPatron(tramo);

        const RT = (primaRTPorc / 100) * SBC * dias;
        const fijaEM = 0.2040 * UMA * dias;
        const excedente = Math.max(SBC - 3 * UMA, 0);
        const adicEM_p = 0.0110 * excedente * dias;
        const gmpEM_p = 0.0105 * SBC * dias;
        const pdEM_p = 0.0070 * SBC * dias;
        const IV_p = 0.0175 * SBC * dias;
        const RCV_p = (pctRCV / 100) * SBC * dias;
        const guard = 0.0100 * SBC * dias;

        const totalPatron = RT + fijaEM + adicEM_p + gmpEM_p + pdEM_p + IV_p + RCV_p + guard;

        resultado = `**Cuotas IMSS Mensuales**\n\n` +
                    `Tramo RCV: ${tramo} → Patrón ${pctRCV}% \n` +
                    `Total a pagar por el patrón: $${totalPatron.toFixed(2)}\n\n` +
                    `Desglose aproximado:\n` +
                    `- Riesgos Trabajo: $${RT.toFixed(2)}\n` +
                    `- Enfermedades y Maternidad: $${(fijaEM + adicEM_p + gmpEM_p + pdEM_p).toFixed(2)}\n` +
                    `- Invalidez y Vida: $${IV_p.toFixed(2)}\n` +
                    `- RCV: $${RCV_p.toFixed(2)}\n` +
                    `- Guarderías: $${guard.toFixed(2)}\n\n` +
                    `Pago antes del 17 del mes siguiente.`;
    } 
    else if (title.includes('infonavit')) {
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('diasBimestre').value) || 60;

        const tramo = determineTramo(SBC, UMA);
        const pctRCV = getRCVPatron(tramo);

        const infonavit = 0.05 * SBC * dias;
        const rcvPatron = (pctRCV / 100) * SBC * dias;

        const totalBim = infonavit + rcvPatron;
        const eqMensual = totalBim / 2;

        resultado = `**Infonavit + RCV Bimestral**\n\n` +
                    `Tramo RCV: ${tramo} → Patrón ${pctRCV}% \n` +
                    `Total a pagar por el patrón este bimestre: $${totalBim.toFixed(2)}\n` +
                    `(Infonavit 5%: $${infonavit.toFixed(2)} | RCV Patrón: $${rcvPatron.toFixed(2)})\n\n` +
                    `Equivalente mensual aproximado: $${eqMensual.toFixed(2)}\n\n` +
                    `Pago antes del 17 del mes siguiente al bimestre.`;
    }

    document.getElementById('resultado').innerHTML = resultado;
}

function determineTramo(SBC, UMA) {
    const f = SBC / UMA;
    if (f <= 1) return '1.0 SM/UMA';
    if (f <= 1.5) return '1.01-1.50 UMA';
    if (f <= 2.0) return '1.51-2.00 UMA';
    if (f <= 2.5) return '2.01-2.50 UMA';
    if (f <= 3.0) return '2.51-3.00 UMA';
    if (f <= 3.5) return '3.01-3.50 UMA';
    if (f <= 4.0) return '3.51-4.00 UMA';
    return '4.01 UMA+';
}

function getRCVPatron(tramo) {
    const tabla = {
        '1.0 SM/UMA': 3.150,
        '1.01-1.50 UMA': 3.676,
        '1.51-2.00 UMA': 4.851,
        '2.01-2.50 UMA': 5.556,
        '2.51-3.00 UMA': 6.026,
        '3.01-3.50 UMA': 6.361,
        '3.51-4.00 UMA': 6.613,
        '4.01 UMA+': 7.513
    };
    return tabla[tramo] || 3.150;
}

function getPrimaMedia(clase) {
    const medias = { 'I':0.54355, 'II':1.13065, 'III':2.59840, 'IV':4.65325, 'V':7.58827 };
    return medias[clase] || 0.54355;
}