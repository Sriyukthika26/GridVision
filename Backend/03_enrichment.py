import config
from sqlalchemy import text

def main():
    print("\n MODULE 3: ENRICHMENT")
    engine = config.get_engine()

    with engine.connect() as conn:
        # ---------------------------------------------------------
        # STAGE 7: INDEXED BRIDGING
        # ---------------------------------------------------------
        print("\n>>> S7: Voltage-Constrained Bridging")
        conn.execute(text("DELETE FROM gridkit_links WHERE is_synthetic = TRUE;"))
        conn.execute(text("DROP TABLE IF EXISTS temp_dead_ends;"))
        conn.commit()

        config.run_step(conn, "Indexing Dead Ends", """
            CREATE TEMP TABLE temp_dead_ends AS
            SELECT v.id, v.the_geom, l.voltage FROM gridkit_vertices v
            JOIN gridkit_vertex_degree d ON v.id = d.vid JOIN gridkit_links l ON (l.source = v.id OR l.target = v.id)
            GROUP BY v.id, v.the_geom, l.voltage HAVING COUNT(*) = 1 AND l.voltage > 0;
            CREATE INDEX idx_temp_de_geom ON temp_dead_ends USING GIST(the_geom);
            ANALYZE temp_dead_ends;
        """)

        config.run_step(conn, "Connecting Bridges", """
            INSERT INTO gridkit_links (type, voltage, voltage_src, is_synthetic, geom, source, target)
            SELECT 'synthetic', d1.voltage, 'Synthetic', TRUE, ST_MakeLine(d1.the_geom, d2.the_geom), d1.id, d2.id
            FROM temp_dead_ends d1 JOIN temp_dead_ends d2 
            ON d1.id < d2.id AND d1.voltage = d2.voltage 
            AND d1.the_geom && d2.the_geom AND ST_DWithin(d1.the_geom, d2.the_geom, 200)
            WHERE NOT EXISTS (
                SELECT 1 FROM gridkit_links x WHERE (x.source = d1.id AND x.target = d2.id) OR (x.source = d2.id AND x.target = d1.id)
            );
        """)
        conn.execute(text("DROP TABLE IF EXISTS temp_dead_ends;"))
        conn.commit()

        # ---------------------------------------------------------
        # STAGE 7.5: SEEDING (REVERSE INFERENCE)
        # ---------------------------------------------------------

        print("\n>>> S7.5: Seeding Lines from Assets")

        # 1. If a line touches a known voltage Node (Substation), take that voltage.
        config.run_step(conn, "Seeding: From Nodes", """
            UPDATE gridkit_links l
            SET voltage = n.voltage, voltage_src = 'Inferred-from-Node'
            FROM gridkit_nodes n
            WHERE l.voltage = 0 
              AND n.voltage > 0
              AND ST_DWithin(l.geom, n.geom, 10);
        """)

        # 2. If a line touches a known voltage Tower, take that voltage.
        config.run_step(conn, "Seeding: From Towers", """
            UPDATE gridkit_links l
            SET voltage = t.voltage, voltage_src = 'Inferred-from-Tower'
            FROM gridkit_towers t
            WHERE l.voltage = 0 
              AND t.voltage > 0
              AND ST_DWithin(l.geom, t.geom, 5);
        """)

        # ---------------------------------------------------------
        # STAGE 8: LINE PROPAGATION (FORWARD INFERENCE)
        # ---------------------------------------------------------

        print("\n>>> S8: Line Voltage Propagation")

        for i in range(3):
            config.run_step(conn, f"Pass {i+1}", """
                WITH votes AS (
                    SELECT a.id AS tid, b.voltage, COUNT(*) AS w
                    FROM gridkit_links a JOIN gridkit_links b 
                    ON (a.source = b.source OR a.source = b.target OR a.target = b.source OR a.target = b.target)
                    LEFT JOIN transformer_vertices tv ON a.source = tv.id OR a.target = tv.id
                    WHERE a.voltage = 0 AND b.voltage > 0 AND b.is_synthetic = FALSE AND tv.id IS NULL
                    GROUP BY a.id, b.voltage
                ),
                best AS (SELECT DISTINCT ON (tid) tid, voltage FROM votes ORDER BY tid, w DESC)
                UPDATE gridkit_links g SET voltage = best.voltage, voltage_src = 'Graph-Inferred'
                FROM best WHERE g.id = best.tid;
            """)

        # ---------------------------------------------------------
        # STAGE 8.5: ASSET INFERENCE (SPLASH BACK)
        # ---------------------------------------------------------

        print("\n>>> S8.5: Propagating Voltage to All Assets")

        config.run_step(conn, "Inferring: Towers", """
            UPDATE gridkit_towers t
            SET voltage = l.voltage, voltage_src = 'Inferred-from-Line'
            FROM gridkit_links l
            WHERE t.voltage = 0 AND l.voltage > 0 AND ST_DWithin(t.geom, l.geom, 1);
        """)

        config.run_step(conn, "Inferring: Nodes", """
            UPDATE gridkit_nodes n
            SET voltage = l.voltage, voltage_src = 'Inferred-from-Line'
            FROM gridkit_links l
            WHERE n.voltage = 0 AND l.voltage > 0 AND ST_DWithin(n.geom, l.geom, 10);
        """)

        config.run_step(conn, "Inferring: Polygons", """
            UPDATE gridkit_polygons p
            SET voltage = l.voltage, voltage_src = 'Inferred-from-Line'
            FROM gridkit_links l
            WHERE p.voltage = 0 AND l.voltage > 0 AND ST_Intersects(p.geom, l.geom);
        """)

        # ---------------------------------------------------------
        # STAGE 9: COSTS
        # ---------------------------------------------------------
        print("\n>>> S9: Calculating Costs")
        config.run_step(conn, "Adding Columns", """
            ALTER TABLE gridkit_links ADD COLUMN IF NOT EXISTS cost DOUBLE PRECISION, 
            ADD COLUMN IF NOT EXISTS reverse_cost DOUBLE PRECISION;
        """)
        
        config.run_step(conn, "Calculating Costs", """
            UPDATE gridkit_links SET 
                cost = ST_Length(geom) * CASE WHEN is_synthetic THEN 100.0 ELSE 1.0 END,
                reverse_cost = ST_Length(geom) * CASE WHEN is_synthetic THEN 100.0 ELSE 1.0 END
            WHERE cost IS NULL;
        """)
        config.run_step(conn, "Indexing Costs", "CREATE INDEX IF NOT EXISTS idx_cost ON gridkit_links(cost);")

if __name__ == "__main__":
    main()