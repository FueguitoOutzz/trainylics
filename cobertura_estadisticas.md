# Cobertura de Estadísticas por Liga y Temporada

Este documento resume qué tipo de datos y estadísticas están disponibles para cada liga y temporada dentro de la base de datos de Trainylics, según la información proporcionada por Sofascore.

| Liga | Temporada | Cobertura de Estadísticas | Datos Disponibles |
| :--- | :---: | :--- | :--- |
| **Liga de Primera** | 2023 - 2026 | **Estadísticas Avanzadas Completas** | Posesión, Tiros Totales, Tiros a Puerta, Córneres y xG (Goles Esperados) |
| **Liga de Primera** | 2022 | **Estadísticas Avanzadas Parciales** | Posesión, Tiros Totales, Tiros a Puerta y Córneres (Sin xG) |
| **Liga de Ascenso** | 2024 - 2026 | **Estadísticas Avanzadas Completas** | Posesión, Tiros Totales, Tiros a Puerta, Córneres y xG (Goles Esperados) |
| **Liga de Ascenso** | 2022 - 2023 | **Solo Resultados** | Únicamente goles y marcador final (Sin posesión, tiros ni córneres) |
| **Liga de Segunda** | 2026 | **Estadísticas Avanzadas Parciales** | Posesión, Tiros a Puerta y Córneres (Sin xG ni Tiros Totales en el 68% de los partidos) |
| **Liga de Segunda** | 2024 - 2025 | **Solo Resultados** | Únicamente goles y marcador final (Sin posesión, tiros ni córneres) |
| **Tercera División A** | 2025 | **Estadísticas Avanzadas Parciales** | Posesión, Tiros a Puerta y Córneres (Sin xG ni Tiros Totales en el 30% de los partidos) |
| **Tercera División A** | 2024, 2026 | **Solo Resultados** | Únicamente goles y marcador final (Sin posesión, tiros ni córneres) |
| **Tercera División B** | 2024 - 2026 | **Solo Resultados** | Únicamente goles y marcador final (Sin posesión, tiros ni córneres) |

---

## Tipos de Cobertura de Datos

### 1. Estadísticas Avanzadas Completas
* **Descripción:** Los partidos contienen el desglose completo del juego.
* **Métricas incluidas:** Porcentaje de posesión, tiros totales, tiros a puerta, tiros de esquina y la métrica de goles esperados (xG).
* **Uso en Machine Learning:** Aporta la máxima precisión para el análisis y entrenamiento de modelos predictivos de rendimiento de equipos.

### 2. Estadísticas Avanzadas Parciales
* **Descripción:** Partidos donde Sofascore registra eventos clave en vivo, pero no recopila datos de eventos de posicionamiento avanzado (como xG) o volumen total de tiros.
* **Métricas incluidas:** Posesión del balón, tiros a puerta y tiros de esquina.
* **Ajuste Automático:** Si los tiros totales están ausentes (nulos) pero existen tiros a puerta, el sistema de Trainylics asume automáticamente que los tiros totales son al menos iguales a los tiros a puerta para evitar inconsistencias matemáticas (como mostrar 0 tiros totales y 3.5 a puerta).

### 3. Solo Resultados
* **Descripción:** Ligas o temporadas donde no existe cobertura en vivo en Sofascore, registrándose únicamente los goles de cada equipo para determinar el resultado final (Victoria, Empate, Derrota).
* **Métricas incluidas:** Goles a favor y en contra.
* **Uso en Machine Learning:** Permite entrenar al modelo en base al historial de resultados directos, pero no contribuye al análisis detallado de rendimiento técnico.
