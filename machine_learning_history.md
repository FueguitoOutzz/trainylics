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

---

## 4. Visualización de Métricas de Precisión e Importancia de Variables (Feature Importance)

Para dar mayor rigurosidad académica y soporte empírico en la tesis, se implementó un panel visual completo de rendimiento del modelo de Machine Learning dentro de la interfaz de **Resultados e IA**.

```
+-------------------------------------------------------------------+
|                   MÉTRICAS DEL PREDICTOR IA                       |
|                                                                   |
|  [ Variables Clave ]               [ Precisión por Clase ]        |
|  - xG Local: 11.2%  [====      ]    - Local (0):   65% F1-Score   |
|  - xG Visita: 10.9% [====      ]    - Empate (1):  16% F1-Score   |
|  - Córners: 10.4%   [===       ]    - Visita (2):  34% F1-Score   |
+-------------------------------------------------------------------+
```

### Detalles de la Implementación:
1. **Validación Cruzada Integrada:** Durante el entrenamiento (`predictor.train()`), los datos se dividen (80% entrenamiento / 20% pruebas) con estratificación de clases. Se calcula el reporte de clasificación completo (`classification_report` de Scikit-Learn).
2. **Exposición en la API (`/predict/stats`):** El backend retorna:
   * `played_count`: El total de partidos reales en base de datos sobre los cuales se entrena el bosque aleatorio.
   * `feature_importances`: El peso matemático asignado a cada una de las 10 estadísticas de entrada (`self.model.feature_importances_`).
   * `metrics`: El reporte de métricas detallado por clase (Local, Empate, Visita), incluyendo el F1-Score.
3. **Entrenamiento en Startup:** Se configuró una rutina en el inicio del backend (`main.py`) que pre-entrena el modelo al arrancar el servidor FastAPI. Esto garantiza que las métricas visuales del dashboard se muestren de forma inmediata y actualizada al usuario desde el primer segundo.
4. **Widget del Frontend (`Home.tsx`):** Un panel lateral renderiza barras de porcentaje dinámicas de la importancia de cada característica física/técnica del partido y desglosa la precisión (F1-score) por tipo de resultado. Esto permite al usuario y scouter entender *qué estadísticas influyen más* para que el modelo IA asigne una probabilidad de victoria.

---

## 5. El Asistente Táctico: IA Predictiva vs. Sistema Basado en Reglas

Es importante distinguir entre la predicción del resultado del partido (que sí utiliza Machine Learning) y los **Consejos del Asistente IA / Formación Recomendada**, los cuales funcionan mediante un sistema de reglas (Rule-based System).

* **Modelo ML (Random Forest):** Se usa de manera exclusiva para predecir si el partido terminará en Local, Empate o Visita, calculando una probabilidad matemática de confianza en base a 10 métricas.
* **Motor de Consejos y Formación:** Analiza los promedios de los últimos 5 partidos del equipo y del rival, y mediante un conjunto de umbrales estáticos y condicionales lógicos (`if/else`), determina sugerencias de forma determinista.

**Ejemplo de Reglas de Formación:**
* Si el equipo posee más del 54% de posesión promedio -> Sugiere **4-3-3 Ofensivo** para someter al rival.
* Si el rival tiene un xG o promedio de goles mayor a 1.6 -> Sugiere **4-4-2 Compacto** para defender y salir rápido.
* Si no se cumple lo anterior -> Sugiere **4-2-3-1 Equilibrado**.

**Ejemplo de Reglas Tácticas:**
* Se comparan métricas como córners en contra, goles concedidos, y posesión del oponente con umbrales fijos (ej. > 5.5 córners) para sugerir cuidar el juego aéreo o la salida de balón. 

Este enfoque mixto permite ofrecer tanto probabilidades estadísticas de Machine Learning (para el resultado) como *insights* tácticos inmediatos, legibles y directamente aplicables (mediante el sistema basado en reglas).

---

## 6. Documentación Técnica de los Modelos de Machine Learning

Trainylics entrena y compara en paralelo dos algoritmos supervisados de clasificación multiclasificación para pronosticar los resultados (Victoria Local, Empate, Victoria Visitante):

### A. Random Forest Classifier (Bosque Aleatorio)
* **Tipo**: Algoritmo de ensamble basado en árboles de decisión (Bagging).
* **Parámetros y Configuración**:
  * `n_estimators=100`: Entrena 100 árboles de decisión independientes para promediar la varianza y reducir el sobreajuste (overfitting).
  * `random_state=42`: Asegura la reproducibilidad de los resultados y divisiones del conjunto de entrenamiento.
* **Lógica Operativa**: Cada árbol de decisión realiza divisiones basándose en un subconjunto aleatorio de características (features). El resultado final se obtiene por votación mayoritaria del ensamble.
* **Ventajas**:
  * **Explicabilidad**: Permite calcular la importancia de las características (`feature_importances_`), identificando qué estadísticas físicas/tácticas son más críticas.
  * **Estabilidad**: Es altamente robusto frente a ruido y valores atípicos (outliers) en las estadísticas de los partidos.

### B. Multi-Layer Perceptron Classifier (Red Neuronal / NN)
* **Tipo**: Red Neuronal Artificial de tipo Feedforward entrenada con Backpropagation.
* **Parámetros y Configuración**:
  * `hidden_layer_sizes=(64, 32)`: Consta de una capa de entrada de 10 características, una primera capa oculta con **64 neuronas**, una segunda capa oculta con **32 neuronas** y una capa de salida con **3 neuronas** (Local, Empate, Visita).
  * `max_iter=500`: Límite máximo de 500 épocas de entrenamiento para asegurar la convergencia del optimizador.
  * `random_state=42`: Controla la inicialización de los pesos y bias de la red para reproducibilidad.
* **Lógica Operativa**: Las entradas fluyen hacia adelante a través de las funciones de activación no lineales (ReLU). El error se calcula mediante la función de pérdida de entropía cruzada y se propaga hacia atrás (Backpropagation) para actualizar los pesos de las neuronas usando el optimizador Adam.
* **Ventajas**:
  * **Modelado Complejo**: Capaz de modelar relaciones matemáticas altamente complejas y no lineales entre combinaciones de tiros, posesión y xG que un árbol individual o lineal podría ignorar.

---

## 7. Comparativa de Rendimiento Real (Métricas de Base de Datos)

A continuación se detalla la comparativa real obtenida tras entrenar los modelos sobre un dataset de **3,989 partidos oficiales** en la base de datos y validando sobre un conjunto de prueba estratificado de **798 partidos**:

### Resumen General de Precisión (Accuracy)

| Modelo | Precisión General (Accuracy) | Muestras de Entrenamiento | Muestras de Validación |
| :--- | :---: | :---: | :---: |
| **Random Forest (RF)** | **54.6%** | 3,191 partidos | 798 partidos |
| **Red Neuronal (NN)** | **54.4%** | 3,191 partidos | 798 partidos |

*Nota: Ambos modelos muestran una precisión sumamente pareja en la Liga Chilena, con una leve ventaja del 0.2% a favor de Random Forest en la general.*

### Desglose por Clase (Local, Empate, Visita)

Las métricas detalladas de precisión (precision), sensibilidad (recall) y puntuación F1 (F1-score) por cada clase revelan el comportamiento específico de cada modelo:

#### 1. Random Forest (RF)
* **Local (0)**: Precisión = 53.3% | Recall = 92.4% | **F1-Score = 67.6%**
* **Empate (1)**: Precisión = 47.6% | Recall = 10.9% | **F1-Score = 17.8%**
* **Visita (2)**: Precisión = 64.9% | Recall = 30.2% | **F1-Score = 41.2%**

#### 2. Red Neuronal (NN)
* **Local (0)**: Precisión = 52.8% | Recall = 94.9% | **F1-Score = 67.8%**
* **Empate (1)**: Precisión = 44.4% | Recall = 4.4% | **F1-Score = 8.0%**
* **Visita (2)**: Precisión = 65.2% | Recall = 30.6% | **F1-Score = 41.7%**

### Análisis de Resultados
1. **Predicción del Empate (Clase 1)**: Es la clase más compleja de clasificar para ambos modelos debido a su baja frecuencia relativa y a que sus características estadísticas se solapan con victorias ajustadas. La **Red Neuronal tiene un rendimiento más bajo en empates** (F1 de 8.0% contra 17.8% de RF), tendiendo a sesgarse más hacia victorias locales o visitantes claras.
2. **Predicción de Victoria Local (Clase 0)**: Ambos modelos son excelentes identificando victorias locales (Recall superior al 92%), capturando la gran ventaja de localía imperante en la liga de fútbol chilena.
3. **Predicción de Victoria Visitante (Clase 2)**: Ambos modelos logran una alta precisión al pronosticar victorias visitantes (aprox. 65%), lo que significa que cuando predicen que el visitante ganará, el nivel de acierto es muy alto.

