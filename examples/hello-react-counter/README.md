# hello-react-counter

Minimal React + TypeScript counter example for Taqyon.

## Project Structure

- `src/`: Frontend (React + TypeScript)
- `src-taqyon/`: Qt/C++ backend (CMake project)

## Run (frontend only)

```sh
cd examples/hello-react-counter
cd src && npm install
npm run dev
```

## Run (Qt app + dev server)

```sh
cd examples/hello-react-counter
npm install
cd src && npm install && cd ..
npm run dev
```

If you want to run them separately, keep the frontend dev server running in one terminal and start the backend in another:

```sh
# terminal A
npm run frontend:dev

# terminal B
npm run app:run:dev
```

When asked for a Qt path, point to the Qt install prefix (e.g. `~/Qt/6.10.1/macos`), not `.../lib`.
