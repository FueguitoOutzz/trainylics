# Sistema de Diseño: Colores y Tipografía - Trainylics

Este documento sirve como la guía de estilos oficial para el proyecto **Trainylics**, detallando la tipografía utilizada, la paleta de colores basada en el espacio de color perceptualmente uniforme **OKLCH**, y las variables de gráficos y sidebar empleadas en la interfaz.

---

## 1. Tipografía

La tipografía del proyecto está unificada para lograr una lectura limpia y moderna, ideal para análisis de datos y scouting deportivo:

* **Fuente Principal:** **`Inter`**
  - Importada de Google Fonts con grosores de `100` a `900`.
  - Enlace de importación: `https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap`
* **Fuente de Respaldo:** `sans-serif`
* **Fuente Monoespaciada:** `monospace` (utilizada para identificadores, logs y métricas numéricas).
* **Propiedades CSS globales:**
  - `antialiased` (Suavizado de fuente activo en Webkit y Firefox).
  - `font-feature-settings: "rlig" 1, "calt" 1` (Ligaduras y alternativas contextuales de caracteres legibles).

---

## 2. Paleta de Colores (Espacio OKLCH)

Los colores de Trainylics están definidos dinámicamente mediante variables CSS con soporte nativo para **Modo Claro (Light Mode)** y **Modo Oscuro (Dark Mode)**. 

### 🎨 Colores Base e Interfaz

| Componente | Variable CSS | Modo Claro (Light Mode) | Modo Oscuro (Dark Mode) | Notas / Uso |
| :--- | :--- | :--- | :--- | :--- |
| **Fondo Principal** | `--background` | `oklch(0.98 0 0)` | `oklch(0.12 0.01 270)` | Gris ultra claro vs. Gris carbón oscuro |
| **Texto General** | `--foreground` | `oklch(0.12 0 0)` | `oklch(0.98 0 0)` | Gris casi negro vs. Blanco roto legible |
| **Color Primario** | `--primary` | `oklch(0.45 0.18 265)` | `oklch(0.58 0.2 265)` | **Índigo / Violeta profundo** (botones y acentos) |
| **Texto sobre Primario** | `--primary-foreground` | `oklch(0.98 0 0)` | `oklch(0.98 0 0)` | Texto blanco de alto contraste |
| **Tarjetas** | `--card` | `oklch(1 0 0)` | `oklch(0.16 0.01 270)` | Blanco puro vs. Gris oscuro intermedio |
| **Bordes e Inputs** | `--border` / `--input` | `oklch(0.88 0.005 270)` | `oklch(0.24 0.02 270)` | Líneas de división sutiles |
| **Éxito (Success)** | `--success` | `oklch(0.58 0.16 155)` | `oklch(0.58 0.16 155)` | **Verde esmeralda** (ganadores, aciertos) |
| **Peligro (Destructive)**| `--destructive` | `oklch(0.55 0.22 25)` | `oklch(0.55 0.22 25)` | **Rojo coral** (errores, alertas, eliminar) |

---

## 3. Paleta de Gráficos (`--chart-*`)

Utilizados en los módulos de analíticas, estadísticas de partidos y comparaciones de xG:

* **Chart 1 (Principal):** `oklch(0.45 0.18 265)` *(Índigo)* en claro / `oklch(0.58 0.2 265)` en oscuro.
* **Chart 2 (xG Rival / Pérdida):** `oklch(0.55 0.22 25)` *(Rojo coral)*.
* **Chart 3 (xG Propio / Ganancia):** `oklch(0.58 0.16 155)` *(Verde esmeralda)*.
* **Chart 4 (Puntos intermedios):** `oklch(0.68 0.18 65)` *(Ocre / Dorado)*.
* **Chart 5 (Variables secundarias):** `oklch(0.62 0.2 320)` *(Rosa / Fucsia)*.

---

## 4. Estilos del Panel Lateral (`--sidebar-*`)

Específicos para el componente unificado de navegación `Layout`:

| Variable CSS | Modo Claro (Light Mode) | Modo Oscuro (Dark Mode) |
| :--- | :--- | :--- |
| `--sidebar` (Fondo del menú) | `oklch(0.985 0 0)` | `oklch(0.205 0 0)` |
| `--sidebar-foreground` (Texto del menú) | `oklch(0.145 0 0)` | `oklch(0.985 0 0)` |
| `--sidebar-accent` (Item seleccionado/hover) | `oklch(0.97 0 0)` | `oklch(0.269 0 0)` |
| `--sidebar-border` (Borde divisor) | `oklch(0.922 0 0)` | `oklch(0.269 0 0)` |
