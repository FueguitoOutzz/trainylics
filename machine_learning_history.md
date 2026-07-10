# Evolución de la Arquitectura de Machine Learning en Trainylics

Este documento detalla la transición del sistema de Machine Learning (ML) en **Trainylics**, comparando el flujo antiguo basado en hojas de cálculo con el sistema automatizado actual integrado en la base de datos y APIs externas.

---

## 1. La Era del Excel (Funcionamiento Anterior)

En las fases iniciales del proyecto, el entrenamiento de la IA y el cálculo de prognosis se realizaban de manera local y manual.

```
+--------------------+      +--------------------+      +--------------------+
|  Extracción de     | ---> | Hoja de Cálculo    | ---> | Script Local       |
|  Datos (Sofascore) |      | (Excel / CSV)      |      | (Jupyter Notebook) |
+--------------------+      +--------------------+      +--------------------+
                                                                   |
                                                                   v
                                                        +--------------------+
                                                        | Exportación manual |
                                                        | de archivo (.pkl)  |
                                                        +--------------------+
```

### Flujo de Trabajo:
1. **Recolección Manual:** El analista/scouter recopilaba las estadísticas de los partidos terminados (tiros, posesión, xG, córners) descargando reportes o ejecutando scripts independientes para guardar la información en archivos de Excel (`.xlsx` o `.csv`).
2. **Carga y Limpieza:** Se utilizaba la librería `pandas` (`pd.read_excel()`) dentro de un Jupyter Notebook local para cargar los datos. 
3. **Mapeo Tipográfico:** Era necesario corregir manualmente las inconsistencias ortográficas de los nombres de los equipos (por ejemplo, homologar "U. de Chile", "Universidad de Chile" y "U de Chile").
4. **Entrenamiento y Despliegue Estático:** El modelo (`RandomForestClassifier`) se entrenaba en la computadora del analista y se exportaba como un archivo serializado (usando `pickle` o `joblib`). La plataforma web cargaba este archivo estático para hacer inferencias limitadas.

### Limitaciones:
* **Falta de Escalabilidad:** Agregar nuevos partidos requería repetir todo el proceso de descarga, limpieza y re-entrenado manual.
* **Desconexión con la Base de Datos:** El modelo de predicción no estaba al tanto de los cambios en tiempo real en los planteles o calendarios.
* **Propensión a Errores:** Cualquier celda vacía o formato de texto incorrecto en el Excel rompía el pipeline de entrenamiento.

---

## 2. La Era de la API y Base de Datos Integrada (Funcionamiento Actual)

Actualmente, Trainylics cuenta con un ecosistema completamente integrado y dinámico.

```
+--------------------+      +--------------------+      +--------------------+
| API de Sofascore   | ---> | Base de Datos      | ---> | Servicio de ML     |
| (Scraper Backend)  |      | PostgreSQL         |      | (ml_service.py)    |
+--------------------+      +--------------------+      +--------------------+
          ^                           ^                            |
          |                           | (Consulta SQL)             v
    (Cada 12 horas)                   |                     +--------------------+
          |                           +-------------------- | Predicción En Vivo |
          |                                                 | (Resultados e IA)  |
    [ Tarea de Fondo ]                                      +--------------------+
```

### Arquitectura Actual:
1. **Sincronización Automatizada (`sofascore.py`):** Un script en segundo plano se ejecuta automáticamente cada **12 horas** (o mediante disparo manual desde el panel de control) conectándose directamente a la API de Sofascore. Este obtiene los eventos de las jornadas de manera programática en formato JSON.
2. **Persistencia Relacional:** Los datos se parsean y se insertan directamente en la tabla `match` de PostgreSQL. Cada partido queda formalmente asociado a sus respectivos clubes (`home_team_id`, `away_team_id`) y a la liga correspondiente (`league_id`) con claves foráneas. Esto elimina cualquier error tipográfico.
3. **Entrenamiento en Tiempo Real (`/predict/train`):**
   * El endpoint de FastAPI realiza una consulta SQL simple (`SELECT * FROM match WHERE ...`) para extraer el historial completo.
   * Transforma estos datos en un DataFrame de `pandas` al vuelo.
   * Entrena el predictor (`ChileanLeaguePredictor`) basado en un clasificador de bosque aleatorio (`RandomForestClassifier`) con 100 estimadores.
4. **Inferencia Interactiva:** El frontend consulta el endpoint `/predict/` pasando las estadísticas en JSON, y el servidor retorna al instante el pronóstico (Local, Empate o Visita) con su respectiva probabilidad de confianza, desplegándose en la **Pizarra Táctica** y en el dashboard de **Resultados e IA**.

### Variables Utilizadas por la IA para Predecir:
El modelo actual se entrena utilizando las siguientes características de rendimiento por encuentro:
* **xG (Expected Goals):** Probabilidad de gol basada en la calidad de los tiros (`xg_home`, `xg_away`).
* **Posesión:** Porcentaje del control del balón (`possession_home`, `possession_away`).
* **Tiros Totales:** Cantidad total de remates intentados (`shots_home`, `shots_away`).
* **Tiros a Puerta:** Remates con dirección al arco (`shots_on_target_home`, `shots_on_target_away`).
* **Córneres:** Tiros de esquina cobrados (`corners_home`, `corners_away`).

---

## 3. Comparativa de Flujos

| Característica | Época del Excel (Antes) | Época de la API y DB (Ahora) |
| :--- | :--- | :--- |
| **Origen del Dato** | Archivos manuales `.xlsx` / `.csv` | API Sofascore (JSON en tiempo real) |
| **Consistencia** | Manual y propensa a desalineación | Relacional (llaves foráneas en Postgres) |
| **Entrenamiento** | Local en Jupyter Notebook | Automatizado vía endpoint `/predict/train` |
| **Actualización** | Lenta (semanal o mensual) | Cada 12 horas (programado) o instantánea |
| **Interactividad** | Inexistente (datos estáticos) | Dinámica en la interfaz de usuario |
