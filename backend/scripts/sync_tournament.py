import asyncio
import os
import sys
import argparse

# Add src to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../src')))

from sqlalchemy import select
from app.config import db
from app.model.league import League
from app.model.team import Team
from app.model.player import Player
from app.model.match import Match
from app.model.note import Note
from app.model.user import User
from app.service.sofascore import SofascoreService

async def main():
    parser = argparse.ArgumentParser(description="Sincroniza todos los partidos de un torneo completo desde Sofascore.")
    parser.add_argument("--tournament", type=int, required=True, help="ID de Unique Tournament de Sofascore (ej. 11653)")
    parser.add_argument("--season", type=int, required=True, help="ID de Season de Sofascore (ej. 88493)")
    parser.add_argument("--league", type=str, required=True, help="Nombre de la liga en la base de datos (ej. 'Liga de Primera')")
    parser.add_argument("--rounds", type=int, default=30, help="Número de jornadas/rondas a sincronizar (default: 30)")
    parser.add_argument("--delay", type=float, default=1.0, help="Espera en segundos entre rondas para evitar bloqueos (default: 1.0)")
    
    args = parser.parse_args()
    
    print(f"Iniciando sincronización completa del torneo:")
    print(f"- Tournament ID: {args.tournament}")
    print(f"- Season ID: {args.season}")
    print(f"- Liga local: '{args.league}'")
    print(f"- Jornadas a sincronizar: 1 a {args.rounds}")
    print(f"- Retardo por ronda: {args.delay}s")
    
    db.init()
    
    async with db.session as session:
        # Find or create League
        res = await session.execute(select(League).where(League.name == args.league))
        league = res.scalars().first()
        if not league:
            print(f"La liga '{args.league}' no existe. Creándola en la base de datos...")
            # We assume season string can be parsed or defaulted to current year
            league = League(name=args.league, season="2026")
            session.add(league)
            await session.commit()
            await session.refresh(league)
            print(f"Liga creada con ID: {league.id}")
        else:
            print(f"Liga encontrada: {league.name} (ID: {league.id})")
            
        league_id = league.id
        
    total_created = 0
    total_updated = 0
    total_errors = 0
    
    for round_num in range(1, args.rounds + 1):
        print(f"\n>>> Sincronizando Jornada {round_num}/{args.rounds}...")
        try:
            results = await SofascoreService.sync_round(
                tournament_id=args.tournament,
                season_id=args.season,
                round_num=round_num,
                league_id=league_id
            )
            
            created = sum(1 for r in results if r.get("status") == "created")
            updated = sum(1 for r in results if r.get("status") == "updated")
            total_created += created
            total_updated += updated
            
            print(f"Jornada {round_num} completada: {len(results)} partidos sincronizados ({created} creados, {updated} actualizados).")
        except Exception as e:
            total_errors += 1
            print(f"ERROR en Jornada {round_num}: {e}")
            
        if round_num < args.rounds:
            await asyncio.sleep(args.delay)
            
    print("\n==================================================")
    print("RESUMEN DE LA SINCRONIZACIÓN")
    print(f"- Torneo: {args.league}")
    print(f"- Partidos creados: {total_created}")
    print(f"- Partidos actualizados/verificados: {total_updated}")
    print(f"- Jornadas con errores: {total_errors}")
    print("==================================================")

if __name__ == "__main__":
    asyncio.run(main())
