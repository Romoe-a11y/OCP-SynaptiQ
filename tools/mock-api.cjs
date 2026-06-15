const http = require("http");

const PORT = Number(process.env.MOCK_API_PORT || 8080);

const now = new Date().toISOString();

const latestMeasure = {
  id: 1,
  nomMachine: "Moteur Industriel 1",
  machine: { id: 1, nom: "Moteur Industriel 1" },
  horodatage: now,
  temperature: 72.4,
  courant: 18.6,
  vibration: 0.74,
  rpm: 1640,
  statut: "ALERTE",
  etiquetteAnomalie: true,
};

const measures = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  nomMachine: "Moteur Industriel 1",
  machine: { id: 1, nom: "Moteur Industriel 1" },
  horodatage: new Date(Date.now() - (11 - index) * 15 * 60 * 1000).toISOString(),
  temperature: Number((58 + index * 1.3).toFixed(1)),
  courant: Number((14 + index * 0.35).toFixed(1)),
  vibration: Number((0.22 + index * 0.05).toFixed(2)),
  rpm: 1750 - index * 10,
  statut: index > 8 ? "ALERTE" : "NORMAL",
  etiquetteAnomalie: index > 8,
}));

const alertes = [
  {
    id: 1,
    message: "Alerte : temperature elevee detectee",
    gravite: "MOYENNE",
    statut: "ACTIVE",
    dateCreation: now,
  },
  {
    id: 2,
    message: "Alerte : vibration anormale detectee",
    gravite: "MOYENNE",
    statut: "ACTIVE",
    dateCreation: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const anomalies = [
  {
    id: 1,
    type: "TEMP_ELEVEE",
    description: "Temperature above normal operating range",
    gravite: "MOYENNE",
    score: 62.5,
    dateDetection: now,
  },
  {
    id: 2,
    type: "VIBRATION_ANORMALE",
    description: "Vibration trend requires inspection",
    gravite: "MOYENNE",
    score: 58.1,
    dateDetection: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
];

const predictions = [
  {
    id: 1,
    statutPredit: "ALERTE",
    niveauRisque: "MOYEN",
    confiance: 82.4,
    dateCreation: now,
  },
  {
    id: 2,
    statutPredit: "NORMAL",
    niveauRisque: "FAIBLE",
    confiance: 91.2,
    dateCreation: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

const dashboard = {
  derniereMesure: latestMeasure,
  alertes,
  anomalies,
  predictions,
};

function send(res, status, body) {
  const isText = typeof body === "string";
  const payload = isText ? body : JSON.stringify(body);

  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Content-Type": isText ? "text/plain; charset=utf-8" : "application/json; charset=utf-8",
  });
  res.end(payload);
}

function readJson(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function diagnosticFromPayload(payload) {
  const temperature = Number(payload.temperature ?? latestMeasure.temperature);
  const courant = Number(payload.courant ?? latestMeasure.courant);
  const vibration = Number(payload.vibration ?? latestMeasure.vibration);
  const rpm = Number(payload.rpm ?? latestMeasure.rpm);

  let label = "NORMAL";
  let cause = "No significant abnormal cause detected";
  let recommendation = "Continue normal monitoring";
  let decision = "SURVEILLANCE";

  if (temperature >= 85) {
    label = "SURCHAUFFE_PROBABLE";
    cause = "Cooling issue or thermal overload";
    recommendation = "Inspect the cooling system and review operating conditions";
    decision = "INTERVENTION_URGENTE";
  } else if (courant >= 35) {
    label = "SURCHARGE_ELECTRIQUE_PROBABLE";
    cause = "Excessive motor load or abnormal power supply";
    recommendation = "Check the power supply and reduce operating load";
    decision = "VERIFICATION_IMMEDIATE";
  } else if (vibration >= 1.2 || rpm < 1450) {
    label = "USURE_MECANIQUE_PROBABLE";
    cause = "Probable mechanical wear or misalignment";
    recommendation = "Inspect bearings and verify mechanical alignment";
    decision = "MAINTENANCE_PLANIFIEE";
  }

  return {
    diagnostic_label: label,
    cause_probable: cause,
    recommandation: recommendation,
    decision,
    input_data: {
      temperature,
      courant,
      vibration,
      couple: Number(payload.couple ?? 168.5),
      rpm,
      failure_probability: Number(payload.failure_probability ?? 0.32),
      component_health_score: Number(payload.component_health_score ?? 0.72),
    },
  };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "OPTIONS") {
    return send(res, 204, "");
  }

  if (req.method === "POST" && url.pathname === "/api/auth/login") {
    const body = await readJson(req);

    if (body.email === "admin@gmail.com" && body.motDePasse === "admin123") {
      return send(res, 200, {
        id: 1,
        nomComplet: "Admin Demo",
        email: body.email,
        role: "ADMIN",
        message: "Connexion reussie",
      });
    }

    return send(res, 401, "Email or password incorrect");
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard") {
    return send(res, 200, dashboard);
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard/stats") {
    return send(res, 200, {
      totalMesures: measures.length,
      totalAnomalies: anomalies.length,
      totalAlertesActives: alertes.length,
      totalPredictionsCritiques: 0,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/dashboard/mesures-recentes") {
    return send(res, 200, measures);
  }

  if (req.method === "GET" && (url.pathname === "/api/mesures" || url.pathname === "/api/mesures/recentes")) {
    return send(res, 200, measures);
  }

  if (req.method === "GET" && url.pathname === "/api/alertes") {
    return send(res, 200, alertes);
  }

  if (req.method === "GET" && url.pathname === "/api/anomalies") {
    return send(res, 200, anomalies);
  }

  if (req.method === "GET" && url.pathname === "/api/predictions") {
    return send(res, 200, predictions);
  }

  if (req.method === "GET" && url.pathname === "/api/ia/diagnostic/derniere-mesure") {
    return send(res, 200, diagnosticFromPayload(latestMeasure));
  }

  if (req.method === "POST" && url.pathname === "/api/ia/predict") {
    return send(res, 200, diagnosticFromPayload(await readJson(req)));
  }

  return send(res, 404, { error: "Not found", path: url.pathname });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Mock API listening on http://127.0.0.1:${PORT}`);
});
