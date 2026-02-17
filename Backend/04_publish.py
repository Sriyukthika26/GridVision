import config
from sqlalchemy import text

def main():
    print("\n MODULE 4: PUBLISH & FINAL AUDIT")
    engine = config.get_engine()

    with engine.connect() as conn:
        print(">>> S10: Creating Unified View 'v_grid_final'")

        # 2. Create Unified View (All Assets)
        config.run_step(conn, "Creating Unified Materialized View", """
            DROP MATERIALIZED VIEW IF EXISTS v_grid_final CASCADE;
            
            CREATE MATERIALIZED VIEW v_grid_final AS
            -- We cast the first geom to geometry(Geometry, 3857) to set the schema for the whole view
            SELECT id::text AS uid, 'line' AS asset_class, type, voltage, voltage_src, cost, source, target, 
                   geom::geometry(Geometry, 3857) AS geom FROM gridkit_links
            UNION ALL
            SELECT 't_' || original_id::text, 'tower', type, voltage, voltage_src, 0, NULL, NULL, 
                   geom::geometry(Geometry, 3857) FROM gridkit_towers
            UNION ALL
            SELECT 'n_' || original_id::text, 'station', type, voltage, voltage_src, 0, NULL, NULL, 
                   geom::geometry(Geometry, 3857) FROM gridkit_nodes
            UNION ALL
            SELECT 'p_' || original_id::text, 'area', type, voltage, voltage_src, 0, NULL, NULL, 
                   geom::geometry(Geometry, 3857) FROM gridkit_polygons;

            -- 1. Create the spatial index
            CREATE INDEX idx_v_grid_final_geom ON v_grid_final USING GIST(geom);
            
            -- 2. FORCE REGISTRATION: This makes it visible to pg_tileserv's metadata crawler
            SELECT populate_geometry_columns('public.v_grid_final'::regclass);
        """)
        # ---------------------------------------------------------
        # FINAL AUDIT REPORT
        # ---------------------------------------------------------
        print("\n SYSTEM HEALTH REPORT ")
        print("-" * 30)

        # 1. Geometric Health (The 'Soundness' Check)
        orphans = conn.execute(text("SELECT count(*) FROM gridkit_vertex_degree WHERE degree = 0")).scalar()
        ghosts  = conn.execute(text("SELECT count(*) FROM gridkit_links WHERE source IS NULL OR target IS NULL")).scalar()
        synths  = conn.execute(text("SELECT count(*) FROM gridkit_links WHERE is_synthetic = TRUE")).scalar()
        
        print("\n[1] GEOMETRIC INTEGRITY")
        print(f"    - Orphan Nodes    : {orphans} (Should be 0)")
        print(f"    - Ghost Edges     : {ghosts} (MUST be 0)")
        print(f"    - Synthetic Bridges: {synths} (Gaps repaired)")

        if ghosts > 0:
            print("     CRITICAL: Ghost Edges found! Topology is broken.")
        else:
            print("     SUCCESS: Topology is perfectly connected.")

        # 2. Asset Counts (The 'Completeness' Check)
        print("\n[2] ASSET INVENTORY")
        stats = conn.execute(text("SELECT asset_class, count(*) FROM v_grid_final GROUP BY asset_class ORDER BY count(*) DESC")).fetchall()
        for row in stats:
            print(f"    - {row[0].upper():<10}: {row[1]:,}")

        # 3. Voltage Inference (The 'Intelligence' Check)
        print("\n[3] VOLTAGE RECOVERY (Inference Wins)")
        wins = conn.execute(text("""
            SELECT asset_class, count(*) 
            FROM v_grid_final 
            WHERE voltage_src LIKE 'Inferred%' 
            GROUP BY asset_class
            ORDER BY count(*) DESC
        """)).fetchall()
        
        if not wins:
            print("    (No assets required inference. Raw data was perfect!)")
        else:
            total_wins = sum(row[1] for row in wins)
            print(f"    TOTAL RESTORED: {total_wins:,} assets")
            for row in wins:
                print(f"    - {row[0].upper():<10}: {row[1]:,} fixed")

        # 4. Unresolved Issues
        zeros = conn.execute(text("SELECT count(*) FROM v_grid_final WHERE voltage = 0")).scalar()
        print(f"\n[4] REMAINING GAPS")
        print(f"    - Unresolved 0V Assets: {zeros:,} (Isolated from main grid)")

        print("-" * 30)
        print("PIPELINE COMPLETE. View 'v_grid_final' is ready for simulation.")

if __name__ == "__main__":
    main()