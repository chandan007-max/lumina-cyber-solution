# LUMINA CYBER SOLUTION — RENDER DEPLOYMENT GUIDE (VIA GITHUB)

**GitHub Repository:** [https://github.com/chandan007-max/lumina-cyber-solution](https://github.com/chandan007-max/lumina-cyber-solution)  
**Branch:** `main`  
**Configuration File:** [`render.yaml`](file:///d:/Lumina%20Cyber%20solution/render.yaml)  

---

## 1. Quick Deploy via Render Blueprints (Recommended)

1. Open your browser and log into [Render Dashboard](https://dashboard.render.com).
2. Click the **New +** button in the top navigation bar and select **Blueprint**.
3. Connect your GitHub account (if not already connected) and select the repository:
   ```
   chandan007-max/lumina-cyber-solution
   ```
4. Render will automatically detect [`render.yaml`](file:///d:/Lumina%20Cyber%20solution/render.yaml) with the following specifications:
   - **Service Name:** `lumina-cyber-solution`
   - **Environment:** Node.js v22.14.0
   - **Build Command:** `npm install --include=dev --legacy-peer-deps && npm run build`
   - **Start Command:** `npm start` (runs `tsx server.ts`)
   - **Environment Variables Generated:**
     - `NODE_ENV=production`
     - `LUMINA_VAULT_MASTER_KEY` (Auto-generated cryptographic secret)
     - `LUMINA_ADMIN_KEY` (Auto-generated cryptographic secret)
     - `LUMINA_SESSION_SECRET` (Auto-generated cryptographic secret)
5. Click **Apply**.
6. Render will install dependencies, compile the Vite production bundle into `dist/`, launch the server, and assign an HTTPS URL (e.g. `https://lumina-cyber-solution.onrender.com`).

---

## 2. Manual Deploy via Render Web Service

If you prefer configuring through the Render UI:

1. In [Render Dashboard](https://dashboard.render.com), click **New +** $\to$ **Web Service**.
2. Select repository: `chandan007-max/lumina-cyber-solution`.
3. Configure the fields:
   - **Name:** `lumina-cyber-solution`
   - **Region:** `Singapore` (fastest for India / Asia) or `Frankfurt / Oregon`
   - **Branch:** `main`
   - **Root Directory:** *(leave blank)*
   - **Runtime:** `Node`
   - **Build Command:** `npm install --include=dev --legacy-peer-deps && npm run build`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`
4. Expand **Advanced $\to$ Environment Variables** and add:
   | Key | Value / Action |
   |---|---|
   | `NODE_ENV` | `production` |
   | `NODE_VERSION` | `22.14.0` |
   | `LUMINA_ADMIN_KEY` | *(Click "Generate" or enter a 32+ character random string)* |
   | `LUMINA_VAULT_MASTER_KEY` | *(Click "Generate" or enter a 32+ character random string)* |
   | `LUMINA_SESSION_SECRET` | *(Click "Generate" or enter a 32+ character random string)* |
5. Click **Deploy Web Service**.

---

## 3. Database Persistence Note
- On Render's **Free Tier**, the filesystem is ephemeral (it resets when the container restarts or spins down after inactivity).
- For permanent commercial data persistence on Render, upgrade to the **Starter Plan** ($7/month) and attach a Persistent Disk:
  - **Disk Name:** `lumina-data`
  - **Mount Path:** `/var/data`
  - **Environment Variable:** `LUMINA_DB_PATH=/var/data/lumina.sqlite`
