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
            <label>% Prima actual (para comparación):</label>
            <input type="number" id="primaActual" value="0.54355" step="0.00001">
            <label>Días subsidiados (S):</label>
            <input type="number" id="S" value="0" step="0.01">
            <label>Incapacidades permanentes % sumados /100 (I):</label>
            <input type="number" id="I" value="0" step="0.01">
            <label>Defunciones (D):</label>
            <input type="number" id="D" value="0">
            <label>Trabajadores promedio (N):</label>
            <input type="number" id="N" value="1">
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
        title.textContent = 'Infonavit + RCV Bimestral (Patrón)';
        form.innerHTML = `
            <label>Salario Base de Cotización diario (SBC):</label>
            <input type="number" id="SBC" value="${SM}" step="0.01">
            <label>Días del bimestre (59-62, puede ser decimal):</label>
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
        const primaActual = parseFloat(document.getElementById('primaActual').value) || 0.54355;
        const S = parseFloat(document.getElementById('S').value) || 0;
        const I = parseFloat(document.getElementById('I').value) || 0;
        const D = parseFloat(document.getElementById('D').value) || 0;
        const N = parseFloat(document.getElementById('N').value) || 1;
        const V = 28; // Default fijo
        const F = 2.3; // Default fijo
        const M = 0.005; // Prima mínima base
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('dias').value) || 30;

        // Fórmula exacta
        const parte1 = S / 365;
        const parte2 = V * (I + D);
        const incidencia = (parte1 + parte2) * (F / N);
        let primaNueva = incidencia + M;
        primaNueva = Math.min(primaNueva, 15); // Máximo 15%

        const diferencia = primaNueva - primaActual;
        let comparacion = '';
        if (diferencia > 0) comparacion = `Sube ${diferencia.toFixed(5)}% respecto a actual.`;
        else if (diferencia < 0) comparacion = `Baja ${Math.abs(diferencia).toFixed(5)}% respecto a actual.`;
        else comparacion = 'Igual a la actual.';

        const monto = (primaNueva / 100) * SBC * dias;

        resultado = `**Prima de Riesgo (100% Patrón)**\n\n` +
                    `Prima nueva calculada: ${primaNueva.toFixed(5)}%\n` +
                    `Comparación: ${comparacion}\n` +
                    `Monto a pagar este periodo: $${monto.toFixed(2)}\n` +
                    `(SBC: $${SBC.toFixed(2)} × ${dias} días)\n\n` +
                    `Pago mensual antes del 17 del mes siguiente.`;
    } else if (title.includes('cuotas')) {
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('dias').value) || 30;
        const primaRTPorc = parseFloat(document.getElementById('primaRT').value) || 0.54355;

        const tramo = determineTramo(SBC, UMA);
        const pctRCV = getRCVPatron(tramo);

        const RT_p = (primaRTPorc / 100) * SBC * dias;
        const fijaEM_p = 0.2040 * UMA * dias;
        const excedente = Math.max(SBC - 3 * UMA, 0);
        const adicEM_p = 0.0110 * excedente * dias;
        const adicEM_o = 0.0040 * excedente * dias;
        const gmpEM_p = 0.0105 * SBC * dias;
        const gmpEM_o = 0.00375 * SBC * dias;
        const pdEM_p = 0.0070 * SBC * dias;
        const pdEM_o = 0.0025 * SBC * dias;
        const IV_p = 0.0175 * SBC * dias;
        const IV_o = 0.00625 * SBC * dias;
        const RCV_p = (pctRCV / 100) * SBC * dias;
        const RCV_o = 0.01125 * SBC * dias;
        const guard_p = 0.0100 * SBC * dias;

        const total_patron = RT_p + fijaEM_p + adicEM_p + gmpEM_p + pdEM_p + IV_p + RCV_p + guard_p;
        const total_obrero = adicEM_o + gmpEM_o + pdEM_o + IV_o + RCV_o;
        const gran_total = total_patron + total_obrero;

        resultado = `**Cuotas IMSS Mensuales**\n\n` +
                    `Tramo RCV: ${tramo} → Patrón ${pctRCV.toFixed(3)}%\n\n` +
                    `Total Patrón: $${total_patron.toFixed(2)}\n` +
                    `Total Obrero: $${total_obrero.toFixed(2)}\n` +
                    `Gran Total: $${gran_total.toFixed(2)}\n\n` +
                    `Desglose Patrón:\n` +
                    `- RT (${primaRTPorc.toFixed(5)}%): $${RT_p.toFixed(2)}\n` +
                    `- EM Fija (20.4% UMA): $${fijaEM_p.toFixed(2)}\n` +
                    `- EM Adicional (1.1% excedente): $${adicEM_p.toFixed(2)}\n` +
                    `- EM GMP (1.05%): $${gmpEM_p.toFixed(2)}\n` +
                    `- EM PD (0.7%): $${pdEM_p.toFixed(2)}\n` +
                    `- IV (1.75%): $${IV_p.toFixed(2)}\n` +
                    `- RCV (${pctRCV.toFixed(3)}%): $${RCV_p.toFixed(2)}\n` +
                    `- Guarderías (1%): $${guard_p.toFixed(2)}\n\n` +
                    `Desglose Obrero:\n` +
                    `- EM Adicional (0.4% excedente): $${adicEM_o.toFixed(2)}\n` +
                    `- EM GMP (0.375%): $${gmpEM_o.toFixed(2)}\n` +
                    `- EM PD (0.25%): $${pdEM_o.toFixed(2)}\n` +
                    `- IV (0.625%): $${IV_o.toFixed(2)}\n` +
                    `- RCV (1.125%): $${RCV_o.toFixed(2)}\n\n` +
                    `Pago antes del 17 del mes siguiente.`;
    } else if (title.includes('infonavit')) {
        const SBC = parseFloat(document.getElementById('SBC').value) || SM;
        const dias = parseFloat(document.getElementById('diasBimestre').value) || 60;

        const tramo = determineTramo(SBC, UMA);
        const pctCEAV = getRCVPatron(tramo); // Progresivo para CEAV

        const retiro_p = SBC * dias * 0.02; // 2% Retiro patrón
        const ceav_p = SBC * dias * (pctCEAV / 100); // CEAV progresivo patrón
        const rcv_o = SBC * dias * 0.01125; // RCV obrera 1.125%
        const infonavit_p = SBC * dias * 0.05; // 5% Infonavit patrón

        const total_rcv_p = retiro_p + ceav_p;
        const total_patron = total_rcv_p + infonavit_p;
        const total_obrero = rcv_o;
        const gran_total = total_patron + total_obrero;

        resultado = `**Infonavit + RCV Bimestral (meses pares)**\n\n` +
                    `Tramo: ${tramo} → CEAV Patrón ${pctCEAV.toFixed(3)}%\n\n` +
                    `Total Patrón: $${total_patron.toFixed(2)}\n` +
                    `Total Obrero: $${total_obrero.toFixed(2)}\n` +
                    `Gran Total: $${gran_total.toFixed(2)}\n\n` +
                    `Desglose Patrón:\n` +
                    `- Retiro (2%): $${retiro_p.toFixed(2)}\n` +
                    `- CEAV (${pctCEAV.toFixed(3)}%): $${ceav_p.toFixed(2)}\n` +
                    `- Infonavit (5%): $${infonavit_p.toFixed(2)}\n\n` +
                    `Desglose Obrero:\n` +
                    `- RCV (1.125%): $${rcv_o.toFixed(2)}\n\n` +
                    `Pago antes del 17 del mes siguiente al bimestre.`;
    }

    document.getElementById('resultado').innerHTML = resultado;
}

function determineTramo(SBC, UMA) {
    const f = SBC / UMA;
    if (f <= 1) return '1.00 SM';
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
        '1.00 SM': 3.150,
        '1.01-1.50 UMA': 4.148,
        '1.51-2.00 UMA': 4.850,
        '2.01-2.50 UMA': 5.564,
        '2.51-3.00 UMA': 6.039,
        '3.01-3.50 UMA': 6.366,
        '3.51-4.00 UMA': 6.626,
        '4.01 UMA+': 7.558
    };
    return tabla[tramo] || 3.150;
}