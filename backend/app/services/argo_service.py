import xarray as xr
import numpy as np
import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

# Constants
ACCEPTED_QC = {1, 2}
logger = logging.getLogger(__name__)

class ArgoService:
    def __init__(self, argo_data_dir: str = "data/raw/argo"):
        self.argo_data_dir = argo_data_dir
        self._profiles_cache = None

    def discover_argo_files(self) -> List[str]:
        """Discover all .nc files in the ARGO data directory."""
        argo_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', self.argo_data_dir)
        if not os.path.exists(argo_path):
            return []
        files = []
        for f in os.listdir(argo_path):
            if f.endswith('.nc'):
                files.append(os.path.join(argo_path, f))
        return sorted(files)

    def _is_primary_sampling(self, ds, n_prof_index: int) -> bool:
        """Check if a given N_PROF record is a valid primary physical profile."""
        # Check VERTICAL_SAMPLING_SCHEME if available
        if 'VERTICAL_SAMPLING_SCHEME' in ds.variables:
            scheme = ds['VERTICAL_SAMPLING_SCHEME'].isel(N_PROF=n_prof_index).values
            if isinstance(scheme, bytes):
                scheme = scheme.decode('utf-8')
            if isinstance(scheme, str) and "Primary sampling" in scheme:
                # Additionally, require finite PRES and TEMP
                if self._has_finite_pres_temp(ds, n_prof_index):
                    return True
        return False

    def _has_finite_pres_temp(self, ds, n_prof_index: int) -> bool:
        """Check if both PRES and TEMP have at least one finite value for the given N_PROF index."""
        try:
            pres = ds['PRES'].isel(N_PROF=n_prof_index).values
            temp = ds['TEMP'].isel(N_PROF=n_prof_index).values
            return np.any(np.isfinite(pres)) and np.any(np.isfinite(temp))
        except KeyError:
            return False

    def _get_variable_source(self, ds, n_prof_index: int, var_base: str, data_mode: str) -> str:
        """Determine whether to use raw or adjusted variable based on DATA_MODE and QC."""
        adjusted_var = f"{var_base}_ADJUSTED"
        if data_mode in ['A', 'D'] and adjusted_var in ds.variables:
            # For adjusted variable selection, try to use adjusted variable if it exists
            # Similar to phase8c_collocation.py approach
            return adjusted_var
        # Default to raw
        return var_base

    def _process_profile(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Process a single ARGO file and return the primary profile summary."""
        try:
            ds = xr.open_dataset(file_path, engine="netcdf4")
        except Exception as e:
            logger.warning("Could not open Argo file %s: %s", file_path, e)
            return None

        # Check if N_PROF dimension exists
        if 'N_PROF' not in ds.sizes:
            # Assume single profile
            n_prof_index = 0
            n_prof_count = 1
        else:
            n_prof_count = ds.sizes['N_PROF']
            # Step 1: find first Primary sampling profile with finite PRES+TEMP
            n_prof_index = None
            for i in range(n_prof_count):
                if self._is_primary_sampling(ds, i):
                    n_prof_index = i
                    break
            # Step 2: if no such primary, find first N_PROF with finite PRES+TEMP
            if n_prof_index is None:
                for i in range(n_prof_count):
                    if self._has_finite_pres_temp(ds, i):
                        n_prof_index = i
                        break
            # Step 3: if still none, skip this file
            if n_prof_index is None:
                ds.close()
                return None

        # Extract basic metadata
        try:
            platform_number = ds['PLATFORM_NUMBER'].isel(N_PROF=n_prof_index).item()
            if isinstance(platform_number, bytes):
                platform_number = platform_number.decode('utf-8').strip()
            else:
                platform_number = str(platform_number).strip()
        except KeyError:
            platform_number = "unknown"

        try:
            cycle_number_val = ds['CYCLE_NUMBER'].isel(N_PROF=n_prof_index).item()
            if isinstance(cycle_number_val, bytes):
                cycle_number = cycle_number_val.decode('utf-8').strip()
            else:
                # If it's a float representing an integer, convert to int to remove decimal
                if isinstance(cycle_number_val, (float, np.floating)) and cycle_number_val.is_integer():
                    cycle_number = str(int(cycle_number_val))
                else:
                    cycle_number = str(cycle_number_val).strip()
        except KeyError:
            cycle_number = "0"

        # Observation time from JULD
        try:
            juld_vals = ds['JULD'].isel(N_PROF=n_prof_index).values
            # JULD is days since 1950-01-01, already decoded to datetime64 by xarray
            # Convert to ISO format string without microseconds
            observation_time = str(juld_vals.astype('datetime64[s]'))
        except (KeyError, Exception):
            observation_time = None

        try:
            latitude = float(ds['LATITUDE'].isel(N_PROF=n_prof_index).values)
        except KeyError:
            latitude = None

        try:
            longitude = float(ds['LONGITUDE'].isel(N_PROF=n_prof_index).values)
        except KeyError:
            longitude = None

        try:
            data_mode = ds['DATA_MODE'].isel(N_PROF=n_prof_index).item()
            if isinstance(data_mode, bytes):
                data_mode = data_mode.decode('utf-8').strip()
            else:
                data_mode = str(data_mode).strip()
        except KeyError:
            data_mode = 'R'  # default to real time

        try:
            direction = ds['DIRECTION'].isel(N_PROF=n_prof_index).item()
            if isinstance(direction, bytes):
                direction = direction.decode('utf-8').strip()
            else:
                direction = str(direction).strip()
        except KeyError:
            direction = None

        try:
            sampling_scheme = ds['VERTICAL_SAMPLING_SCHEME'].isel(N_PROF=n_prof_index).item()
            if isinstance(sampling_scheme, bytes):
                sampling_scheme = sampling_scheme.decode('utf-8').strip()
            else:
                sampling_scheme = str(sampling_scheme).strip()
        except KeyError:
            sampling_scheme = None

        # Determine variable sources
        # Pressure always uses raw PRES: the validated Phase 8C baseline
        # (phase8c_collocation.py) derives the vertical coordinate from raw
        # PRES even for DATA_MODE=A/D profiles; using PRES_ADJUSTED shifts
        # depths and changes vertical pair selection.
        pressure_source = 'PRES'
        temperature_source = self._get_variable_source(ds, n_prof_index, 'TEMP', data_mode)
        salinity_source = self._get_variable_source(ds, n_prof_index, 'PSAL', data_mode)

        # Extract pressure, temperature, salinity arrays using the selected source
        try:
            pressure = ds[pressure_source].isel(N_PROF=n_prof_index).values
        except KeyError:
            pressure = np.array([])

        try:
            temperature = ds[temperature_source].isel(N_PROF=n_prof_index).values
        except KeyError:
            temperature = np.array([])

        try:
            salinity = ds[salinity_source].isel(N_PROF=n_prof_index).values
        except KeyError:
            salinity = np.array([])

        # Extract QC arrays and convert to float, handling strings/bytes and missing values
        def _qc_to_float(arr):
            """Safely convert QC array to float, handling strings/bytes and missing values."""
            try:
                if arr.dtype.kind in 'SU':  # string or unicode
                    float_arr = []
                    for x in arr.flat:
                        try:
                            float_arr.append(float(x.decode('utf-8') if isinstance(x, bytes) else x))
                        except ValueError:
                            float_arr.append(np.nan)
                    return np.array(float_arr).reshape(arr.shape)
                else:
                    return arr.astype(float)
            except Exception:
                return np.full_like(arr, np.nan, dtype=float)

        # Pressure QC
        try:
            pressure_qc_raw = ds['PRES_QC'].isel(N_PROF=n_prof_index).values
            # Only use QC data if it's not all NaN/fill values
            def safe_isnan_check(arr):
                """Safely check if array contains NaN values"""
                try:
                    return np.all(np.isnan(arr))
                except (TypeError, ValueError):
                    # If isnan fails (e.g., for integer arrays), check for fill values
                    # Common fill values in ARGO QC: _FillValue, missing_value, or specific integers like 127
                    try:
                        # Check if array is integer type and contains common fill values
                        if arr.dtype.kind in ['i', 'u']:  # integer types
                            # Common fill values for QC bytes
                            fill_values = [127, 255, -1, np.iinfo(arr.dtype).max, np.iinfo(arr.dtype).min]
                            return np.all(np.isin(arr, fill_values))
                        else:
                            # For other types, assume not all NaN if we can't check
                            return False
                    except:
                        return False

            if not safe_isnan_check(pressure_qc_raw):
                try:
                    pressure_qc = np.nan_to_num(pressure_qc_raw.astype(float), nan=2).astype(int)
                except (ValueError, TypeError):
                    # If conversion fails, assume all good
                    pressure_qc = np.ones_like(pressure, dtype=int) * 2
            else:
                # QC pressure is all NaN/fill, assuming good quality (2)
                pressure_qc = np.ones_like(pressure, dtype=int) * 2
        except KeyError:
            # No QC pressure variable found, assuming good quality (2)
            pressure_qc = np.ones_like(pressure, dtype=int) * 2

        # Temperature QC
        try:
            temperature_qc_raw = ds['TEMP_QC'].isel(N_PROF=n_prof_index).values
            if not safe_isnan_check(temperature_qc_raw):
                try:
                    temperature_qc = np.nan_to_num(temperature_qc_raw.astype(float), nan=2).astype(int)
                except (ValueError, TypeError):
                    # If conversion fails, assume all good
                    temperature_qc = np.ones_like(temperature, dtype=int) * 2
            else:
                # QC temperature is all NaN/fill, assuming good quality (2)
                temperature_qc = np.ones_like(temperature, dtype=int) * 2
        except KeyError:
            # No QC temperature variable found, assuming good quality (2)
            temperature_qc = np.ones_like(temperature, dtype=int) * 2

        # Salinity QC
        try:
            salinity_qc_raw = ds['PSAL_QC'].isel(N_PROF=n_prof_index).values
            if not safe_isnan_check(salinity_qc_raw):
                try:
                    salinity_qc = np.nan_to_num(salinity_qc_raw.astype(float), nan=2).astype(int)
                except (ValueError, TypeError):
                    # If conversion fails, assume all good
                    salinity_qc = np.ones_like(salinity, dtype=int) * 2
            else:
                # QC salinity is all NaN/fill, assuming good quality (2)
                salinity_qc = np.ones_like(salinity, dtype=int) * 2
        except KeyError:
            # No QC salinity variable found, assuming good quality (2)
            salinity_qc = np.ones_like(salinity, dtype=int) * 2

        # Close dataset
        ds.close()

        # If no data, return None
        if len(pressure) == 0 or len(temperature) == 0 or len(salinity) == 0:
            return None

        # Compute usable mask
        usable = (
            np.isfinite(pressure) &
            np.isfinite(temperature) &
            np.isfinite(salinity) &
            np.isin(pressure_qc, list(ACCEPTED_QC)) &
            np.isin(temperature_qc, list(ACCEPTED_QC)) &
            np.isin(salinity_qc, list(ACCEPTED_QC))
        )

        # Compute depth using GSW for usable levels (we'll compute for all, but mark unusable)
        try:
            import gsw
            depth = -gsw.z_from_p(pressure, latitude)
        except Exception:
            # If GSW fails, set depth to NaN
            depth = np.full_like(pressure, np.nan)

        # Compute practical salinity (same as salinity for PSAL)
        practical_salinity = salinity

        # Compute potential temperature for usable levels
        try:
            import gsw
            # Absolute Salinity
            SA = gsw.SA_from_SP(practical_salinity, pressure, longitude, latitude)
            # Potential temperature
            pt0 = gsw.pt0_from_t(SA, temperature, pressure)
        except Exception:
            # If GSW fails, set to NaN
            SA = np.full_like(pressure, np.nan)
            pt0 = np.full_like(pressure, np.nan)

        # Build levels list
        levels = []
        for i in range(len(pressure)):
            level = {
                "level_index": i,
                "pressure_dbar": float(pressure[i]) if np.isfinite(pressure[i]) else None,
                "depth_m": float(depth[i]) if np.isfinite(depth[i]) else None,
                "in_situ_temperature_c": float(temperature[i]) if np.isfinite(temperature[i]) else None,
                "potential_temperature_c": float(pt0[i]) if np.isfinite(pt0[i]) else None,
                "practical_salinity": float(practical_salinity[i]) if np.isfinite(practical_salinity[i]) else None,
                "pressure_qc": int(pressure_qc[i]) if not np.isnan(pressure_qc[i]) else None,
                "temperature_qc": int(temperature_qc[i]) if not np.isnan(temperature_qc[i]) else None,
                "salinity_qc": int(salinity_qc[i]) if not np.isnan(salinity_qc[i]) else None,
                "usable": bool(usable[i])
            }
            levels.append(level)

        # Compute summary statistics (only for usable levels)
        usable_pressure = pressure[usable]
        usable_temperature = temperature[usable]
        usable_salinity = salinity[usable]
        usable_depth = depth[usable]

        summary = {
            "profile_id": f"{platform_number}-{cycle_number}",
            "platform_number": platform_number,
            "cycle_number": cycle_number,
            "observation_time": observation_time,
            "latitude": latitude,
            "longitude": longitude,
            "data_mode": data_mode,
            "direction": direction,
            "sampling_scheme": sampling_scheme,
            "level_count": len(levels),
            "usable_level_count": int(np.sum(usable)),
            "pressure_min_dbar": float(np.min(usable_pressure)) if len(usable_pressure) > 0 else None,
            "pressure_max_dbar": float(np.max(usable_pressure)) if len(usable_pressure) > 0 else None,
            "depth_min_m": float(np.min(usable_depth)) if len(usable_depth) > 0 else None,
            "depth_max_m": float(np.max(usable_depth)) if len(usable_depth) > 0 else None,
            "temperature_min_c": float(np.min(usable_temperature)) if len(usable_temperature) > 0 else None,
            "temperature_max_c": float(np.max(usable_temperature)) if len(usable_temperature) > 0 else None,
            "salinity_min": float(np.min(usable_salinity)) if len(usable_salinity) > 0 else None,
            "salinity_max": float(np.max(usable_salinity)) if len(usable_salinity) > 0 else None,
            "pressure_source": pressure_source,
            "temperature_source": temperature_source,
            "salinity_source": salinity_source,
            # Note: we store the source without _ADJUSTED for summary, but we can keep the full source if needed
            # For now, we'll store the base name (PRES, TEMP, PSAL) as per the example
            # But we need to know whether raw or adjusted was used. Let's store the full source name.
            # Actually, the example expects: "PRES" or "PRES_ADJUSTED", etc.
            # Let's change: store the full source variable name.
            "pressure_source_full": pressure_source,
            "temperature_source_full": temperature_source,
            "salinity_source_full": salinity_source,
            "provider": "Argo GDAC / IFREMER",
            "source_format": "NetCDF",
            "standard": "Argo profile format",
            "provenance": {
                "provider": "Argo GDAC / IFREMER",
                "source_format": "NetCDF",
                "standard": "Argo profile format"
            }
        }

        return {
            "summary": summary,
            "levels": levels
        }

    def get_argo_profiles(self) -> List[Dict[str, Any]]:
        """Get summaries of all discoverable primary ARGO profiles."""
        if self._profiles_cache is not None:
            return self._profiles_cache

        files = self.discover_argo_files()
        profiles = []
        for f in files:
            profile = self._process_profile(f)
            if profile is not None:
                profiles.append(profile["summary"])
        self._profiles_cache = profiles
        return profiles

    def get_argo_profile(self, profile_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific ARGO profile by profile_id (platform-cycle)."""
        files = self.discover_argo_files()
        for f in files:
            profile = self._process_profile(f)
            if profile is not None and profile["summary"]["profile_id"] == profile_id:
                return profile
        return None
