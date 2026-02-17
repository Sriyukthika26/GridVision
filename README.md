# GridVision: Power Grid Analysis & Visualization

**GridVision** is a full-stack geospatial application designed to map, visualize, and analyze power grid infrastructure. It processes OpenStreetMap (OSM) data, enriches it with voltage inferences using graph topology, and visualizes it on an interactive web map using **pg_tileserv**.

## 🚀 Features

* **Interactive Map:** High-performance vector tile rendering (MapLibre GL JS).
* **Smart Filtering:** Filter by voltage (765kV - 66kV), asset type (Towers, Monopoles, Substations), and data source.
* **Topological Analysis:** Python backend infers missing voltage levels based on grid connectivity.
* **Synthetic Bridge Detection:** Automatically identifies and visualizes missing connections (Synthetic Lines).
* **Asset Details:** Clickable popups with Google Maps integration.

---

## 🛠️ Tech Stack

* **Frontend:** React.js, MapLibre GL JS
* **Database:** PostgreSQL 14+ with **PostGIS** extension
* **Data Processing:** Python (Pandas, NetworkX, SQLAlchemy)
* **Tile Server:** **pg_tileserv** (Running from `bin/` folder)

---

## ⚙️ Prerequisites

Ensure you have the following installed:

1. **Node.js** (v16+) & npm
2. **Python** (v3.8+)
3. **PostgreSQL** (v13+) with PostGIS extension enabled.

---

## 📦 Installation & Setup

### 1. Database Setup

Create a local database and enable PostGIS.

```sql
CREATE DATABASE powergrid;
\c powergrid
CREATE EXTENSION postgis;

```

*Note: If you have a `.backup` file, restore it now using `pg_restore`.*

### 2. Python Environment (Data Processing)

Navigate to the processing folder (`Backend/`).

```bash
pip install pandas geopandas sqlalchemy psycopg2 networkx

```

**Run the Enrichment Pipeline (if starting fresh):**

1. `python 02_topology.py` - Builds the graph.
2. `python 03_enrichment.py` - Infers voltages.
3. `python 04_publish.py` - **Crucial:** Updates the `v_grid_final` view for the tile server.

### 3. Tile Server Setup (The `bin` folder)

We use `pg_tileserv` to serve the map tiles. It does not require installation, just a binary file.

1. **Create a folder** named `bin` in your project's root directory.
2. **Download pg_tileserv**:
* Go to the [pg_tileserv Releases Page](https://access.crunchydata.com/documentation/pg_tileserv/1.0.11/installation/).
* Download the zip file for your OS.


3. **Extract**: Unzip the file and place the `pg_tileserv.exe` (or `pg_tileserv`) file along with `assets` folder inside your `bin` folder.
4. **Run it**:
Run `start_tileserver.bat`

* *You should see: "Listening on 0.0.0.0:7800"*

**Configuration (.env):**
Create a `.env` file in the `Backend` folder.

```ini
DB_HOST=localhost
DB_PORT=5433
DB_NAME=powergrid
DB_USER=postgres
DB_PASSWORD=powergrid2026

```

Start the backend:

```bash
cmd /c "Backend\start_tileserver.bat"

```

### 5. Frontend Setup (React)

Navigate to the `frontend` folder.

```bash
cd frontend
npm install

```

Start the application:

```bash
npm run dev

```

The app should now be running at `http://localhost:5173`.

---

## 🗺️ Visualization Logic (Color Code)

The map uses a specific color-coding standard for the Indian Power Grid:

| Voltage Level | Color | Hex Code |
| --- | --- | --- |
| **765 kV** | 🟣 Purple | `#6a0dad` |
| **400 kV** | 🔴 Red | `#b30000` |
| **220 kV** | 🟠 Orange | `#ff8c00` |
| **132 kV** | 🟢 Dark Green | `#006400` |
| **110 kV** | 🟢 Light Green | `#32CD32` |
| **66 kV** | 🔵 Blue | `#0000FF` |
| **Synthetic** | 🌸 Pink | `#ff00d4` |
| **Unknown/Low** | ⚫ Light Grey | `#999999` |

---

##  Troubleshooting

**1. Map is blank / White screen**

* **Check pg_tileserv:** Ensure the terminal running `bin/pg_tileserv` is open and says "Listening on 7800".
* **Check Port:** If `pg_tileserv` fails to start, ensure port `7800` is not used by another service.

**2. "Connection Refused" (Database)**

* Check if your `DB_PORT` is correct. Run `SELECT * FROM pg_settings WHERE name = 'port';` in psql to check your actual port.
* Ensure the password in `.env` matches **your** local database password.

**3. "Column does not exist" errors**

* You likely need to re-run `python 04_publish.py` to update the database view with the latest columns (`is_synthetic`, `voltage_src`).
