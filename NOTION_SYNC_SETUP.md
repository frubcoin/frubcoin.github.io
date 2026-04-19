# Notion Sync Setup

The custom form in `tcgnewproduct.html` avoids Notion's post-submit email prompt by using a native HTML form.

To send submissions into Notion directly, connect a secure backend endpoint.

## What you need

1. A Notion internal integration with write access.
2. The target Notion data source ID for the releases database.
3. A deployed server-side endpoint that keeps the Notion secret off the client.

## Files in this repo

- `js/tcg-form-config.js`
  Set `submitUrl` to your deployed endpoint.
- `workers/notion-submit.example.js`
  Example edge handler that accepts the form payload and creates a page in Notion.

## Basic flow

1. Create a Notion integration and copy its API key.
2. Share the target releases database with that integration in Notion.
3. Deploy `workers/notion-submit.example.js` to your preferred edge/serverless platform.
4. Add these secrets to that platform:
   - `NOTION_API_KEY`
   - `NOTION_DATA_SOURCE_ID`
5. Set `submitUrl` in `js/tcg-form-config.js` to the deployed endpoint URL.

## Important note

The example worker assumes your Notion property names match these current form questions:

- `What product or release are you adding?`
- `Which game is it for?`
- `What type of product is it?`
- `When does it release?`
- `How important is this purchase?`
- `Where can you pre-order or view it?`
- `Anything else to remember?`

If your database property names or property types differ, update the mapping inside `workers/notion-submit.example.js`.
