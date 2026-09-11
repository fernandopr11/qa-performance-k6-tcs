PRUEBA DE CARGA - SERVICIO DE LOGIN (FakeStoreAPI)
Reto Tecnico QA Automatizador - TCS Ecuador
====================================================

1. TECNOLOGIAS Y VERSIONES USADAS
----------------------------------
- Docker: 28.1.1
- Imagen de k6: grafana/k6:latest (k6 v2.2.0, commit 00a9a1b7f5)
- Librerias k6 (cargadas via jslib.k6.io en tiempo de ejecucion):
  - papaparse 5.1.1 (parseo de CSV)
  - k6-summary 0.0.4 (resumen de consola)
  - k6-reporter (benc-uk/k6-reporter, rama main) para el reporte HTML

No se requiere instalar Node.js, k6 ni ninguna dependencia local: todo
corre dentro del contenedor oficial de k6.

2. ESTRUCTURA DEL PROYECTO
----------------------------------
qa-performance-k6-tcs/
  scripts/
    login-load-test.js   -> script de prueba de carga
  data/
    credentials.csv       -> credenciales de prueba parametrizadas
  results/
    console-output.txt    -> salida de consola de la ultima ejecucion
    summary.json           -> resumen de metricas en JSON
    summary.html           -> reporte HTML navegable (abrir en el navegador)
  readme.txt               -> este archivo
  conclusiones.txt         -> hallazgos y conclusiones del ejercicio

3. COMO EJECUTAR LA PRUEBA (PASO A PASO)
----------------------------------
Requisito: tener Docker instalado y el daemon corriendo.

Desde la raiz del repositorio (qa-performance-k6-tcs/), ejecutar:

  mkdir -p results
  docker run --rm -i -w /scripts \
    -v "$(pwd)/scripts:/scripts" \
    -v "$(pwd)/data:/data" \
    -v "$(pwd)/results:/scripts/results" \
    grafana/k6:latest run login-load-test.js

Al finalizar (dura ~2 minutos), se generan en results/:
  - summary.json  (metricas crudas)
  - summary.html  (reporte visual, abrir con doble clic / navegador)

Tambien se puede redirigir la salida de consola a un archivo:

  docker run ... grafana/k6:latest run login-load-test.js > results/console-output.txt 2>&1

4. QUE HACE EL SCRIPT
----------------------------------
- Envia peticiones POST a https://fakestoreapi.com/auth/login
- Los pares usuario/password se leen desde data/credentials.csv y se
  eligen de forma aleatoria en cada iteracion.
- Escenario: constant-arrival-rate, 25 peticiones/segundo durante 2
  minutos (por encima del minimo de 20 TPS exigido, para tener margen).
- Validaciones (checks) por peticion:
  - status HTTP 200 o 201
  - tiempo de respuesta menor a 1.5 segundos
  - la respuesta contiene un token
- Umbrales (thresholds) que determinan si la prueba pasa o falla:
  - http_req_failed: rate < 3%
  - http_req_duration: p(95) < 1500 ms
  - checks: rate > 97%

5. RESULTADOS DE LA ULTIMA EJECUCION (referencia)
----------------------------------
- Throughput alcanzado: ~24.92 req/s (por encima de los 20 TPS exigidos)
- Tasa de error: 0.00%
- p(95) tiempo de respuesta: 413 ms (umbral: 1500 ms)
- Tiempo de respuesta maximo observado: 675 ms
- Checks: 100% exitosos (3000/3000 iteraciones)
- Resultado: PASA todos los umbrales definidos.

Ver detalle completo en results/summary.html y conclusiones.txt.
