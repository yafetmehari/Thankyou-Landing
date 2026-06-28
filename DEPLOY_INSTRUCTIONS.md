# Render Deployment Instructions

The deployment failed because **`dotenv`** was missing from `package.json`. 

I have resolved this by adding the dependency, creating a `.gitignore` to clean up the repository, adding a `Procfile` for Render, and committing the changes locally.

## Step 1: Push Changes to GitHub

Run this command in your local terminal to push the updates to your repository:

```bash
git push -u origin master
```
*(If your branch is named `main`, use `git push -u origin main` instead.)*

## Step 2: Configure Environment Variables on Render

Once pushed, go to your Render Dashboard, select your service, and add the following keys under **Environment**:

| Key | Example Value | Description |
|---|---|---|
| `EMAIL_SERVICE` | `gmail` | SMTP Email Service |
| `EMAIL_USER` | `your-email@gmail.com` | Your Gmail address |
| `EMAIL_PASS` | `your-app-password` | Gmail App Password (16-char code) |
| `EMAIL_TO` | `thankyoubrandbiz@gmail.com` | Destination address for form notifications |
| `CONTACT_EMAIL` | `thankyoubrandbiz@gmail.com` | Fallback settings email |

## Step 3: Trigger Deploy

If Render doesn't automatically start building after the push, click **Manual Deploy** -> **Deploy latest commit** in the Render dashboard.
