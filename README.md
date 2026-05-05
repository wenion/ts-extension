# Chrome Extension

## Getting Started
### 1. Install dependencies

### 2. Setup Environment Variables

Create a `.env` file in the root, loads only .env by default:

```bash
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000

VERSION=1.0.0
EXTERNALLY_CONNECTABLE_MATCHES=http://127.0.0.1:3000/*
WEB_ACCESSIBLE_MATCHES=https://docs.google.com/*
HOST_PERMISSIONS=http://127.0.0.1:3000/*
PERMISSIONS=contextMenus, storage, tabs, activeTab, webNavigation, identity
OPTIONAL_PERMISSIONS=scripting
OPTIONAL_HOST_PERMISSIONS=https://*/*, http://*/*
```

## Google OAuth Setup
### Add OAuth 2.0 Client ID
[https://console.cloud.google.com/auth/clients](https://console.cloud.google.com/auth/clients)
* Application type: Chrome Extension
* Add your extension ID

### Add Test Users
[https://console.cloud.google.com/auth/audience](https://console.cloud.google.com/auth/audience)
* Add your Google account for testing

### Get Fixed Key
1. Go to `chrome://extensions/`
2. Turn on Developer mode (top right)
3. Click `Pack extension`
4. Select your extension folder
5. Leave Private key file empty (first time)
6. Click `Pack Extension`, get two files: your-extension.crx and your-extension.pem
7. Click Extract the public key, `node -e "console.log(require('fs').readFileSync('your-extension.pem').toString('base64'))"`
8. Add to `manifest.json`, 
```Json
{
  "key": "PASTE_YOUR_BASE64_STRING_HERE"
}
```
9. Reload