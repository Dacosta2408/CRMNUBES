# GBK CRM Bridge Server

This local bridge server connects your GBK CRM web app to your office mapped **Z Drive** network storage (`Z:\Clients`), enabling highly secure document storage, indexing, and activity tracking.

---

## 🚀 Easy Step-by-Step Installation for Brokers

To set up the bridge server on your Windows machine, follow these steps:

### Step 1: Install Node.js
1. Go to [https://nodejs.org/](https://nodejs.org/) and download the **LTS (Long Term Support)** version for Windows.
2. Run the installer and click **Next** through all steps. Leave all default checkboxes selected.

### Step 2: Install Server Dependencies
1. Open the project folder on your machine.
2. Double-click or navigate into the `gbk-server` folder.
3. Hold `Shift` and right-click on empty space inside the folder, and select **Open PowerShell window here** (or **Open in Terminal**).
4. Run the following command and wait for it to finish:
   ```bash
   npm install
   ```

### Step 3: Enable Auto-Start on Windows Login
1. In the `gbk-server` folder, right-click on **`install-autostart.bat`** and choose **Run as administrator**.
2. Click **Yes** if a Windows prompt asks for permissions.
3. You will see a success box saying: *"GBK Bridge Server will now start automatically on Windows login."*

---

## 🔍 How to Verify the Server is Running

1. Open your browser and go to this link: **[http://localhost:3001/api/health](http://localhost:3001/api/health)**
2. If the server is running correctly, you will see a text reply like this:
   ```json
   {
     "status": "ok",
     "path": "Z:\\Clients"
   }
   ```

---

## 🛠️ Management Commands

Inside the `gbk-server` folder, you can run these double-click utilities on demand:
* **`start-bridge.bat`** — Starts the server manually in the background.
* **`stop-bridge.bat`** — Stops the server if you need to shut it down.
