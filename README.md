# Tableo API Documentation

This project contains the API documentation for Tableo, built with Swagger UI and deployed on GitHub Pages.

## Overview

The documentation is automatically generated from a **Yaak** collection (synced folder) and converted to OpenAPI 3.0 specification format. The site displays interactive API documentation using Swagger UI.

## Project Structure

```
documentation-api-tableo/
├── api-tableo-collection/        # Yaak collection data (YAML files)
├── src/                          # Source files
│   ├── yaakToOpenapi.ts          # Script to convert Yaak to OpenAPI
│   └── README.md                 # Documentation for source files
├── docs/                         # Generated documentation (served by GitHub Pages)
│   ├── index.html                # Main HTML file that loads Swagger UI
│   └── openapi.yaml              # Generated OpenAPI specification
├── .github/workflows/            # GitHub Actions
│   └── deploy.yml                # Deployment workflow
├── package.json                  # Dependencies and scripts
├── bun.lock                      # Bun lockfile
├── .gitignore                    # Git ignore rules
└── README.md                     # This file
```

### Key Directories

- **`api-tableo-collection/`** - Contains the Yaak workspace data (synced folder).
- **`src/`** - Contains scripts and utilities.
- **`docs/`** - Contains generated documentation files (served by GitHub Pages)
- **`.github/workflows/`** - Contains GitHub Actions for automated deployment

## Quick Start

### Available Commands

- **`bun run build`** - Build the documentation (convert Yaak collection to OpenAPI format)
- **`bun run serve`** - Serve documentation locally (via wrangler)
- **`bun run test`** - Test the documentation setup
- **`bun run deploy`** - Deploy to GitHub Pages (manual deployment)

### Local Development

1. **Install dependencies:**
```bash
bun install
```

2. **Generate documentation:**
```bash
bun run build
```

3. **Serve locally (IMPORTANT - Don't open HTML directly!):**
```bash
# Using the serve script (recommended)
bun run serve

# Or manually with other tools
python -m http.server 8000 -d docs
npx http-server docs -p 8000
```

⚠️ **Important**: Always use a web server! Don't open `docs/index.html` directly in your browser as this will cause CORS errors.

The documentation will be available at `http://localhost:8788` (if using Wrangler) or `http://localhost:8000`.

## GitHub Pages Deployment

This project is configured for automatic deployment to GitHub Pages using GitHub Actions.

### Setup Instructions

1. **Push to GitHub**: Make sure your code is in a GitHub repository.

2. **Enable GitHub Pages**:
   - Go to your repository settings
   - Navigate to "Pages" section
   - Under "Source", select "GitHub Actions"

3. **Configure Branch Protection** (optional but recommended):
   - Go to Settings → Branches
   - Add a branch protection rule for `main`
   - Enable "Require status checks to pass before merging"

### Deployment Process

The deployment happens automatically when you:
- Push to the `main` branch
- Create a pull request to `main`

The workflow will:
1. Check out the code
2. Set up Bun runtime
3. Install dependencies
4. Build the documentation
5. Deploy to GitHub Pages

Your documentation will be available at: `https://<username>.github.io/<repository-name>`

**Note**: With the new structure, GitHub Pages will serve from the `docs/` folder, keeping your source files organized in `src/`.

## Manual Deployment

If you prefer to deploy manually:

1. Make sure your documentation is up to date:
```bash
bun run build
```

2. Commit and push your changes:
```bash
git add .
git commit -m "Update documentation"
git push origin main
```

## Updating Documentation

To update the API documentation:

1. Sync your changes in Yaak to the `api-tableo-collection` folder.
2. Build the documentation:
```bash
bun run build
```
3. Commit and push the changes - the site will automatically redeploy

### Working with Source Files

- **Yaak Collection**: The source of truth is in `api-tableo-collection/`.
- **Documentation**: Generated files go to `docs/`.
- **Serving**: The `docs/` folder is served by GitHub Pages.

## Environment URLs

The API documentation includes references to different environments:

- **Production**: `https://diary.bookia.eu/api/google-server/v3`
- **Sandbox**: (Configure in your Postman collection)

## Troubleshooting

### Common Issues

1. **"Unable to render this definition" or "does not specify a valid version field"**:
   - **Most common cause**: Opening `index.html` directly instead of using a web server
   - **Solution**: Use `bun run serve` to serve the files
   - Run `bun run test` to check if the setup is correct
   - Try clearing your browser cache and refreshing the page
   - Check browser console for any CORS or network errors

2. **OpenAPI file not found**: Make sure the `url` in `index.html` matches your OpenAPI file name

3. **Deployment fails**: Check the Actions tab in GitHub for error details

4. **Changes not reflected**: GitHub Pages may take a few minutes to update

5. **CORS errors when testing locally**:
   - **Never open `docs/index.html` directly in your browser!**
   - Always use a web server:
   ```bash
   # Easiest way - use the serve script
   bun run serve

   # Or other methods
   bun --port 8000 docs
   python -m http.server 8000 -d docs
   npx http-server docs -p 8000
   ```

### Local Testing

To test locally before deployment:

1. **Generate the documentation:**
   ```bash
   bun run build
   ```

2. **Serve the documentation:**
   ```bash
   # Using the serve script (easiest)
   bun run serve
   # Then visit http://localhost:800

   # Or using other methods
   bun --port 8000 docs
   python -m http.server 8000 -d docs
   npx http-server docs -p 8000
   ```

3. **Test and validate the setup:**
   ```bash
   # Test the entire documentation setup
   bun run test

   # Check if files are accessible
   curl http://localhost:800/openapi.yaml
   ```

4. **Debug Swagger UI issues:**
   - Open browser developer tools (F12)
   - Check Console tab for errors
   - Check Network tab to see if `openapi.yaml` loads successfully
   - Verify the OpenAPI file starts with `openapi: 3.0.0`

## Contributing

1. Fork the repository
2. Make your changes
3. Test locally
4. Submit a pull request

## License

[Add your license information here]
