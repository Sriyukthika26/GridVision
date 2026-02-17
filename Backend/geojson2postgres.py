import json
import geopandas as gpd
from shapely.geometry import shape
from sqlalchemy import create_engine, text
import config

INPUT_FILE = "IndiaTransmissionLines.geojson"

engine = config.get_engine()

def safe_load_and_split():
    print(f">>> 1/5 Reading Raw JSON: {INPUT_FILE}...")
    
    with open(INPUT_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Buckets for different asset types
    points_list = []
    lines_list = []
    polys_list = []

    print(">>> 2/5 Processing Features...")
    for i, feature in enumerate(data['features']):
        props = feature.get('properties', {})
        geom = feature.get('geometry')
        
        if not geom: continue

        clean_props = {
            'osm_id': props.get('id'), 
            'type': props.get('type'),     
            'voltage': props.get('voltage'),
            'operator': props.get('operator'),
            'name': props.get('name'),
            'substation': props.get('substation'),
            'circuits': props.get('circuits'),
            'usage': props.get('usage')
        }

        # 2. GEOMETRY FIX (The "Unclosed Ring" Patch)
        try:
            if geom['type'] == 'Polygon':
                for ring in geom['coordinates']:
                    if ring[0] != ring[-1]:
                        ring.append(ring[0]) 
            
            # Convert to Shapely geometry
            shp = shape(geom)
            if not shp.is_valid:
                shp = shp.buffer(0) 
            if shp.geom_type == 'Point':
                points_list.append({'geometry': shp, **clean_props})
            elif shp.geom_type in ['LineString', 'MultiLineString']:
                lines_list.append({'geometry': shp, **clean_props})
            elif shp.geom_type in ['Polygon', 'MultiPolygon']:
                polys_list.append({'geometry': shp, **clean_props})
                
        except Exception:
            continue 

    # Create GeoDataFrames
    gdf_pts = gpd.GeoDataFrame(points_list, crs="EPSG:4326")
    gdf_lns = gpd.GeoDataFrame(lines_list, crs="EPSG:4326")
    gdf_pol = gpd.GeoDataFrame(polys_list, crs="EPSG:4326")

    print(f"    - Points (Towers/Substations): {len(gdf_pts)}")
    print(f"    - Lines (Cables): {len(gdf_lns)}")
    print(f"    - Polygons (Areas): {len(gdf_pol)}")

    # --- UPLOAD TO POSTGRES ---
    print(">>> 3/5 Uploading to PostGIS...")

    def upload(gdf, table_name):
        if not gdf.empty:
            gdf = gdf.to_crs(epsg=3857)
            gdf.to_postgis(table_name, engine, if_exists='replace', index=False)
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN db_id SERIAL PRIMARY KEY;"))
                conn.execute(text(f"CREATE INDEX idx_{table_name}_osmid ON {table_name}(osm_id);"))
                conn.execute(text(f"CREATE INDEX idx_{table_name}_geom ON {table_name} USING GIST(geometry);"))
                conn.commit()
            print(f"     Created {table_name}")

    upload(gdf_pts, "grid_points")
    upload(gdf_lns, "grid_lines")
    upload(gdf_pol, "grid_polygons")

    print(">>> 4/5 Optimizing Data Types...")

    with engine.connect() as conn:
        for table in ["grid_points", "grid_lines"]:
            sql = f"""
                UPDATE {table} 
                SET voltage = NULL 
                WHERE voltage = 'Unknown' OR voltage = '';
                
                -- Try to convert voltage to integer for sorting
                ALTER TABLE {table} 
                ALTER COLUMN voltage TYPE integer 
                USING (CASE WHEN voltage IS NULL THEN NULL ELSE voltage::integer END);
            """
            try:
                conn.execute(text(sql))
                conn.commit()
            except Exception as e:
                print(f"     Warning: Could not convert voltage to integer ({e})")

    print(">>> SUCCESS!  Database is ready.")

if __name__ == "__main__":
    safe_load_and_split()