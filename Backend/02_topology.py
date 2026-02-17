import config
from sqlalchemy import text

def main():
    print("\n MODULE 2: TOPOLOGY & GRAPH BUILDING")
    engine = config.get_engine()

    with engine.connect() as conn:
        
        # ---------------------------------------------------------
        # STAGE 5: BUILD GRAPH VERTICES
        # ---------------------------------------------------------
        # We find every unique point where lines start or end.
        # These become the "Nodes" of our graph.
        
        config.run_step(conn, "S5: Resetting Topology Tables", """
            DROP TABLE IF EXISTS gridkit_vertices, gridkit_vertex_degree, transformer_vertices CASCADE;
        """)

        config.run_step(conn, "S5: Creating Unique Vertices", """
            CREATE TABLE gridkit_vertices AS
            SELECT DISTINCT
                ST_SnapToGrid(pt, 0.001)::geometry(Point,3857) AS the_geom
            FROM (
                SELECT start_geom AS pt FROM gridkit_links
                UNION ALL
                SELECT end_geom FROM gridkit_links
            ) s;

            ALTER TABLE gridkit_vertices ADD COLUMN id SERIAL PRIMARY KEY;
            CREATE INDEX idx_v_geom ON gridkit_vertices USING GIST(the_geom);
            ANALYZE gridkit_vertices;
        """)

        # ---------------------------------------------------------
        # STAGE 5.5: MAP LINES TO VERTICES (BATCHED)
        # ---------------------------------------------------------
        # Now we tell every line: "Your source ID is Vertex X, your target ID is Vertex Y"
        
        print("\n>>> S5.5: Mapping Links to Vertices (The Wiring)")
        max_id = conn.execute(text("SELECT MAX(id) FROM gridkit_links")).scalar()
        
        # 1. Map Source IDs
        print("    Mapping Source Nodes...")
        current = 0
        while current <= max_id:
            sql = f"""
                UPDATE gridkit_links l
                SET source = v.id
                FROM gridkit_vertices v
                WHERE l.id > {current} AND l.id <= {current + config.BATCH_SIZE}
                AND l.start_geom && v.the_geom 
                AND ST_Equals(ST_SnapToGrid(l.start_geom, 0.001), v.the_geom);
            """
            conn.execute(text(sql))
            conn.commit()
            current += config.BATCH_SIZE
            print(f"    Progress: {min(100, (current/max_id)*100):.1f}%", end="\r")
        print("    Source Mapping Complete.")

        # 2. Map Target IDs
        print("    Mapping Target Nodes...")
        current = 0
        while current <= max_id:
            sql = f"""
                UPDATE gridkit_links l
                SET target = v.id
                FROM gridkit_vertices v
                WHERE l.id > {current} AND l.id <= {current + config.BATCH_SIZE}
                AND l.end_geom && v.the_geom 
                AND ST_Equals(ST_SnapToGrid(l.end_geom, 0.001), v.the_geom);
            """
            conn.execute(text(sql))
            conn.commit()
            current += config.BATCH_SIZE
            print(f"     Progress: {min(100, (current/max_id)*100):.1f}%", end="\r")
        print("     Target Mapping Complete.")

        # ---------------------------------------------------------
        # STAGE 6: METADATA GENERATION
        # ---------------------------------------------------------
        print("\n>>> S6: Generating Graph Metadata")

        # 1. Vertex Degree (How many lines touch this point?)
        # Useful for finding dead ends (Degree = 1)
        config.run_step(conn, "Calculating Vertex Degree", """
            CREATE TABLE gridkit_vertex_degree AS
            SELECT vid, COUNT(*) AS degree
            FROM (
                SELECT source AS vid FROM gridkit_links
                UNION ALL
                SELECT target FROM gridkit_links
            ) s
            GROUP BY vid;
            CREATE INDEX idx_v_deg ON gridkit_vertex_degree(vid);
        """)

        # 2. Transformer Flags
        # We identify which vertices are actually Transformers/Switches
        # This helps the voltage logic know where to stop or start.
        config.run_step(conn, "Flagging Transformer Nodes", """
            CREATE TABLE transformer_vertices AS
            SELECT DISTINCT v.id
            FROM gridkit_vertices v
            JOIN gridkit_towers t
              ON ST_DWithin(t.geom, v.the_geom, 1)
            WHERE t.type IN ('Transformer','Switch');
            CREATE INDEX idx_trans_v ON transformer_vertices(id);
        """)
        
        # 3. Critical Indexes for Graph Traversal
        config.run_step(conn, "Indexing Graph Edges", """
            CREATE INDEX IF NOT EXISTS idx_links_source ON gridkit_links(source);
            CREATE INDEX IF NOT EXISTS idx_links_target ON gridkit_links(target);
            ANALYZE gridkit_links;
        """)

if __name__ == "__main__":
    main()