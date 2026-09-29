"""File-derived adapter for the audited Spray trajectoryProfile mission."""
from datetime import timezone
from pathlib import Path
import math
import netCDF4
import numpy as np

DATA_PATH = Path(__file__).resolve().parents[3] / "data/raw/glider/19607101/SPRAY-FRSQ-19607101-sp071-20190602T1209.nc"
SCIENCE = ("temperature", "salinity", "chlorophyll_a")

def finite(v):
    try:
        v = float(v)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError): return None

def haversine(a, b, c, d):
    a, b, c, d = map(math.radians, (a, b, c, d)); x, y = c-a, d-b
    return 6371.0088 * 2 * math.atan2(math.sqrt(math.sin(x/2)**2 + math.cos(a)*math.cos(c)*math.sin(y/2)**2), math.sqrt(1-(math.sin(x/2)**2 + math.cos(a)*math.cos(c)*math.sin(y/2)**2)))

class GliderService:
    def __init__(self): self.ds = None; self.offsets = None
    def _ds(self):
        if self.ds is None:
            if not DATA_PATH.is_file(): raise FileNotFoundError("Required local glider NetCDF file is unavailable")
            self.ds = netCDF4.Dataset(DATA_PATH)
        return self.ds
    def _a(self, name, sel=None):
        v = self._ds()[name][sel] if sel is not None else self._ds()[name][:]
        return np.asarray(np.ma.filled(v, np.nan))
    def _identity(self):
        d=self._ds(); return {"deployment_id":str(getattr(d,"internal_mission_identifier",getattr(d,"mission_id",""))),"trajectory_id":str(getattr(d,"id",""))}
    def _check(self, mission):
        if mission != self._identity()["deployment_id"]: raise KeyError(mission)
    def _offsets(self):
        if self.offsets is None:
            self.offsets=np.r_[0,np.cumsum(self._a("row_size").astype(int))]
            if self.offsets[-1] != len(self._ds().dimensions["obs"]): raise ValueError("row_size does not map to obs")
        return self.offsets
    def _slice(self,i):
        o=self._offsets()
        if i < 0 or i >= len(o)-1: raise IndexError(i)
        return slice(int(o[i]),int(o[i+1]))
    def _time(self,i):
        v=self._ds()["time"]; return netCDF4.num2date(v[i],v.units,getattr(v,"calendar","standard")).isoformat() + "Z"
    def _mask(self,s):
        return np.logical_or.reduce([(self._a(n+"_qc",s)==1)&np.isfinite(self._a(n,s)) for n in SCIENCE])
    def _summary(self,i):
        s=self._slice(i); z=self._a("depth",s); valid=z[np.isfinite(z)]
        return {"profile_index":i,"profile_time":self._time(i),"latitude":float(self._ds()["latitude"][i]),"longitude":float(self._ds()["longitude"][i]),"total_observation_count":s.stop-s.start,"usable_observation_count":int(self._mask(s).sum()),"depth_min_m":finite(valid.min()) if valid.size else None,"depth_max_m":finite(valid.max()) if valid.size else None}
    def _distances(self):
        lat,lon=self._a("latitude"),self._a("longitude"); out=[0.]; total=0.
        for i in range(1,len(lat)): total+=haversine(lat[i-1],lon[i-1],lat[i],lon[i]); out.append(total)
        return out
    def list_missions(self): return [self.mission_summary()]
    def mission_summary(self):
        d=self._ds(); lat,lon,z=self._a("latitude"),self._a("longitude"),self._a("depth"); z=z[np.isfinite(z)]; ident=self._identity()
        return {"mission_id":ident["deployment_id"],**ident,"profile_count":len(d.dimensions["profile"]),"observation_count":len(d.dimensions["obs"]),"start_time":self._time(0),"end_time":self._time(len(d.dimensions["profile"])-1),"min_latitude":float(lat.min()),"max_latitude":float(lat.max()),"min_longitude":float(lon.min()),"max_longitude":float(lon.max()),"min_depth_m":finite(z.min()),"max_depth_m":finite(z.max()),"available_variables":[n for n in (*SCIENCE,"pressure","depth","u","v") if n in d.variables],"source":"Spray science-quality TrajectoryProfile NetCDF","feature_type":str(getattr(d,"featureType",""))}
    def mission_detail(self,mission):
        self._check(mission); d=self._ds(); meta={n:{k:getattr(d[n],k,None) for k in ("units","standard_name","long_name","comment")} for n in (*SCIENCE,"pressure","depth","u","v") if n in d.variables}; flags={}
        for n in SCIENCE:
            x,c=np.unique(self._a(n+"_qc"),return_counts=True); flags[n]={str(int(a)):int(b) for a,b in zip(x,c)}
        return {**self.mission_summary(),"institution":getattr(d,"institution",None),"coordinate_policy":{"mission_bounds":"profile latitude/longitude midpoint coordinates","trajectory":"profile latitude/longitude midpoint coordinates","profile_markers":"profile latitude/longitude midpoint coordinates","observation_coordinates":"latitude_obs/longitude_obs are estimated subsurface positions"},"qc_flags":flags,"variable_metadata":meta,"provenance":{"file":DATA_PATH.name,"profile_mapping":"CF contiguous ragged array: row_size defines consecutive obs rows","depth_policy":"source depth; no pressure conversion","model_comparison":"not available: 2019 mission and 2026 model are not co-temporal"}}
    def trajectory(self,mission):
        self._check(mission); distances=self._distances(); return [{**self._summary(i),"along_track_distance_km":distances[i]} for i in range(len(self._ds().dimensions["profile"]))]
    def profile_summary(self,mission,i): self._check(mission); return self._summary(i)
    def profile_detail(self,mission,i):
        self._check(mission); summary=self._summary(i); s=self._slice(i); data={n:self._a(n,s) for n in ("pressure","depth",*SCIENCE,*(n+"_qc" for n in SCIENCE))}; levels=[]
        for j in range(summary["total_observation_count"]):
            row={"observation_index":s.start+j,"pressure_dbar":finite(data["pressure"][j]),"depth_m":finite(data["depth"][j])}
            for n in SCIENCE:
                q=data[n+"_qc"][j]; row[n]=finite(data[n][j]) if q==1 and np.isfinite(data[n][j]) else None; row[n+"_qc"]=int(q) if np.isfinite(q) else None
            if any(row[n] is not None for n in SCIENCE): levels.append(row)
        levels.sort(key=lambda x:float("inf") if x["depth_m"] is None else x["depth_m"])
        return {**summary,"rejected_observation_count":summary["total_observation_count"]-summary["usable_observation_count"],"levels":levels,"variable_units":{n:getattr(self._ds()[n],"units",None) for n in (*SCIENCE,"pressure","depth")},"qc_policy":"A value is included only when that variable's file-defined QC flag equals 1.","provenance":{"file":DATA_PATH.name,"depth_source":"depth"}}
    def curtain(self,mission,variable,depth_bin_m=10.):
        self._check(mission)
        if variable not in SCIENCE: raise ValueError(variable)
        if not math.isfinite(depth_bin_m) or not 0<depth_bin_m<=200: raise ValueError("depth_bin_m must be between 0 and 200")
        z,x,q=self._a("depth"),self._a(variable),self._a(variable+"_qc"); good=(q==1)&np.isfinite(x)&np.isfinite(z); top=math.ceil(float(z[good].max())/depth_bin_m)*depth_bin_m; edges=np.arange(0,top+depth_bin_m,depth_bin_m); centers=((edges[:-1]+edges[1:])/2).tolist(); grid=[]
        for i in range(len(self._ds().dimensions["profile"])):
            s=self._slice(i); row=[None]*len(centers); mask=good[s]
            if mask.any():
                bins=np.clip(np.digitize(z[s][mask],edges)-1,0,len(centers)-1)
                for b in np.unique(bins): row[int(b)]=float(np.mean(x[s][mask][bins==b]))
            grid.append(row)
        t=self.trajectory(mission); count=sum(v is not None for r in grid for v in r)
        return {"variable":variable,"profile_indices":list(range(len(grid))),"profile_times":[p["profile_time"] for p in t],"profile_coordinates":[(p["latitude"],p["longitude"]) for p in t],"along_track_distance_km":[p["along_track_distance_km"] for p in t],"depth_bin_edges_m":edges.tolist(),"depth_bin_centers_m":centers,"values":grid,"units":getattr(self._ds()[variable],"units",None),"qc_policy":"file-defined QC == 1 only","aggregation_method":"mean of accepted observed values within each profile/depth bin; no horizontal interpolation","finite_cell_count":count,"null_cell_count":len(grid)*len(centers)-count,"provenance":{"file":DATA_PATH.name,"mode":"OBSERVED / BINNED","depth_source":"depth"}}
    def cleanup(self):
        if self.ds: self.ds.close(); self.ds=None
