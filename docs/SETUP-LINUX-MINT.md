# Linux Mint 安裝與開發（逐行操作）

以下以 bash 終端機為例。Node.js 20 以上是必要條件；nvm 可讓使用者自行管理 Node 版本，無須系統級安裝。

1. 開啟終端機（`Ctrl` + `Alt` + `T`），安裝下載工具與憑證：

   ```bash
   sudo apt update
   sudo apt install -y curl ca-certificates
   ```

2. 安裝 nvm 官方安裝腳本（執行前可先檢視該腳本內容）：

   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
   ```

3. 載入 bash 設定並確認 nvm 可用：

   ```bash
   source ~/.bashrc
   command -v nvm
   ```

   若未顯示 `nvm`，關閉再開終端機後重試。

4. 安裝並啟用 Node.js 20：

   ```bash
   nvm install 20
   nvm use 20
   nvm alias default 20
   node --version
   npm --version
   ```

5. 取得專案。已複製專案者跳至下一步；否則替換成自己的 Git URL：

   ```bash
   git clone <專案 Git URL> kawan-melayu
   cd kawan-melayu
   ```

6. 安裝依賴並啟動本機開發伺服器：

   ```bash
   npm install
   npm run dev
   ```

7. 在瀏覽器開啟終端機顯示的本機網址（通常是 `http://localhost:5173/`）。按 `Ctrl` + `C` 停止伺服器。

8. 執行完整品質檢查及正式建置：

   ```bash
   npm run lint
   npm test
   npm run validate:data
   npm run build
   ```

建置結果位於 `dist/`。AI 代理非必要；部署 AI 請另外依照 [AI 代理設定](AI-PROXY-SETUP.md)。
