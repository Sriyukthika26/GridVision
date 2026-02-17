import subprocess
import time

PIPELINE = [
    "01_extraction.py",   # Creates initial tables from raw OSM, only needed if decided to restart.
    "02_topology.py",     # Rebuilds vertices
    "03_enrichment.py",   # Re-runs bridges/costs
    "04_publish.py"       # Updates Views
]

def main():
    print("████████ GRID SURGEON MASTER PIPELINE ████████")
    total_start = time.time()

    for script in PIPELINE:
        print(f"\n LAUNCHING: {script}")
        try:
            subprocess.run(["python", script], check=True)
        except subprocess.CalledProcessError:
            print(f"\n CRITICAL FAILURE in {script}. Pipeline halted.")
            exit(1)

    print(f"\n ALL SYSTEMS GO. Total Time: {(time.time()-total_start)/60:.1f} min ✨")

if __name__ == "__main__":
    main()