const BASE = '/api/observations/gliders'
export type GliderVariable = 'temperature' | 'salinity' | 'chlorophyll_a'
export interface GliderMission { mission_id:string; deployment_id:string; trajectory_id:string; profile_count:number; observation_count:number; start_time:string; end_time:string; min_latitude:number; max_latitude:number; min_longitude:number; max_longitude:number; min_depth_m:number|null; max_depth_m:number|null; available_variables:string[]; source:string; feature_type:string }
export interface GliderPoint { profile_index:number; profile_time:string; latitude:number; longitude:number; along_track_distance_km:number; total_observation_count:number; usable_observation_count:number; depth_min_m:number|null; depth_max_m:number|null }
export interface GliderLevel { observation_index:number; pressure_dbar:number|null; depth_m:number|null; temperature:number|null; salinity:number|null; chlorophyll_a:number|null; temperature_qc:number|null; salinity_qc:number|null; chlorophyll_a_qc:number|null }
export interface GliderProfile extends GliderPoint { rejected_observation_count:number; levels:GliderLevel[]; variable_units:Record<string,string|null>; qc_policy:string; provenance:Record<string,unknown> }
export interface GliderCurtain { variable:GliderVariable; profile_indices:number[]; profile_times:string[]; profile_coordinates:[number,number][]; along_track_distance_km:number[]; depth_bin_edges_m:number[]; depth_bin_centers_m:number[]; values:(number|null)[][]; units:string|null; qc_policy:string; aggregation_method:string; finite_cell_count:number; null_cell_count:number; provenance:Record<string,unknown> }
async function get<T>(path:string, signal?:AbortSignal):Promise<T>{const r=await fetch(`${BASE}${path}`,{signal});if(!r.ok)throw new Error(`Glider request failed: ${r.status}`);return r.json() as Promise<T>}
export const listGliderMissions=(signal?:AbortSignal)=>get<GliderMission[]>('',signal)
export const getGliderMission=(id:string,signal?:AbortSignal)=>get<GliderMission>(`/${encodeURIComponent(id)}`,signal)
export const getGliderTrajectory=(id:string,signal?:AbortSignal)=>get<GliderPoint[]>(`/${encodeURIComponent(id)}/trajectory`,signal)
export const getGliderProfile=(id:string,index:number,signal?:AbortSignal)=>get<GliderProfile>(`/${encodeURIComponent(id)}/profiles/${index}`,signal)
export const getGliderProfileSummary=(id:string,index:number,signal?:AbortSignal)=>get<GliderPoint>(`/${encodeURIComponent(id)}/profiles/${index}/summary`,signal)
export const getGliderCurtain=(id:string,variable:GliderVariable,depthBinM=20,signal?:AbortSignal)=>get<GliderCurtain>(`/${encodeURIComponent(id)}/curtain?variable=${variable}&depth_bin_m=${depthBinM}`,signal)
