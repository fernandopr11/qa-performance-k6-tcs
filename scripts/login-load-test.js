import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.4/index.js';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';

const BASE_URL = 'https://fakestoreapi.com/auth/login';

const credentials = new SharedArray('credentials', function () {
  return papaparse.parse(open('../data/credentials.csv'), { header: true, skipEmptyLines: true }).data;
});

export const options = {
  scenarios: {
    login_load: {
      executor: 'constant-arrival-rate',
      rate: 25, // requests per timeUnit, por encima del mínimo de 20 TPS exigido
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 50,
      maxVUs: 150,
    },
  },
  thresholds: {
    // Tasa de error aceptable: menor al 3% del total de peticiones
    http_req_failed: ['rate<0.03'],
    // Tiempo de respuesta permitido: máximo 1.5s (SLA en el p95 para no penalizar por outliers puntuales de red)
    http_req_duration: ['p(95)<1500'],
    checks: ['rate>0.97'],
  },
};

export default function () {
  const credential = credentials[Math.floor(Math.random() * credentials.length)];

  const payload = JSON.stringify({
    username: credential.user,
    password: credential.passwd,
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '60s',
  };

  const res = http.post(BASE_URL, payload, params);

  check(res, {
    'status es 200 o 201': (r) => r.status === 200 || r.status === 201,
    'tiempo de respuesta < 1.5s': (r) => r.timings.duration < 1500,
    'respuesta contiene token': (r) => {
      try {
        return JSON.parse(r.body).token !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  sleep(0.1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
    'results/summary.json': JSON.stringify(data, null, 2),
    'results/summary.html': htmlReport(data),
  };
}
