import json
import traceback
from openai import AsyncOpenAI
from app.config import OPENAI_API_KEY, GEMINI_API_KEY

# Inicializar cliente asíncrono compatible con OpenAI o Gemini
client = None
active_model = "gpt-4o-mini"
if GEMINI_API_KEY and len(GEMINI_API_KEY) > 10:
    client = AsyncOpenAI(
        api_key=GEMINI_API_KEY,
        base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
    )
    active_model = "gemini-1.5-flash"
elif OPENAI_API_KEY and OPENAI_API_KEY != "tu_api_key_aqui":
    client = AsyncOpenAI(api_key=OPENAI_API_KEY)

async def get_tactical_advice(our_stats: dict, opponent_stats: dict) -> dict:
    """
    Usa el modelo de IA para generar formación recomendada y consejos tácticos
    basado en las estadísticas de los últimos 5 partidos.
    """
    if not client:
        print("API_KEY no configurada. Retornando consejos por defecto (Fallback).")
        return _get_fallback_advice(our_stats, opponent_stats)

    prompt = f"""
    Eres un asistente técnico de fútbol de élite. Analiza las siguientes estadísticas promedio de los últimos 5 partidos:
    
    MI EQUIPO:
    - Posesión: {our_stats.get('possession', 50)}%
    - Goles Anotados: {our_stats.get('goals_scored', 1.0)}
    - Goles Concedidos: {our_stats.get('goals_conceded', 1.0)}
    - xG (Goles Esperados): {our_stats.get('xg', 1.0)}
    - Tiros al Arco: {our_stats.get('shots_on_target', 4)}
    - Córners: {our_stats.get('corners', 5)}

    RIVAL:
    - Posesión: {opponent_stats.get('possession', 50)}%
    - Goles Anotados: {opponent_stats.get('goals_scored', 1.0)}
    - Goles Concedidos: {opponent_stats.get('goals_conceded', 1.0)}
    - xG (Goles Esperados): {opponent_stats.get('xg', 1.0)}
    - Tiros al Arco: {opponent_stats.get('shots_on_target', 4)}
    - Córners: {opponent_stats.get('corners', 5)}

    Tu objetivo es sugerir:
    1. Una "Formación Recomendada" (ej. "4-3-3 Ofensivo") con una justificación táctica de máximo 2 oraciones.
    2. Una lista de 3 "Consejos Tácticos" específicos para enfrentar a este rival (máximo 2 oraciones cada uno).
    """

    try:
        response = await client.chat.completions.create(
            model=active_model,
            response_format={ "type": "json_object" } if active_model == "gpt-4o-mini" else None,
            messages=[
                {
                    "role": "system",
                    "content": "Eres un asistente técnico de fútbol experto. Siempre respondes EXCLUSIVAMENTE en JSON puro sin bloques de código con la siguiente estructura exacta: {\"recommended_formation\": {\"name\": \"...\", \"justification\": \"...\"}, \"tactical_tips\": [\"...\", \"...\", \"...\"]}."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            temperature=0.7,
            max_tokens=500
        )
        
        content = response.choices[0].message.content
        if content.startswith("```json"):
            content = content.replace("```json", "").replace("```", "").strip()
        elif content.startswith("```"):
            content = content.replace("```", "").strip()
            
        result = json.loads(content)
        
        # Validar estructura
        if not result.get("tactical_tips") or not result.get("recommended_formation"):
            print("El LLM no retornó la estructura correcta, usando fallback.")
            return _get_fallback_advice(our_stats, opponent_stats)
            
        result["source"] = "IA Generativa"
        return result
        
    except Exception as e:
        print(f"Error llamando a LLM: {e}")
        traceback.print_exc()
        return _get_fallback_advice(our_stats, opponent_stats)

def _get_fallback_advice(our_stats, opponent_stats):
    """Retorna los consejos basados en reglas si falla la IA."""
    our_stats = our_stats or {}
    opponent_stats = opponent_stats or {}

    recommended_formation = {
        "name": "4-3-3 Ofensivo",
        "justification": "Sugerimos un 4-3-3 para presionar alto y aprovechar el control de juego en ataque."
    }

    our_pos = our_stats.get("possession") if isinstance(our_stats, dict) else 50
    opp_pos = opponent_stats.get("possession") if isinstance(opponent_stats, dict) else 50
    opp_xg = opponent_stats.get("xg") if isinstance(opponent_stats, dict) else 1.0
    opp_goals = opponent_stats.get("goals_scored") if isinstance(opponent_stats, dict) else 1.0
    opp_corners = opponent_stats.get("corners") if isinstance(opponent_stats, dict) else 5.0
    opp_conceded = opponent_stats.get("goals_conceded") if isinstance(opponent_stats, dict) else 1.0

    if (our_pos or 50) > 54.0:
        recommended_formation = {
            "name": "4-3-3 Ofensivo",
            "justification": "Sugerimos un 4-3-3 para presionar alto y aprovechar tu gran control de balón."
        }
    elif (opp_xg or 1.0) > 1.6 or (opp_goals or 1.0) > 1.6:
        recommended_formation = {
            "name": "4-4-2 Compacto",
            "justification": "Recomendamos doble línea de cuatro para neutralizar el gran poder ofensivo rival."
        }
    else:
        recommended_formation = {
            "name": "4-2-3-1 Equilibrado",
            "justification": "Formación equilibrada con doble pivote para cortar el juego y salir rápido."
        }

    tips = []
    if (opp_pos or 50) > 54.0:
        tips.append("El rival domina la posesión. Entrenar transiciones rápidas para aprovechar robos.")
    else:
        tips.append("El rival no retiene mucho el balón. Toma la iniciativa y propone juego posicional.")
        
    if (opp_corners or 5.0) > 5.5:
        tips.append("Peligro en balón parado. Reforzar marcas individuales por sus altos promedios de córner.")
    else:
        tips.append("Pocos córners del rival. Centran poco o sufren por las bandas.")

    if (opp_conceded or 1.0) > 1.4:
        tips.append("Defensa rival frágil. Presionar su salida puede provocar errores.")
    else:
        tips.append("Defensa sólida. Mueve el balón de lado a lado para encontrar espacios.")

    return {
        "recommended_formation": recommended_formation,
        "tactical_tips": tips,
        "source": "Análisis Estadístico Local"
    }
