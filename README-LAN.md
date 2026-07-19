# CleanFlow AI - LAN Setup (Local Network)

## Goal
Make the app usable from other devices on your local network (LAN).

## 1) Start the backend
On the computer that hosts the app/backend:

```bash
python project/backend/app.py
```

The Flask backend listens on:
- `0.0.0.0:5000` (all network interfaces)

## 2) Start the frontend
From the project folder:

```bash
cd project
npm install
npm run dev
```

## 3) Point frontend to backend over LAN
Edit/create a `.env` file in `project/`:

```bash
VITE_API_BASE=http://<SERVER_LAN_IP>:5000/api
```

Example:
- `VITE_API_BASE=http://192.168.1.50:5000/api`

Then restart the frontend (Vite).

## 4) Windows Firewall (server PC)
Allow inbound traffic on the backend port from the server PC:
- Allow TCP **5000** to Python (`python.exe`) or to the app.

If you use a firewall UI:
- Inbound Rules -> New Rule -> Port -> TCP 5000 -> Allow

## 5) Open the app from another device
Open the Vite dev server URL from another device:
- `http://<SERVER_LAN_IP>:5173` (most common for Vite)

If your Vite port differs, use the port shown in the terminal output.

## Notes / Troubleshooting
- If other devices cannot reach the API, double-check:
  - `VITE_API_BASE` uses the server PC LAN IP (not `localhost`).
  - Firewall rule allowing TCP 5000.
  - Flask backend is running.

