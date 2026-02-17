import config
from sqlalchemy import text

def main():
    print("\nMODULE 1: EXTRACTION & TOPOLOGY (RESTORED)")
    engine = config.get_engine()

    with engine.connect() as conn:
        # ---------------------------------------------------------
        # STAGE 1: RAW EXTRACTION (Points, Lines, AND Polygons)
        # ---------------------------------------------------------
        config.run_step(conn, "S1: Resetting Tables", """
            DROP TABLE IF EXISTS 
                gridkit_nodes, gridkit_towers, gridkit_links, gridkit_polygons,
                gridkit_vertices, gridkit_vertex_degree, transformer_vertices CASCADE;
        """)

        # 1. Nodes (Substations & Stations)
        config.run_step(conn, "Extracting Nodes", """
            CREATE TABLE gridkit_nodes AS
            SELECT 
                db_id AS original_id, 
                type, 
                name, 
                COALESCE(voltage, 0) AS voltage, 
                'OSM'::text AS voltage_src, 
                geometry AS geom
            FROM grid_points 
            WHERE type IN ('Substation_Icon', 'Converter');
            CREATE INDEX idx_nodes_geom ON gridkit_nodes USING GIST(geom);
        """)

        # 2. Towers, Poles, & Inline Equipment
        config.run_step(conn, "Extracting Towers", """
            CREATE TABLE gridkit_towers AS
            SELECT 
                db_id AS original_id, 
                type, 
                name, 
                COALESCE(voltage, 0) AS voltage, 
                'OSM'::text AS voltage_src, 
                geometry AS geom
            FROM grid_points 
            WHERE type IN (
                'Tower', 'Monopole_HV', 'Transformer', 'Insulator', 
                'Compensator', 'Circuit Breaker', 'Switch', 
                'Disconnector', 'Mechanical'
            );
            CREATE INDEX idx_towers_geom ON gridkit_towers USING GIST(geom);
        """)

        # 3. Polygons (Substation Areas)
        config.run_step(conn, "Extracting Polygons", """
            CREATE TABLE gridkit_polygons AS
            SELECT 
                db_id AS original_id, 
                type, 
                name, 
                COALESCE(voltage, 0) AS voltage, -- No more regex needed here!
                'OSM'::text AS voltage_src, 
                geometry AS geom
            FROM grid_polygons 
            WHERE type = 'Substation_Area';
            
            CREATE INDEX idx_poly_geom ON gridkit_polygons USING GIST(geom);
        """)
            # 4. Links (Lines)
        config.run_step(conn, "Extracting Links", """
            CREATE TABLE gridkit_links AS
            SELECT db_id AS original_id, type, COALESCE(voltage,0) AS voltage, 
                   'OSM'::text AS voltage_src, (ST_Dump(geometry)).geom::geometry(LineString,3857) AS geom
            FROM grid_lines;
            
            ALTER TABLE gridkit_links ADD COLUMN id SERIAL PRIMARY KEY;
            ALTER TABLE gridkit_links ADD COLUMN source INTEGER, ADD COLUMN target INTEGER;
            ALTER TABLE gridkit_links ADD COLUMN is_synthetic BOOLEAN DEFAULT FALSE;
            ALTER TABLE gridkit_links ADD COLUMN start_geom geometry(Point,3857), ADD COLUMN end_geom geometry(Point,3857);
            
            CREATE INDEX idx_links_geom ON gridkit_links USING GIST(geom);
        """)

        # Force the database to update statistics immediately
        config.run_step(conn, "Updating Statistics", """
            ANALYZE gridkit_nodes;
            ANALYZE gridkit_towers;
            ANALYZE gridkit_polygons;
            ANALYZE gridkit_links;
        """)
        # ---------------------------------------------------------
        # STAGE 2: TOWER SPLITTING
        # ---------------------------------------------------------
        print("\n>>> S2: Tower Splitting (Clustered)")
        
        # 1. Identify which lines hit towers
        config.run_step(conn, "Clustering Towers on Lines", """
            CREATE TEMP TABLE tower_clusters AS
            SELECT l.id AS link_id, ST_Collect(t.geom) AS cluster_geom
            FROM gridkit_links l 
            JOIN gridkit_towers t ON ST_DWithin(l.geom, t.geom, 5) 
            GROUP BY l.id;
        """)

        # 2. Perform the Split
        config.run_step(conn, "Splitting Geometry", """
            CREATE TABLE gridkit_links_split AS
            SELECT l.original_id, l.type, l.voltage, l.voltage_src,
                   (ST_Dump(ST_Split(ST_Snap(l.geom, tc.cluster_geom, 1), tc.cluster_geom))).geom::geometry(LineString,3857) AS geom
            FROM gridkit_links l 
            JOIN tower_clusters tc ON l.id = tc.link_id;
        """)

        # 3. Merge Split Lines with Unchanged Lines
        config.run_step(conn, "Merging & Rebuilding Table", """
            INSERT INTO gridkit_links_split
            SELECT original_id, type, voltage, voltage_src, geom FROM gridkit_links l
            WHERE NOT EXISTS (SELECT 1 FROM tower_clusters tc WHERE tc.link_id = l.id);

            DROP TABLE gridkit_links;
            ALTER TABLE gridkit_links_split RENAME TO gridkit_links;
            
            -- Re-add columns
            ALTER TABLE gridkit_links ADD COLUMN id SERIAL PRIMARY KEY;
            ALTER TABLE gridkit_links ADD COLUMN source INTEGER, ADD COLUMN target INTEGER;
            ALTER TABLE gridkit_links ADD COLUMN is_synthetic BOOLEAN DEFAULT FALSE;
            ALTER TABLE gridkit_links ADD COLUMN start_geom geometry(Point,3857), ADD COLUMN end_geom geometry(Point,3857);
            
            CREATE INDEX idx_links_geom_final ON gridkit_links USING GIST(geom);
            ANALYZE gridkit_links;
        """)

        # ---------------------------------------------------------
        # STAGE 3: PRECOMPUTE ENDPOINTS
        # ---------------------------------------------------------
        config.run_step(conn, "S3: Precomputing Endpoints", """
            UPDATE gridkit_links SET start_geom = ST_StartPoint(geom), end_geom = ST_EndPoint(geom);
            CREATE INDEX idx_start_geom ON gridkit_links USING GIST(start_geom);
            CREATE INDEX idx_end_geom ON gridkit_links USING GIST(end_geom);
            ANALYZE gridkit_links;
        """)

        # ---------------------------------------------------------
        # STAGE 4: SNAPPING (CRITICAL LOGIC RESTORED)
        # ---------------------------------------------------------
        print("\n>>> S4: Batched Snapping (Nodes & Towers)")
        max_id = conn.execute(text("SELECT MAX(id) FROM gridkit_links")).scalar()
        
        # We snap to Nodes (Substations) AND Towers to ensure connectivity
        for tbl, label, dist, col in [
            ('gridkit_nodes', 'Nodes', 50, 'start_geom'), 
            ('gridkit_nodes', 'Nodes', 50, 'end_geom'),
            ('gridkit_towers','Towers', 5, 'start_geom'), 
            ('gridkit_towers','Towers', 5, 'end_geom')
        ]:
            current = 0
            while current <= max_id:
                sql = f"""
                    UPDATE gridkit_links l 
                    SET {col} = n.geom 
                    FROM {tbl} n
                    WHERE l.id > {current} AND l.id <= {current + config.BATCH_SIZE}
                    AND ST_DWithin(l.{col}, n.geom, {dist});
                """
                conn.execute(text(sql))
                conn.commit()
                current += config.BATCH_SIZE
                print(f"     Snap {label}: {min(100, (current/max_id)*100):.1f}%", end="\r")
            print("")

        # Final Geometry Rebuild
        config.run_step(conn, "Rebuilding Lines from Snapped Points", """
            UPDATE gridkit_links 
            SET geom = ST_SetPoint(ST_SetPoint(geom, 0, start_geom), ST_NPoints(geom)-1, end_geom);
        """)

if __name__ == "__main__":
    main()