import React, { useState, useEffect, useRef } from "react"
import { Trophy, Shield, RefreshCw, Plus, Trash2, Save, Users, Sparkles, Check, ChevronsUpDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import api from '../services/api'
import { cn } from "@/lib/utils"

interface Player {
  id: string
  name: string
  position: string | null
}

interface Team {
  id: string
  name: string
  sofascore_id: number | null
  league_id?: string | null
}

interface TacticNode {
  id: string          // unique node ID (e.g. "node1", "node2")
  role: string        // role name, e.g. "GK", "LD", "CD"
  x: number           // percentage 0 to 100
  y: number           // percentage 0 to 100
  playerId: string | null // assigned player ID
  playerName: string | null // assigned player name
}

interface SavedTactic {
  id: string
  title: string
  description: string | null
  formation: string
  positions_json: string
  team_id: string | null
  team_name: string | null
  author_name: string | null
  created_at: string
}

// Coordinate presets (X%, Y%) for basic formations
const FORMATIONS: Record<string, Array<{ role: string; x: number; y: number }>> = {
  "4-3-3": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MC_D", x: 68, y: 48 },
    { role: "MCD", x: 50, y: 54 },
    { role: "MC_I", x: 32, y: 48 },
    { role: "ED", x: 78, y: 24 },
    { role: "DC", x: 50, y: 18 },
    { role: "EI", x: 22, y: 24 }
  ],
  "4-4-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MD", x: 80, y: 46 },
    { role: "MC_D", x: 58, y: 50 },
    { role: "MC_I", x: 42, y: 50 },
    { role: "MI", x: 20, y: 46 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ],
  "3-5-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "DFC_D", x: 68, y: 72 },
    { role: "DFC", x: 50, y: 74 },
    { role: "DFC_I", x: 32, y: 72 },
    { role: "CAD", x: 85, y: 46 },
    { role: "MC_D", x: 64, y: 50 },
    { role: "MCD", x: 50, y: 56 },
    { role: "MC_I", x: 36, y: 50 },
    { role: "CAI", x: 15, y: 46 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ],
  "4-2-3-1": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 82, y: 68 },
    { role: "DFC_D", x: 60, y: 72 },
    { role: "DFC_I", x: 40, y: 72 },
    { role: "LI", x: 18, y: 68 },
    { role: "MCD_D", x: 62, y: 56 },
    { role: "MCD_I", x: 38, y: 56 },
    { role: "MCO_D", x: 74, y: 35 },
    { role: "MCO", x: 50, y: 34 },
    { role: "MCO_I", x: 26, y: 35 },
    { role: "DC", x: 50, y: 16 }
  ],
  "5-3-2": [
    { role: "POR", x: 50, y: 88 },
    { role: "LD", x: 85, y: 66 },
    { role: "DFC_D", x: 66, y: 72 },
    { role: "DFC", x: 50, y: 74 },
    { role: "DFC_I", x: 34, y: 72 },
    { role: "LI", x: 15, y: 66 },
    { role: "MC_D", x: 65, y: 48 },
    { role: "MCD", x: 50, y: 52 },
    { role: "MC_I", x: 35, y: 48 },
    { role: "DC_D", x: 62, y: 20 },
    { role: "DC_I", x: 38, y: 20 }
  ]
}

const generateCoordinatesForFormation = (formationStr: string): Array<{ role: string; x: number; y: number }> => {
  const defaultGK = { role: "POR", x: 50, y: 88 };
  if (!formationStr) return FORMATIONS["4-3-3"];
  
  const parts = formationStr.replace(/\s+/g, "").split("-");
  const numbers = parts.map(n => parseInt(n, 10)).filter(n => !isNaN(n));
  
  if (numbers.length < 2) return FORMATIONS["4-3-3"];
  
  const coords: Array<{ role: string; x: number; y: number }> = [defaultGK];
  
  const yMin = 18; // Attacker line
  const yMax = 72; // Defender line
  const L = numbers.length; // Number of horizontal lines
  
  for (let i = 0; i < L; i++) {
    const P = numbers[i]; // Number of players in this line
    if (P <= 0) continue;
    
    let y = yMax;
    if (L > 1) {
      y = yMax - (i * (yMax - yMin) / (L - 1));
    }
    
    const xMin = P === 1 ? 50 : (P === 2 ? 35 : (P === 3 ? 24 : 16));
    const xMax = P === 1 ? 50 : (P === 2 ? 65 : (P === 3 ? 76 : 84));
    
    for (let j = 0; j < P; j++) {
      let x = 50;
      if (P > 1) {
        x = xMin + (j * (xMax - xMin) / (P - 1));
      }
      
      let role = "MC";
      if (i === 0) {
        if (P === 4) {
          role = j === 0 ? "LI" : j === 1 ? "DFC_D" : j === 2 ? "DFC_I" : "LD";
        } else if (P === 3) {
          role = j === 0 ? "DFC_I" : j === 1 ? "DFC" : "DFC_D";
        } else if (P === 5) {
          role = j === 0 ? "LI" : j === 1 ? "DFC_I" : j === 2 ? "DFC" : j === 3 ? "DFC_D" : "LD";
        } else {
          role = `DF_${j + 1}`;
        }
      } else if (i === L - 1) {
        if (P === 1) {
          role = "DC";
        } else if (P === 2) {
          role = j === 0 ? "DC_I" : "DC_D";
        } else if (P === 3) {
          role = j === 0 ? "EI" : j === 1 ? "DC" : "ED";
        } else {
          role = `DEL_${j + 1}`;
        }
      } else {
        const isLastMidLine = (i === L - 2 && L > 3);
        const prefix = isLastMidLine ? "MCO" : (i === 1 && L > 3 ? "MCD" : "MC");
        if (P === 1) {
          role = prefix;
        } else if (P === 2) {
          role = `${prefix}_I`;
        } else if (P === 3) {
          role = j === 0 ? `${prefix}_I` : j === 1 ? prefix : `${prefix}_D`;
        } else if (P === 4) {
          role = j === 0 ? "MI" : j === 1 ? `${prefix}_I` : j === 2 ? `${prefix}_D` : "MD";
        } else {
          role = `${prefix}_${j + 1}`;
        }
      }
      
      coords.push({ role, x, y });
    }
  }
  
  return coords;
};

const getFormationCoordinates = (formationStr: string): Array<{ role: string; x: number; y: number }> => {
  const norm = formationStr.replace(/\s+/g, "").trim();
  if (FORMATIONS[norm]) {
    return FORMATIONS[norm];
  }
  return generateCoordinatesForFormation(norm);
};

const autoAssignLastMatchPlayers = (lastMatchPlayers: any[], currentNodes: TacticNode[]): TacticNode[] => {
  if (!lastMatchPlayers || lastMatchPlayers.length === 0) return currentNodes;
  
  const buckets: Record<string, any[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  lastMatchPlayers.forEach(p => {
    const pos = (p.position || "").toLowerCase();
    if (pos === "g" || pos === "gk" || pos.includes("por")) {
      buckets.GK.push(p);
    } else if (pos === "d" || pos.includes("def")) {
      buckets.DEF.push(p);
    } else if (pos === "m" || pos.includes("mid")) {
      buckets.MID.push(p);
    } else {
      buckets.FWD.push(p);
    }
  });

  const assignedPlayerIds = new Set<string>();

  const getNodeCategory = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("por") || r.includes("gk")) return "GK";
    if (r.includes("df") || r.includes("li") || r.includes("ld") || r.includes("cad") || r.includes("cai")) return "DEF";
    if (r.includes("dc") || r.includes("ei") || r.includes("ed") || r.includes("st") || r.includes("ext") || r.includes("punta")) return "FWD";
    return "MID";
  };

  const searchOrder: Record<string, string[]> = {
    GK: ["GK", "DEF", "MID", "FWD"],
    DEF: ["DEF", "MID", "FWD", "GK"],
    MID: ["MID", "FWD", "DEF", "GK"],
    FWD: ["FWD", "MID", "DEF", "GK"]
  };

  return currentNodes.map(node => {
    const cat = getNodeCategory(node.role);
    const order = searchOrder[cat];
    let selectedPlayer: any = null;

    for (const bKey of order) {
      const candidate = buckets[bKey].find(p => !assignedPlayerIds.has(p.id));
      if (candidate) {
        selectedPlayer = candidate;
        assignedPlayerIds.add(candidate.id);
        break;
      }
    }

    if (selectedPlayer) {
      return { ...node, playerId: selectedPlayer.id, playerName: selectedPlayer.name };
    }
    return { ...node, playerId: null, playerName: null };
  });
};

const autoAssignPlayers = (roster: Player[], currentNodes: TacticNode[]): TacticNode[] => {
  if (!roster || roster.length === 0) return currentNodes;

  const categorize = (pos: string | null) => {
    if (!pos) return "MID";
    const p = pos.toLowerCase();
    if (p.includes("por") || p.includes("gk") || p.includes("port") || p.includes("goalk") || p.includes("arquero")) return "GK";
    if (p.includes("def") || p.includes("li") || p.includes("ld") || p.includes("zagu") || p.includes("back") || p.includes("cad") || p.includes("cai") || p.includes("lat")) return "DEF";
    if (p.includes("del") || p.includes("att") || p.includes("st") || p.includes("ext") || p.includes("punta") || p.includes("dc") || p.includes("ei") || p.includes("ed") || p.includes("forw")) return "FWD";
    return "MID";
  };

  const buckets: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  roster.forEach(p => {
    buckets[categorize(p.position)].push(p);
  });

  const assignedPlayerIds = new Set<string>();

  const getNodeCategory = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("por") || r.includes("gk")) return "GK";
    if (r.includes("df") || r.includes("li") || r.includes("ld") || r.includes("cad") || r.includes("cai")) return "DEF";
    if (r.includes("dc") || r.includes("ei") || r.includes("ed") || r.includes("st") || r.includes("ext") || r.includes("punta")) return "FWD";
    return "MID";
  };

  const searchOrder: Record<string, string[]> = {
    GK: ["GK", "DEF", "MID", "FWD"],
    DEF: ["DEF", "MID", "FWD", "GK"],
    MID: ["MID", "FWD", "DEF", "GK"],
    FWD: ["FWD", "MID", "DEF", "GK"]
  };

  return currentNodes.map(node => {
    const cat = getNodeCategory(node.role);
    const order = searchOrder[cat];
    let selectedPlayer: Player | null = null;

    for (const bKey of order) {
      const candidate = buckets[bKey].find(p => !assignedPlayerIds.has(p.id));
      if (candidate) {
        selectedPlayer = candidate;
        assignedPlayerIds.add(candidate.id);
        break;
      }
    }

    if (selectedPlayer) {
      return { ...node, playerId: selectedPlayer.id, playerName: selectedPlayer.name };
    }
    return { ...node, playerId: null, playerName: null };
  });
};

const autoAssignRivalPlayers = (rivalRoster: any[], currentNodes: TacticNode[]): TacticNode[] => {
  if (!rivalRoster || rivalRoster.length === 0) return currentNodes;

  const starters = rivalRoster.filter(p => p.status === "Titular");
  const pool = starters.length > 0 ? starters : rivalRoster;

  const categorize = (pos: string | null) => {
    if (!pos) return "MID";
    const p = pos.toLowerCase();
    if (p.includes("por") || p.includes("gk") || p.includes("port") || p.includes("goalk") || p.includes("arquero")) return "GK";
    if (p.includes("def") || p.includes("li") || p.includes("ld") || p.includes("zagu") || p.includes("back") || p.includes("cad") || p.includes("cai") || p.includes("lat")) return "DEF";
    if (p.includes("del") || p.includes("att") || p.includes("st") || p.includes("ext") || p.includes("punta") || p.includes("dc") || p.includes("ei") || p.includes("ed") || p.includes("forw")) return "FWD";
    return "MID";
  };

  const buckets: Record<string, any[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  pool.forEach(p => {
    buckets[categorize(p.position)].push(p);
  });

  const assignedPlayerIds = new Set<string>();

  const getNodeCategory = (role: string) => {
    const r = role.toLowerCase();
    if (r.includes("por") || r.includes("gk")) return "GK";
    if (r.includes("df") || r.includes("li") || r.includes("ld") || r.includes("cad") || r.includes("cai")) return "DEF";
    if (r.includes("dc") || r.includes("ei") || r.includes("ed") || r.includes("st") || r.includes("ext") || r.includes("punta")) return "FWD";
    return "MID";
  };

  const searchOrder: Record<string, string[]> = {
    GK: ["GK", "DEF", "MID", "FWD"],
    DEF: ["DEF", "MID", "FWD", "GK"],
    MID: ["MID", "FWD", "DEF", "GK"],
    FWD: ["FWD", "MID", "DEF", "GK"]
  };

  return currentNodes.map(node => {
    const cat = getNodeCategory(node.role);
    const order = searchOrder[cat];
    let selectedPlayer: any | null = null;

    for (const bKey of order) {
      const candidate = buckets[bKey].find(p => !assignedPlayerIds.has(p.id));
      if (candidate) {
        selectedPlayer = candidate;
        assignedPlayerIds.add(candidate.id);
        break;
      }
    }

    if (selectedPlayer) {
      return { ...node, playerId: selectedPlayer.id, playerName: selectedPlayer.name };
    }
    return { ...node, playerId: null, playerName: null };
  });
};

export default function Tactics() {
  const fieldRef = useRef<HTMLDivElement>(null)
  
  // List loading
  const [teams, setTeams] = useState<Team[]>([])
  const [savedTactics, setSavedTactics] = useState<SavedTactic[]>([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [loadingTactics, setLoadingTactics] = useState(false)
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  // Current Form values
  const [selectedTacticId, setSelectedTacticId] = useState<string>("new")
  const [tacticTitle, setTacticTitle] = useState("")
  const [tacticDescription, setTacticDescription] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<string>("none")
  const [selectedFormation, setSelectedFormation] = useState<string>("4-3-3")
  const [players, setPlayers] = useState<Player[]>([])
  const [nextMatchAnalysis, setNextMatchAnalysis] = useState<any>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)

  // Selected division opponent team and players
  const [rivalTeamId, setRivalTeamId] = useState<string>("none")
  const [rivalPlayers, setRivalPlayers] = useState<Player[]>([])
  const [loadingRivalPlayers, setLoadingRivalPlayers] = useState(false)

  // Last match formations and lineups
  const [lastMatchBaseTeam, setLastMatchBaseTeam] = useState<any>(null)
  const [lastMatchRivalTeam, setLastMatchRivalTeam] = useState<any>(null)
  const [loadingLastMatchBase, setLoadingLastMatchBase] = useState(false)
  const [loadingLastMatchRival, setLoadingLastMatchRival] = useState(false)

  // Tactical circles configuration
  const [nodes, setNodes] = useState<TacticNode[]>([])
  
  // Drag state
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null)
  const [selectedNodeIdForPlayer, setSelectedNodeIdForPlayer] = useState<string | null>(null)

  // Combobox open & search states
  const [openTeamPopover, setOpenTeamPopover] = useState(false)
  const [teamSearch, setTeamSearch] = useState("")

  const [openRivalPopover, setOpenRivalPopover] = useState(false)
  const [rivalSearch, setRivalSearch] = useState("")

  // Initial loads
  useEffect(() => {
    const loadInitialData = async () => {
      setLoadingTeams(true)
      setLoadingTactics(true)
      try {
        const [teamsRes, tacticsRes] = await Promise.all([
          api.get('/matches/teams'),
          api.get('/tactics/')
        ])
        const rawTeams = teamsRes.data || []
        const uniqueTeams = Array.from(
          new Map(rawTeams.map((t: Team) => [t.name.trim().toLowerCase(), t])).values()
        ) as Team[]
        // Sort alphabetically by default
        uniqueTeams.sort((a, b) => a.name.localeCompare(b.name))
        setTeams(uniqueTeams)
        setSavedTactics(tacticsRes.data || [])
      } catch (err) {
        console.error("Failed to load initial data", err)
        toast.error("Error al cargar equipos o tácticas")
      } finally {
        setLoadingTeams(false)
        setLoadingTactics(false)
      }
    }
    loadInitialData()
  }, [])

  // Setup nodes when formation, selected tactic, players or lastMatchBaseTeam change
  useEffect(() => {
    if (selectedTacticId === "new") {
      const preset = getFormationCoordinates(selectedFormation)
      const newNodes = preset.map((p, idx) => ({
        id: `node_${idx}`,
        role: p.role,
        x: p.x,
        y: p.y,
        playerId: null,
        playerName: null
      }))
      
      // If we have the last match starters for the selected team, assign them!
      if (lastMatchBaseTeam && lastMatchBaseTeam.players && lastMatchBaseTeam.players.length > 0) {
        setNodes(autoAssignLastMatchPlayers(lastMatchBaseTeam.players, newNodes))
      } else if (players && players.length > 0) {
        setNodes(autoAssignPlayers(players, newNodes))
      } else {
        setNodes(newNodes)
      }
    }
  }, [selectedFormation, selectedTacticId, players, lastMatchBaseTeam])

  // Roster fetching when team is selected
  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") {
      setPlayers([])
      return
    }
    const loadPlayers = async () => {
      setLoadingPlayers(true)
      try {
        const res = await api.get('/matches/players', { params: { team_id: selectedTeamId } })
        const rawPlayers = res.data || []
        // Sort alphabetically by default
        const sorted = [...rawPlayers].sort((a: Player, b: Player) => a.name.localeCompare(b.name))
        setPlayers(sorted)
      } catch (e) {
        console.error("Failed to load players", e)
      } finally {
        setLoadingPlayers(false)
      }
    }
    loadPlayers()
  }, [selectedTeamId])

  // Fetch next match AI analysis when base team is selected
  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") {
      setNextMatchAnalysis(null)
      return
    }
    const loadNextMatchAnalysis = async () => {
      setLoadingAnalysis(true)
      try {
        const res = await api.get(`/predict/next-match/${selectedTeamId}`)
        setNextMatchAnalysis(res.data)
      } catch (err) {
        console.error("Failed to load next match analysis", err)
      } finally {
        setLoadingAnalysis(false)
      }
    }
    loadNextMatchAnalysis()
  }, [selectedTeamId])

  const mapToPresetFormation = (form: string): string => {
    if (!form) return "4-3-3"
    const normalized = form.replace(/\s+/g, "").trim()
    if (normalized === "4-3-3" || normalized === "4-4-2" || normalized === "3-5-2" || normalized === "4-2-3-1" || normalized === "5-3-2") {
      return normalized
    }
    if (normalized.startsWith("4-1-4-1") || normalized.startsWith("4-5-1") || normalized.startsWith("4-1-3-2") || normalized.startsWith("4-1-2-3")) {
      return "4-3-3"
    }
    if (normalized.startsWith("4-4-2") || normalized.startsWith("4-2-2-2")) {
      return "4-4-2"
    }
    if (normalized.startsWith("3-5-2") || normalized.startsWith("3-4-3") || normalized.startsWith("3-4-1-2") || normalized.startsWith("3-4-2-1")) {
      return "3-5-2"
    }
    if (normalized.startsWith("4-2-3-1") || normalized.startsWith("4-3-2-1") || normalized.startsWith("4-3-1-2")) {
      return "4-2-3-1"
    }
    if (normalized.startsWith("5-3-2") || normalized.startsWith("5-4-1") || normalized.startsWith("3-5-1-1") || normalized.startsWith("5-2-3")) {
      return "5-3-2"
    }
    return "4-3-3"
  }

  // Fetch last match formation for base team
  useEffect(() => {
    if (!selectedTeamId || selectedTeamId === "none") {
      setLastMatchBaseTeam(null)
      return
    }
    const loadLastMatchBase = async () => {
      setLoadingLastMatchBase(true)
      try {
        const res = await api.get(`/matches/team/${selectedTeamId}/last-match-formation`)
        setLastMatchBaseTeam(res.data)
        
        // Automatically default selected formation to the last match's formation exactly (without restricting mapToPreset)
        if (res.data && res.data.formation) {
          setSelectedFormation(res.data.formation)
        }
      } catch (err) {
        console.error("Failed to load last match formation for base team", err)
      } finally {
        setLoadingLastMatchBase(false)
      }
    }
    loadLastMatchBase()
  }, [selectedTeamId])

  // Fetch last match formation for rival team
  useEffect(() => {
    if (!rivalTeamId || rivalTeamId === "none") {
      setLastMatchRivalTeam(null)
      return
    }
    const loadLastMatchRival = async () => {
      setLoadingLastMatchRival(true)
      try {
        const res = await api.get(`/matches/team/${rivalTeamId}/last-match-formation`)
        setLastMatchRivalTeam(res.data)
      } catch (err) {
        console.error("Failed to load last match formation for rival team", err)
      } finally {
        setLoadingLastMatchRival(false)
      }
    }
    loadLastMatchRival()
  }, [rivalTeamId])

  // Reset rival team when base team changes
  useEffect(() => {
    setRivalTeamId("none")
    setRivalPlayers([])
    setLastMatchBaseTeam(null)
    setLastMatchRivalTeam(null)
  }, [selectedTeamId])

  // Fetch rival players when rival team is selected
  useEffect(() => {
    if (!rivalTeamId || rivalTeamId === "none") {
      setRivalPlayers([])
      return
    }
    const loadRivalPlayers = async () => {
      setLoadingRivalPlayers(true)
      try {
        const res = await api.get('/matches/players', { params: { team_id: rivalTeamId } })
        const rawPlayers = res.data || []
        // Sort alphabetically by default
        const sorted = [...rawPlayers].sort((a: Player, b: Player) => a.name.localeCompare(b.name))
        setRivalPlayers(sorted)
      } catch (e) {
        console.error("Failed to load rival players", e)
      } finally {
        setLoadingRivalPlayers(false)
      }
    }
    loadRivalPlayers()
  }, [rivalTeamId])

  // Handle Saved Tactic Selection
  const handleSelectTactic = (val: string) => {
    setSelectedTacticId(val)
    if (val === "new") {
      setTacticTitle("")
      setTacticDescription("")
      setSelectedTeamId("none")
      setSelectedFormation("4-3-3")
      return
    }

    const t = savedTactics.find(x => x.id === val)
    if (t) {
      setTacticTitle(t.title)
      setTacticDescription(t.description || "")
      setSelectedTeamId(t.team_id || "none")
      setSelectedFormation(t.formation)
      try {
        const loadedNodes = JSON.parse(t.positions_json)
        setNodes(loadedNodes)
      } catch (e) {
        console.error("Error parsing tactic coordinates", e)
      }
    }
  }

  // Tactical Board Draggability handlers
  const handleMouseDown = (nodeId: string) => {
    setDraggedNodeId(nodeId)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId || !fieldRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    
    // Calculate percentage coords
    let x = ((e.clientX - rect.left) / rect.width) * 100
    let y = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp coordinates to stay inside the pitch limits
    x = Math.max(2, Math.min(98, x))
    y = Math.max(2, Math.min(98, y))

    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y } : n))
  }

  const handleMouseUp = () => {
    setDraggedNodeId(null)
  }

  // Touch Event Handlers for Mobile / Tablet Drag-and-Drop
  const handleTouchStart = (nodeId: string) => {
    setDraggedNodeId(nodeId)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggedNodeId || !fieldRef.current) return
    
    // Prevent scrolling when dragging on mobile
    if (e.cancelable) {
      e.preventDefault()
    }
    
    const rect = fieldRef.current.getBoundingClientRect()
    const touch = e.touches[0]
    
    let x = ((touch.clientX - rect.left) / rect.width) * 100
    let y = ((touch.clientY - rect.top) / rect.height) * 100

    x = Math.max(2, Math.min(98, x))
    y = Math.max(2, Math.min(98, y))

    setNodes(prev => prev.map(n => n.id === draggedNodeId ? { ...n, x, y } : n))
  }

  const handleTouchEnd = () => {
    setDraggedNodeId(null)
  }

  // Handle Player Assignment to Circle Node
  const handleAssignPlayer = (nodeId: string, playerId: string) => {
    setSelectedNodeIdForPlayer(null)
    if (playerId === "none") {
      setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, playerId: null, playerName: null } : n))
      return
    }

    const target = players.find(p => p.id === playerId) || rivalPlayers.find(p => p.id === playerId)
    if (target) {
      // Check if player is already assigned somewhere else, and unassign if so
      setNodes(prev => prev.map(n => {
        if (n.playerId === playerId) {
          return { ...n, playerId: null, playerName: null }
        }
        if (n.id === nodeId) {
          return { ...n, playerId: target.id, playerName: target.name }
        }
        return n
      }))
    }
  }

  // Handle Saving Tactic to DB
  const handleSaveTactic = async () => {
    if (!tacticTitle.trim()) {
      toast.error("Por favor, ingresa un título para la táctica.")
      return
    }

    try {
      const payload = {
        title: tacticTitle,
        description: tacticDescription,
        formation: selectedFormation,
        positions_json: JSON.stringify(nodes),
        team_id: (selectedTeamId && selectedTeamId !== "none") ? selectedTeamId : null
      }

      const isUpdate = selectedTacticId !== "new"
      const url = isUpdate ? `/tactics/?tactic_id=${selectedTacticId}` : '/tactics/'
      
      const res = await api.post(url, payload)
      toast.success(isUpdate ? "Táctica actualizada correctamente" : "Táctica guardada correctamente")

      // Reload tactics list
      const listRes = await api.get('/tactics/')
      setSavedTactics(listRes.data || [])

      if (!isUpdate && res.data?.id) {
        setSelectedTacticId(res.data.id)
      }
    } catch (e) {
      console.error("Failed to save tactic", e)
      toast.error("Error al guardar la táctica")
    }
  }

  // Handle Tactic Deletion
  const handleDeleteTactic = async () => {
    if (selectedTacticId === "new") return
    if (!window.confirm("¿Seguro que deseas eliminar esta táctica?")) return

    try {
      await api.delete(`/tactics/${selectedTacticId}`)
      toast.success("Táctica eliminada")
      
      // Reset form
      setSelectedTacticId("new")
      setTacticTitle("")
      setTacticDescription("")
      setSelectedTeamId("none")
      setSelectedFormation("4-3-3")

      // Reload list
      const listRes = await api.get('/tactics/')
      setSavedTactics(listRes.data || [])
    } catch (e) {
      console.error("Failed to delete tactic", e)
      toast.error("Error al eliminar la táctica")
    }
  }

  // Division filter calculations
  const baseTeam = teams.find(t => t.id === selectedTeamId)
  const baseTeamLeagueId = baseTeam?.league_id
  const divisionRivalTeams = teams.filter(t => t.league_id === baseTeamLeagueId && t.id !== selectedTeamId)

  // Dynamically include selectedFormation (even if custom from last match) in the dropdown select list
  const availableFormations = Array.from(new Set([...Object.keys(FORMATIONS), selectedFormation]))

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Trophy className="h-8 w-8 text-primary" /> Pizarra Táctica y Alineaciones
          </h2>
          <p className="text-muted-foreground">Crea formaciones de juego, arrastra fichas de jugadores y define estrategias tácticas.</p>
        </div>

        {/* Load saved tactic */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-muted-foreground uppercase whitespace-nowrap">Tácticas:</span>
          {loadingTactics ? (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <Select value={selectedTacticId} onValueChange={handleSelectTactic}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Nueva Táctica" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">🆕 Nueva Pizarra</SelectItem>
                {savedTactics.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    📋 {t.title} ({t.formation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3 items-start">
        {/* Column 1: Config & AI Analysis */}
        <div className="xl:col-span-1 space-y-6">
          {/* Left Control Panel Form */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-1.5">
                <Users className="h-5 w-5 text-primary" /> Configuración de Pizarra
              </CardTitle>
              <CardDescription>Completa los detalles de tu plan táctico</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Título del Esquema</label>
                <Input 
                  placeholder="Ej. Presión Alta vs Colo-Colo" 
                  value={tacticTitle}
                  onChange={e => setTacticTitle(e.target.value)}
                />
              </div>

              {/* Formation & Team Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Formación Base</label>
                  <Select value={selectedFormation} onValueChange={setSelectedFormation}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableFormations.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Equipo Base</label>
                  <Popover open={openTeamPopover} onOpenChange={setOpenTeamPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openTeamPopover}
                        className="w-full justify-between px-3 font-normal"
                      >
                        <span className="truncate">
                          {selectedTeamId && selectedTeamId !== "none"
                            ? teams.find((t) => t.id === selectedTeamId)?.name
                            : "Elegir Equipo..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2 bg-card border border-border shadow-lg rounded-md z-50" align="start">
                      <div className="space-y-2">
                        <Input
                          placeholder="Buscar equipo..."
                          value={teamSearch}
                          onChange={(e) => setTeamSearch(e.target.value)}
                          className="h-8 text-xs bg-background"
                          autoFocus
                        />
                        <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-1">
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between transition-colors",
                              selectedTeamId === "none" && "bg-primary/10 text-primary font-bold"
                            )}
                            onClick={() => {
                              setSelectedTeamId("none")
                              setOpenTeamPopover(false)
                              setTeamSearch("")
                            }}
                          >
                            <span>-- Sin Plantilla --</span>
                            {selectedTeamId === "none" && <Check className="h-3.5 w-3.5 text-primary" />}
                          </button>
                          {teams
                            .filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase()))
                            .map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className={cn(
                                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between transition-colors",
                                  selectedTeamId === t.id && "bg-primary/10 text-primary font-bold"
                                )}
                                onClick={() => {
                                  setSelectedTeamId(t.id)
                                  setOpenTeamPopover(false)
                                  setTeamSearch("")
                                }}
                              >
                                <span className="truncate">{t.name}</span>
                                {selectedTeamId === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                          {teams.filter((t) => t.name.toLowerCase().includes(teamSearch.toLowerCase())).length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-3">
                              No se encontró ningún equipo.
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Rival Selection (Same Division) */}
              {selectedTeamId && selectedTeamId !== "none" && (
                <div className="space-y-1 flex flex-col">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Rival de la División (Misma Liga)</label>
                  <Popover open={openRivalPopover} onOpenChange={setOpenRivalPopover}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openRivalPopover}
                        className="w-full justify-between px-3 font-normal"
                      >
                        <span className="truncate">
                          {rivalTeamId && rivalTeamId !== "none"
                            ? divisionRivalTeams.find((t) => t.id === rivalTeamId)?.name
                            : "Elegir Rival..."}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2 bg-card border border-border shadow-lg rounded-md z-50" align="start">
                      <div className="space-y-2">
                        <Input
                          placeholder="Buscar rival..."
                          value={rivalSearch}
                          onChange={(e) => setRivalSearch(e.target.value)}
                          className="h-8 text-xs bg-background"
                          autoFocus
                        />
                        <div className="max-h-[200px] overflow-y-auto space-y-0.5 pr-1">
                          <button
                            type="button"
                            className={cn(
                              "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between transition-colors",
                              rivalTeamId === "none" && "bg-primary/10 text-primary font-bold"
                            )}
                            onClick={() => {
                              setRivalTeamId("none")
                              setOpenRivalPopover(false)
                              setRivalSearch("")
                            }}
                          >
                            <span>-- Sin Rival Seleccionado --</span>
                            {rivalTeamId === "none" && <Check className="h-3.5 w-3.5 text-primary" />}
                          </button>
                          {divisionRivalTeams
                            .filter((t) => t.name.toLowerCase().includes(rivalSearch.toLowerCase()))
                            .map((t) => (
                              <button
                                key={t.id}
                                type="button"
                                className={cn(
                                  "w-full text-left px-2 py-1.5 text-xs rounded hover:bg-accent flex items-center justify-between transition-colors",
                                  rivalTeamId === t.id && "bg-primary/10 text-primary font-bold"
                                )}
                                onClick={() => {
                                  setRivalTeamId(t.id)
                                  setOpenRivalPopover(false)
                                  setRivalSearch("")
                                }}
                              >
                                <span className="truncate">{t.name}</span>
                                {rivalTeamId === t.id && <Check className="h-3.5 w-3.5 text-primary" />}
                              </button>
                            ))}
                          {divisionRivalTeams.filter((t) => t.name.toLowerCase().includes(rivalSearch.toLowerCase())).length === 0 && (
                            <div className="text-xs text-muted-foreground text-center py-3">
                              No se encontró ningún rival.
                            </div>
                          )}
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              {/* Reset/Auto-populate starting XI */}
              {selectedTeamId && selectedTeamId !== "none" && (
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-muted-foreground block">Distribución Automática</label>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      if (players.length > 0) {
                        setNodes(prev => autoAssignPlayers(players, prev))
                        toast.success("Alineación inicial restablecida por posición")
                      }
                    }}
                    disabled={players.length === 0}
                    className="w-full text-xs h-8 bg-primary/5 text-primary border-primary/20 hover:bg-primary/10"
                  >
                    🔄 Auto-Cargar Plantilla Inicial
                  </Button>
                </div>
              )}

              {/* Descriptions & Strategy Notes */}
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-muted-foreground block">Instrucciones y Estrategia</label>
                <Textarea 
                  placeholder="Escribe directrices, transiciones, comportamientos tras pérdida, etc..." 
                  className="h-28 text-xs resize-none"
                  value={tacticDescription}
                  onChange={e => setTacticDescription(e.target.value)}
                />
              </div>

              {/* Submit Actions */}
              <div className="pt-2 flex flex-col gap-2">
                <Button onClick={handleSaveTactic} className="w-full gap-2 font-semibold">
                  <Save className="h-4 w-4" />
                  {selectedTacticId === "new" ? "Guardar Nueva Táctica" : "Guardar Cambios"}
                </Button>
                
                {selectedTacticId !== "new" && (
                  <Button variant="destructive" onClick={handleDeleteTactic} className="w-full gap-2 font-semibold bg-red-600/95 hover:bg-red-700">
                    <Trash2 className="h-4 w-4" />
                    Eliminar Táctica
                  </Button>
                )}

                {selectedTacticId !== "new" && (
                  <Button variant="secondary" onClick={() => handleSelectTactic("new")} className="w-full gap-2 font-semibold">
                    <Plus className="h-4 w-4" />
                    Nueva Pizarra de Cero
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Card 2: AI Predicted Rival Details */}
          {selectedTeamId && selectedTeamId !== "none" && (
            <Card className="border-border/60 bg-card overflow-hidden">
              <CardHeader className="pb-3 border-b bg-primary/5">
                <CardTitle className="text-md flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                  Rival y Recomendación IA
                </CardTitle>
                <CardDescription className="text-xs">
                  Análisis táctico automatizado para el siguiente partido
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {loadingAnalysis ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs">Analizando rival...</span>
                  </div>
                ) : !nextMatchAnalysis || !nextMatchAnalysis.opponent ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">
                    No se encontró programación de próximos partidos para este equipo.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Rival Header */}
                    <div className="flex items-center justify-between bg-secondary/20 p-3 rounded-lg border border-border/40">
                      <div className="space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-muted-foreground">Próximo Rival</span>
                        <h4 className="text-sm font-bold text-foreground flex items-center gap-1.5">
                          <Shield className="h-4 w-4 text-primary shrink-0" />
                          {nextMatchAnalysis.opponent.name}
                        </h4>
                        {nextMatchAnalysis.opponent.stadium && (
                          <p className="text-[10px] text-muted-foreground">{nextMatchAnalysis.opponent.stadium}</p>
                        )}
                      </div>
                      
                      {nextMatchAnalysis.prediction && (
                        <div className="text-right">
                          <span className="text-[9px] uppercase font-bold text-muted-foreground block">Predicción IA</span>
                          <Badge className={`${
                            nextMatchAnalysis.prediction.result === 'Victoria' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' :
                            nextMatchAnalysis.prediction.result === 'Derrota' ? 'bg-red-500/10 text-red-400 border-red-500/25' :
                            'bg-amber-500/10 text-amber-400 border-amber-500/25'
                          } border text-[10px] font-bold`}>
                            {nextMatchAnalysis.prediction.result} ({nextMatchAnalysis.prediction.confidence}%)
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* AI Recommended Formation */}
                    <div className="space-y-2 p-3 border rounded-lg bg-blue-500/5 border-blue-500/10">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400 flex items-center gap-1">
                          ⚽ Formación IA: {nextMatchAnalysis.recommended_formation?.name || "4-3-3"}
                        </span>
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-6 text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 hover:bg-blue-500/20 hover:text-blue-300"
                            onClick={() => {
                              const rawForm = nextMatchAnalysis.recommended_formation?.name || "4-3-3";
                              const match = rawForm.match(/\d-\d-\d/);
                              if (match) {
                                setSelectedFormation(match[0]);
                                toast.success(`Formación establecida en ${match[0]}`);
                              }
                            }}
                          >
                            Aplicar Formación
                          </Button>

                          {nextMatchAnalysis.predicted_lineup && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-[10px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 hover:text-emerald-300"
                              onClick={() => {
                                setNodes(prev => autoAssignRivalPlayers(nextMatchAnalysis.predicted_lineup, prev))
                                toast.success(`Once titular de ${nextMatchAnalysis.opponent.name} cargado en pizarra`);
                              }}
                            >
                              Cargar Once Rival
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {nextMatchAnalysis.recommended_formation?.justification}
                      </p>
                    </div>

                    {/* Tactical Tips list */}
                    <div className="space-y-2">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground block">Claves del Partido (IA Tips)</span>
                      <ul className="space-y-1.5">
                        {nextMatchAnalysis.tactical_tips && nextMatchAnalysis.tactical_tips.map((tip: string, idx: number) => (
                          <li key={idx} className="text-xs text-muted-foreground flex gap-2 items-start leading-relaxed">
                            <span className="text-primary shrink-0 pt-0.5">🔹</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Card 3: Plantillas del Encuentro (Roster list and next rival predictive lineup) */}
          {selectedTeamId && selectedTeamId !== "none" && (
            <Card className="border-border/60 bg-card overflow-hidden">
              <CardHeader className="pb-3 border-b bg-secondary/5">
                <CardTitle className="text-md flex items-center gap-1.5 text-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  Plantillas del Encuentro
                </CardTitle>
                <CardDescription className="text-xs">
                  Rosters activos y plantilla predictiva del próximo rival
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                {/* Roster: Base Team */}
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-primary flex items-center gap-1.5">
                    🛡️ Plantilla: {baseTeam?.name}
                  </h4>
                  <div className="max-h-40 overflow-y-auto pr-1 text-xs space-y-1 border border-border/40 p-2 rounded-lg bg-zinc-950/20">
                    {players.length === 0 ? (
                      <p className="text-muted-foreground text-center py-2 text-[11px]">Cargando plantilla...</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1">
                        {players.map(p => (
                          <div key={p.id} className="flex justify-between items-center py-1 px-1.5 rounded hover:bg-secondary/30">
                            <span className="truncate max-w-[90px] font-medium text-foreground">{p.name}</span>
                            <Badge className="text-[9px] scale-90 py-0 px-1 bg-zinc-800 text-zinc-300 font-semibold uppercase">{p.position ? p.position.substring(0,3) : "DF"}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Roster: Selected Division Opponent */}
                {rivalTeamId && rivalTeamId !== "none" && (
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <h4 className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                      ⚔️ Plantilla Rival: {teams.find(t => t.id === rivalTeamId)?.name}
                    </h4>
                    <div className="max-h-40 overflow-y-auto pr-1 text-xs space-y-1 border border-rose-500/15 p-2 rounded-lg bg-rose-500/5">
                      {loadingRivalPlayers ? (
                        <div className="flex items-center justify-center gap-1.5 py-4 text-muted-foreground">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
                          <span className="text-[10px]">Cargando rival...</span>
                        </div>
                      ) : rivalPlayers.length === 0 ? (
                        <p className="text-muted-foreground text-center py-2 text-[11px]">No hay jugadores.</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-1">
                          {rivalPlayers.map(p => (
                            <div key={p.id} className="flex justify-between items-center py-1 px-1.5 rounded hover:bg-rose-500/10">
                              <span className="truncate max-w-[90px] font-medium text-rose-200">{p.name}</span>
                              <Badge className="text-[9px] scale-90 py-0 px-1 bg-rose-950/40 text-rose-300 border border-rose-500/20 font-semibold uppercase">{p.position ? p.position.substring(0,3) : "DF"}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Section: Next Rival Predictive Lineup (IA) */}
                {nextMatchAnalysis && nextMatchAnalysis.opponent && nextMatchAnalysis.predicted_lineup && (
                  <div className="space-y-2 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                        Predicción IA: Titulares de {nextMatchAnalysis.opponent.name}
                      </h4>
                      <Badge className="text-[9px] bg-blue-500/10 text-blue-300 border border-blue-500/20">Alineación Probable</Badge>
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Proyección del once inicial rival basado en el historial táctico y bajas:
                    </p>

                    <div className="max-h-48 overflow-y-auto pr-1 text-xs space-y-1.5 border border-blue-500/15 p-2 rounded-lg bg-blue-500/5">
                      {nextMatchAnalysis.predicted_lineup.map((p: any) => {
                        const isInjured = p.status === 'Lesionado';
                        const isSuspended = p.status === 'Sancionado';
                        const isDoubt = p.status === 'En Duda';
                        const isStarter = p.status === 'Titular';
                        
                        let badgeColor = "bg-zinc-800 text-zinc-300";
                        if (isStarter) badgeColor = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
                        if (isInjured || isSuspended) badgeColor = "bg-red-500/20 text-red-400 border border-red-500/30";
                        if (isDoubt) badgeColor = "bg-amber-500/20 text-amber-400 border border-amber-500/30";

                        return (
                          <div key={p.id} className="flex flex-col py-1 px-1.5 rounded bg-zinc-950/30 border border-border/20">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-1.5">
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  isStarter ? "bg-emerald-400" :
                                  isInjured || isSuspended ? "bg-red-400" :
                                  isDoubt ? "bg-amber-400" :
                                  "bg-zinc-400"
                                }`} />
                                <span className="font-semibold text-foreground truncate max-w-[120px]">{p.name}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] text-muted-foreground uppercase">{p.position ? p.position.substring(0,3) : "DF"}</span>
                                <Badge className={`text-[8px] scale-90 py-0 px-1 font-bold ${badgeColor}`}>{p.status}</Badge>
                              </div>
                            </div>
                            {p.status_reason && (
                              <p className="text-[9px] text-rose-400 pl-3 mt-0.5 italic">
                                ⚠️ {p.status_reason} (Confianza: {p.confidence}%)
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right side: Canvas & Last Match Formations Comparison */}
        <div className="xl:col-span-2 space-y-6">
          {/* Soccer field Card */}
          <Card className="border-border/60 bg-card overflow-hidden">
            <CardHeader className="pb-2 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-md flex items-center gap-1.5">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" /> Campo de Juego Interactivo
                  </CardTitle>
                  <CardDescription className="text-xs">Haz clic en un jugador para asignarlo o arrastra la ficha para mover su posición.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {selectedTeamId && selectedTeamId !== "none" && players.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1.5 bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                      onClick={() => {
                        setNodes(prev => autoAssignPlayers(players, prev));
                        toast.success("Alineación titular reasignada según posiciones reales");
                      }}
                    >
                      <RefreshCw className="h-3 w-3" /> Cargar Once Titular
                    </Button>
                  )}
                  {selectedTeamId && selectedTeamId !== "none" && loadingPlayers && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" /> Cargando...
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 bg-zinc-950 flex justify-center items-center select-none">
              {/* The Soccer Pitch Canvas */}
              <div 
                ref={fieldRef}
                className="relative w-full max-w-[620px] aspect-[4/3] rounded-xl border border-emerald-500/30 overflow-hidden shadow-inner cursor-crosshair touch-none"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{
                  background: "radial-gradient(circle at center, #1b4d22 10%, #113316 90%)"
                }}
              >
                {/* Pitch Markings (SVG lines layer) */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-40" xmlns="http://www.w3.org/2000/svg">
                  {/* Outer bounds */}
                  <rect x="3%" y="3%" width="94%" height="94%" fill="none" stroke="white" strokeWidth="2" />
                  {/* Center circle */}
                  <circle cx="50%" cy="50%" r="12%" fill="none" stroke="white" strokeWidth="2" />
                  {/* Center line */}
                  <line x1="3%" y1="50%" x2="97%" y2="50%" stroke="white" strokeWidth="2" />
                  {/* Penalty Area Top */}
                  <rect x="25%" y="3%" width="50%" height="15%" fill="none" stroke="white" strokeWidth="2" />
                  <rect x="38%" y="3%" width="24%" height="5%" fill="none" stroke="white" strokeWidth="2" />
                  {/* Penalty Area Bottom */}
                  <rect x="25%" y="82%" width="50%" height="15%" fill="none" stroke="white" strokeWidth="2" />
                  <rect x="38%" y="92%" width="24%" height="5%" fill="none" stroke="white" strokeWidth="2" />
                  {/* Goals */}
                  <line x1="44%" y1="2%" x2="56%" y2="2%" stroke="white" strokeWidth="4" />
                  <line x1="44%" y1="98%" x2="56%" y2="98%" stroke="white" strokeWidth="4" />
                </svg>

                {/* Player circles Nodes */}
                {nodes.map(node => {
                  const isNodeSelected = selectedNodeIdForPlayer === node.id
                  const isRivalNode = node.playerId ? rivalPlayers.some(rp => rp.id === node.playerId) : false

                  return (
                    <div
                      key={node.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-grab active:cursor-grabbing"
                      style={{
                        left: `${node.x}%`,
                        top: `${node.y}%`,
                        zIndex: isNodeSelected ? 50 : 20
                      }}
                    >
                      {/* Circle representing the Player */}
                      <div 
                        onMouseDown={() => handleMouseDown(node.id)}
                        onTouchStart={() => handleTouchStart(node.id)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNodeIdForPlayer(isNodeSelected ? null : node.id)
                        }}
                        className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-[11px] shadow-lg border-2 transition-all duration-150 ${
                          node.playerId 
                            ? isRivalNode 
                              ? "bg-rose-600 text-white border-white scale-105 hover:bg-rose-700" 
                              : "bg-primary text-primary-foreground border-white scale-105" 
                            : "bg-secondary text-secondary-foreground border-muted-foreground/50 hover:border-primary"
                        } ${isNodeSelected ? "ring-2 ring-primary ring-offset-2 ring-offset-zinc-950 scale-110" : ""}`}
                      >
                        {node.role}
                      </div>

                      {/* Display name label */}
                      <div className="mt-1 bg-zinc-900/90 text-[10px] font-bold text-white px-2 py-0.5 rounded border border-zinc-700/60 max-w-[90px] truncate text-center select-none shadow">
                        {node.playerName || "Libre"}
                      </div>

                      {/* Quick Player Assignment Dropdown popup inside the pitch */}
                      {isNodeSelected && (
                        <div className="absolute top-11 bg-zinc-900 border border-zinc-700 rounded-lg p-2 w-48 shadow-2xl z-50 text-left space-y-1.5 animate-in fade-in zoom-in-95 duration-100">
                          <p className="text-[9px] uppercase font-bold text-muted-foreground border-b border-zinc-800 pb-1">Asignar Jugador ({node.role})</p>
                          
                          {!selectedTeamId || selectedTeamId === "none" ? (
                            <p className="text-[10px] text-yellow-400 py-1">Selecciona un Equipo en el panel izquierdo.</p>
                          ) : players.length === 0 ? (
                            <p className="text-[10px] text-muted-foreground py-1">Cargando plantilla...</p>
                          ) : (
                            <div className="max-h-36 overflow-y-auto pr-1 space-y-1">
                              <button
                                onClick={() => handleAssignPlayer(node.id, "none")}
                                className="w-full text-left text-[10px] py-1 px-1.5 rounded hover:bg-zinc-800 text-red-400 font-semibold"
                              >
                                -- Dejar Libre --
                              </button>
                              
                               {/* Base Team Players */}
                               <p className="text-[9px] text-primary font-bold uppercase mt-1 px-1">Equipo Base</p>
                               
                               {/* Banquillo Base */}
                               <p className="text-[8px] text-emerald-400 font-bold uppercase mt-0.5 px-1 pl-2">Banquillo</p>
                               {players.filter(p => !nodes.some(n => n.playerId === p.id)).map(p => (
                                 <button
                                   key={p.id}
                                   onClick={() => handleAssignPlayer(node.id, p.id)}
                                   className="w-full text-left text-[10px] py-1 px-1.5 rounded truncate block hover:bg-zinc-800 text-white"
                                  >
                                   {p.name} ({p.position ? p.position.substring(0,3) : "DF"})
                                 </button>
                               ))}

                               {/* En Cancha Base */}
                               <p className="text-[8px] text-zinc-500 font-bold uppercase mt-1.5 px-1 pl-2">En Cancha</p>
                               {players.filter(p => nodes.some(n => n.playerId === p.id)).map(p => (
                                 <button
                                   key={p.id}
                                   onClick={() => handleAssignPlayer(node.id, p.id)}
                                   className="w-full text-left text-[10px] py-1 px-1.5 rounded truncate block hover:bg-zinc-800 text-zinc-500 line-through opacity-60"
                                 >
                                   {p.name} ({p.position ? p.position.substring(0,3) : "DF"})
                                 </button>
                               ))}

                               {/* Rival Team Players */}
                               {rivalPlayers.length > 0 && (
                                 <>
                                   <p className="text-[9px] text-rose-400 font-bold uppercase mt-2 px-1 border-t border-zinc-800 pt-1">Rival de División</p>
                                   
                                   {/* Banquillo Rival */}
                                   <p className="text-[8px] text-rose-300 font-bold uppercase mt-0.5 px-1 pl-2">Banquillo Rival</p>
                                   {rivalPlayers.filter(p => !nodes.some(n => n.playerId === p.id)).map(p => (
                                     <button
                                       key={p.id}
                                       onClick={() => handleAssignPlayer(node.id, p.id)}
                                       className="w-full text-left text-[10px] py-1 px-1.5 rounded truncate block hover:bg-zinc-800 text-rose-200"
                                     >
                                       {p.name} ({p.position ? p.position.substring(0,3) : "DF"})
                                     </button>
                                   ))}

                                   {/* En Cancha Rival */}
                                   <p className="text-[8px] text-zinc-600 font-bold uppercase mt-1.5 px-1 pl-2">En Cancha Rival</p>
                                   {rivalPlayers.filter(p => nodes.some(n => n.playerId === p.id)).map(p => (
                                     <button
                                       key={p.id}
                                       onClick={() => handleAssignPlayer(node.id, p.id)}
                                       className="w-full text-left text-[10px] py-1 px-1.5 rounded truncate block hover:bg-zinc-800 text-zinc-600 line-through opacity-60"
                                     >
                                       {p.name} ({p.position ? p.position.substring(0,3) : "DF"})
                                     </button>
                                   ))}
                                 </>
                               )}
                            </div>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedNodeIdForPlayer(null)
                            }}
                            className="w-full h-6 text-[9px] text-muted-foreground hover:bg-zinc-800 mt-1"
                          >
                            Cerrar
                          </Button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Card 5: Formaciones del Último Partido (Base & Rival Comparativa) */}
          <Card className="border-border/60 bg-card overflow-hidden">
            <CardHeader className="pb-3 border-b bg-primary/5">
              <CardTitle className="text-md flex items-center gap-1.5 text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Formaciones del Último Partido (Comparativa)
              </CardTitle>
              <CardDescription className="text-xs">
                Alineación y esquema táctico real del último partido jugado por cada equipo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 divide-y md:divide-y-0 md:divide-x divide-border/60">
                
                {/* Columna Izquierda: Equipo Base */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {selectedTeamId && selectedTeamId !== "none" ? baseTeam?.name : "Equipo Base"}
                      </h4>
                      {lastMatchBaseTeam?.date && (
                        <p className="text-[10px] text-muted-foreground">
                          Último partido: {new Date(lastMatchBaseTeam.date).toLocaleDateString()} vs {lastMatchBaseTeam.opponent_name} ({lastMatchBaseTeam.is_home ? "L" : "V"})
                        </p>
                      )}
                    </div>
                    {lastMatchBaseTeam?.formation && (
                      <Badge className="bg-primary/25 text-primary border border-primary/30 text-xs font-bold px-2 py-0.5">
                        {lastMatchBaseTeam.formation}
                      </Badge>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                    {loadingLastMatchBase ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs">Cargando alineación...</span>
                      </div>
                    ) : !selectedTeamId || selectedTeamId === "none" ? (
                      <p className="text-muted-foreground text-center py-6 text-xs">
                        Selecciona un equipo base para ver su última alineación.
                      </p>
                    ) : !lastMatchBaseTeam || !lastMatchBaseTeam.players || lastMatchBaseTeam.players.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6 text-xs">
                        No se registraron alineaciones para el último partido.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {lastMatchBaseTeam.players.map((p: any) => (
                          <div key={p.id || p.name} className="flex items-center justify-between p-1.5 rounded bg-zinc-950/20 border border-border/40 hover:bg-secondary/20">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-5 w-5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-bold flex items-center justify-center shrink-0">
                                {p.shirt_number || "#"}
                              </span>
                              <span className="text-xs text-foreground font-medium truncate">{p.name}</span>
                            </div>
                            <Badge className="text-[9px] scale-90 py-0 px-1 bg-zinc-800 text-zinc-300 border border-zinc-700/60 uppercase shrink-0">
                              {p.position ? p.position.substring(0, 3) : "DF"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Columna Derecha: Equipo Rival */}
                <div className="space-y-4 pt-4 md:pt-0 md:pl-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-foreground">
                        {rivalTeamId && rivalTeamId !== "none" ? (teams.find(t => t.id === rivalTeamId)?.name) : "Equipo Rival"}
                      </h4>
                      {lastMatchRivalTeam?.date && (
                        <p className="text-[10px] text-muted-foreground">
                          Último partido: {new Date(lastMatchRivalTeam.date).toLocaleDateString()} vs {lastMatchRivalTeam.opponent_name} ({lastMatchRivalTeam.is_home ? "L" : "V"})
                        </p>
                      )}
                    </div>
                    {lastMatchRivalTeam?.formation && (
                      <Badge className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold px-2 py-0.5">
                        {lastMatchRivalTeam.formation}
                      </Badge>
                    )}
                  </div>

                  <div className="max-h-60 overflow-y-auto pr-1 space-y-1">
                    {loadingLastMatchRival ? (
                      <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                        <RefreshCw className="h-4 w-4 animate-spin text-rose-400" />
                        <span className="text-xs">Cargando alineación...</span>
                      </div>
                    ) : !rivalTeamId || rivalTeamId === "none" ? (
                      <p className="text-muted-foreground text-center py-6 text-xs">
                        Selecciona un rival de división para comparar su última alineación.
                      </p>
                    ) : !lastMatchRivalTeam || !lastMatchRivalTeam.players || lastMatchRivalTeam.players.length === 0 ? (
                      <p className="text-muted-foreground text-center py-6 text-xs">
                        No se registraron alineaciones para el último partido.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {lastMatchRivalTeam.players.map((p: any) => (
                          <div key={p.id || p.name} className="flex items-center justify-between p-1.5 rounded bg-zinc-950/20 border border-border/40 hover:bg-rose-500/5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="h-5 w-5 rounded-full bg-zinc-800 text-[10px] text-zinc-300 font-bold flex items-center justify-center shrink-0">
                                {p.shirt_number || "#"}
                              </span>
                              <span className="text-xs text-rose-200 font-medium truncate">{p.name}</span>
                            </div>
                            <Badge className="text-[9px] scale-90 py-0 px-1 bg-rose-950/40 text-rose-300 border border-rose-500/20 uppercase shrink-0">
                              {p.position ? p.position.substring(0, 3) : "DF"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
