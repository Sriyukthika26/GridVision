from dotenv import load_dotenv
from sqlalchemy import create_engine
import time
import os

load_dotenv()

DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME     = os.getenv("DB_NAME", "powergrid")
DB_PORT     = os.getenv("DB_PORT", "5433")
DB_USER     = os.getenv("DB_USER", "postgres")
DB_HOST     = os.getenv("DB_HOST", "localhost")
BATCH_SIZE  = 75000 

def get_engine():
    if not DB_PASSWORD:
        raise ValueError("DB_PASSWORD not found in .env file!")
        
    db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    return create_engine(db_url, future=True)


def run_step(conn, title, sql, params=None):
    print(f"\n>>> {title}")
    start = time.time()
    try:
       
        if isinstance(sql, str):
            from sqlalchemy import text
            result = conn.execute(text(sql), params or {})
        else:
            result = conn.execute(sql, params or {})
            
        conn.commit()
        elapsed = time.time() - start
        if result.rowcount >= 0:
            print(f"     Done ({elapsed:.2f}s) | Rows: {result.rowcount}")
        else:
            print(f"     Done ({elapsed:.2f}s)")
    except Exception as e:
        print(f"    ERROR: {e}")
        raise e